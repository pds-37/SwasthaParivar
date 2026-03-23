import Redis from "ioredis";
import { logger } from "./logger.js";

let redisClient;

export const getRedisClient = () => {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    redisClient = null;
    logger.warn({ route: "redis" }, "REDIS_URL missing; using in-memory rate limiting fallback");
    return redisClient;
  }

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  redisClient.on("error", (error) => {
    logger.error({
      route: "redis",
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  });

  return redisClient;
};

export const closeRedisClient = async () => {
  if (!redisClient || typeof redisClient.quit !== "function") {
    redisClient = undefined;
    return;
  }

  try {
    await redisClient.quit();
    logger.info({ route: "redis" }, "Redis connection closed");
  } catch (error) {
    logger.error({
      route: "redis",
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  } finally {
    redisClient = undefined;
  }
};
