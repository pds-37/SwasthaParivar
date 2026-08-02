import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { sendError } from "../utils/apiResponse.js";
import { getRedisClient } from "../utils/redis.js";
import securityConfig from "../config/security.config.js";
import { securityEmitter } from "../services/diContainer.js";

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

class FlexibleRateLimiter {
  constructor({ keyPrefix, points, duration, keyGenerator, messageBuilder }) {
    const redisClient = getRedisClient();

    this.limiter = redisClient
      ? new RateLimiterRedis({
          storeClient: redisClient,
          keyPrefix,
          points,
          duration,
        })
      : new RateLimiterMemory({
          keyPrefix,
          points,
          duration,
        });

    this.duration = duration;
    this.keyGenerator = keyGenerator || ((req) => req.ip || "anonymous");
    this.messageBuilder = messageBuilder;
  }

  middleware() {
    return async (req, res, next) => {
      try {
        await this.limiter.consume(this.keyGenerator(req));
        return next();
      } catch (error) {
        const retryAfterSeconds = Math.ceil((error?.msBeforeNext || this.duration * 1000) / 1000);

        securityEmitter.emitEvent({
          userId: req.userId || null,
          ipAddress: req.ip,
          eventType: "RATE_LIMIT_BREACH",
          severity: "medium",
          scoreDelta: securityConfig.threatThresholds.rateLimitBreach,
          metadata: { route: req.originalUrl, keyPrefix: this.limiter.keyPrefix }
        });

        res.setHeader("Retry-After", retryAfterSeconds);
        return sendError(res, {
          status: 429,
          code: "RATE_LIMITED",
          message:
            this.messageBuilder?.(retryAfterSeconds) ||
            `Too many requests. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
          details: { retryAfterSeconds },
        });
      }
    };
  }
}

export const apiRateLimiter = new FlexibleRateLimiter({
  keyPrefix: "api",
  duration: securityConfig.rateLimits.api.duration,
  points: securityConfig.rateLimits.api.points,
  keyGenerator: (req) => req.userId || req.ip || "anonymous",
});

export const authRateLimiter = new FlexibleRateLimiter({
  keyPrefix: "auth",
  duration: securityConfig.rateLimits.auth.duration,
  points: securityConfig.rateLimits.auth.points,
  keyGenerator: (req) => `${req.ip}:${normalizeEmail(req.body?.email) || "anonymous"}`,
});

export const googleAuthRateLimiter = new FlexibleRateLimiter({
  keyPrefix: "auth-google",
  duration: securityConfig.rateLimits.authGoogle.duration,
  points: securityConfig.rateLimits.authGoogle.points,
  keyGenerator: (req) => req.ip || "anonymous",
  messageBuilder: (retryAfterSeconds) =>
    `Too many Google sign-in attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
});

export const aiRateLimiter = new FlexibleRateLimiter({
  keyPrefix: "ai",
  duration: securityConfig.rateLimits.ai.duration,
  points: securityConfig.rateLimits.ai.points,
  keyGenerator: (req) => `${req.userId || "guest"}:${req.ip}`,
});

export const uploadRateLimiter = new FlexibleRateLimiter({
  keyPrefix: "upload",
  duration: securityConfig.rateLimits.upload.duration,
  points: securityConfig.rateLimits.upload.points,
  keyGenerator: (req) => `${req.userId || "guest"}:${req.ip}`,
});

export default FlexibleRateLimiter;
