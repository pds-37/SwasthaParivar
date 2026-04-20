import mongoose from "mongoose";
import { logger } from "./logger.js";

export async function connectDB(uri) {
  if (!uri) {
    throw new Error("MONGO_URI not provided");
  }

  try {
    mongoose.set("sanitizeFilter", false);
    mongoose.set("strictQuery", true);

    await mongoose.connect(uri, {
      family: 4,
      serverSelectionTimeoutMS: 10000,
    });

    logger.info({ route: "database" }, "MongoDB connected");
  } catch (err) {
    logger.error({
      route: "database",
      error: {
        message: err.message,
        stack: err.stack,
      },
    });
    throw err;
  }
}

export async function closeDB() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close();
  logger.info({ route: "database" }, "MongoDB disconnected");
}
