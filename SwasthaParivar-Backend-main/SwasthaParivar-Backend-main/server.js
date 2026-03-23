import dotenv from "dotenv";
dotenv.config();

import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import "express-async-errors";

import appConfig from "./config/AppConfig.js";
import { closeDB, connectDB } from "./utils/db.js";
import { closeRedisClient } from "./utils/redis.js";
import authRouter from "./routes/authroute.js";
import membersRouter from "./routes/members.js";
import healthRouter from "./routes/health.js";
import aiRoutes from "./routes/aiRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import aiMemoryRoutes from "./routes/aiMemoryRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import remedyRoutes from "./routes/remedyRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import symptomRoutes from "./routes/symptomRoutes.js";
import auth from "./middleware/auth.js";
import requestSanitizer from "./middleware/requestSanitizer.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { sendError, sendSuccess } from "./utils/apiResponse.js";
import { logError, logger, requestLogger } from "./utils/logger.js";
import { captureServerError, flushSentry, initSentry } from "./utils/sentry.js";
import "./utils/reminderCron.js";

const app = express();
let server;
let isShuttingDown = false;
let activeRequests = 0;

const isLocalDevOrigin = (origin) =>
  !appConfig.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin || "");

initSentry(appConfig);

process.on("unhandledRejection", (reason) => {
  captureServerError(reason, { source: "process.unhandledRejection" });
  logger.error({
    route: "process",
    error: {
      message: reason?.message || String(reason),
      stack: reason?.stack || null,
    },
    source: "process.unhandledRejection",
  });
});

process.on("uncaughtException", async (error) => {
  captureServerError(error, { source: "process.uncaughtException" });
  logger.error({
    route: "process",
    error: {
      message: error?.message || "Uncaught exception",
      stack: error?.stack || null,
    },
    source: "process.uncaughtException",
  });

  await shutdown("uncaughtException");
});

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(requestLogger);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || appConfig.corsOrigins.includes(origin) || isLocalDevOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use(requestSanitizer);
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.setHeader("Connection", "close");
    return sendError(res, {
      status: 503,
      code: "SERVER_SHUTTING_DOWN",
      message: "Server is restarting. Please try again in a moment.",
    });
  }

  activeRequests += 1;
  res.on("finish", () => {
    activeRequests = Math.max(0, activeRequests - 1);
  });
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: Number(process.uptime().toFixed(2)),
    version: appConfig.appVersion,
    environment: appConfig.nodeEnv,
    activeRequests,
  });
});

app.use("/api/auth", authRouter);
app.use("/api/ai", auth, apiRateLimiter.middleware(), aiRoutes);
app.use("/api/reminders", auth, apiRateLimiter.middleware(), reminderRoutes);
app.use("/api/members", auth, apiRateLimiter.middleware(), membersRouter);
app.use("/api/health", auth, apiRateLimiter.middleware(), healthRouter);
app.use("/api/remedies", auth, apiRateLimiter.middleware(), remedyRoutes);
app.use("/api/reports", auth, apiRateLimiter.middleware(), reportRoutes);
app.use("/api/symptoms", auth, apiRateLimiter.middleware(), symptomRoutes);
app.use("/api/ai/memory", auth, apiRateLimiter.middleware(), aiMemoryRoutes);
app.use("/api", auth, apiRateLimiter.middleware(), notificationRoutes);

app.get("/", (req, res) => {
  return sendSuccess(res, {
    data: {
      message: "SwasthaParivar API Running",
    },
  });
});

app.use((req, res) => {
  return sendError(res, {
    status: 404,
    code: "ROUTE_NOT_FOUND",
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  if (err?.message === "Not allowed by CORS") {
    return sendError(res, {
      status: 403,
      code: "CORS_NOT_ALLOWED",
      message: "This frontend origin is not allowed to access the API",
    });
  }

  if (err?.code === "LIMIT_FILE_SIZE") {
    return sendError(res, {
      status: 413,
      code: "FILE_TOO_LARGE",
      message: "File size must be 10MB or less",
    });
  }

  captureServerError(err, {
    requestId: req?.requestId,
    route: req?.originalUrl,
    statusCode: 500,
  });
  logError(err, req, { statusCode: 500 });
  return sendError(res, {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "Internal server error",
  });
});

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ route: "shutdown", signal, activeRequests }, "Starting graceful shutdown");

  const forceTimeout = setTimeout(() => {
    logger.error({ route: "shutdown", signal }, "Forced shutdown timeout reached");
    process.exit(1);
  }, 15000);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    await Promise.allSettled([closeDB(), closeRedisClient(), flushSentry(2000)]);
    clearTimeout(forceTimeout);
    logger.info({ route: "shutdown", signal }, "Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    clearTimeout(forceTimeout);
    captureServerError(error, { source: "shutdown", signal });
    logger.error({
      route: "shutdown",
      signal,
      error: {
        message: error?.message || "Shutdown failed",
        stack: error?.stack || null,
      },
    });
    process.exit(1);
  }
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

(async () => {
  try {
    await connectDB(appConfig.mongoUri);

    server = app.listen(appConfig.port, () => {
      logger.info({ route: "startup", port: appConfig.port }, "Backend running");
      logger.info({ route: "startup" }, "Reminder cron is active");
    });
  } catch (err) {
    captureServerError(err, { source: "startup" });
    logger.error({
      route: "startup",
      error: {
        message: err?.message || "Fatal startup error",
        stack: err?.stack || null,
      },
    });
    process.exit(1);
  }
})();
