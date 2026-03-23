import { randomUUID } from "node:crypto";
import pino from "pino";

const maskUserId = (value) => {
  if (!value) return null;
  const text = String(value);
  if (text.length <= 6) return "***";
  return `${text.slice(0, 3)}***${text.slice(-2)}`;
};

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  base: null,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers.set-cookie",
      "error.config.headers.Authorization",
    ],
    censor: "[Redacted]",
  },
});

export const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const requestId = req.headers["x-request-id"] || randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info({
      requestId,
      userId: maskUserId(req.userId || req.user?._id),
      route: req.originalUrl,
      method: req.method,
      duration: Number(duration.toFixed(2)),
      statusCode: res.statusCode,
    });
  });

  next();
};

export const logError = (error, req, extra = {}) => {
  logger.error({
    requestId: req?.requestId || null,
    userId: maskUserId(req?.userId || req?.user?._id),
    route: req?.originalUrl || null,
    method: req?.method || null,
    statusCode: extra.statusCode || 500,
    error: {
      message: error?.message || "Unknown error",
      stack: error?.stack || null,
      ...extra.error,
    },
    ...extra.context,
  });
};

