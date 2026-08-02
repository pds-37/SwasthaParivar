import { EventEmitter } from "node:events";
import { logger } from "../../utils/logger.js";
import SecurityEvent from "../../models/SecurityEvent.js";
export function createSecurityEmitter({ threatScoreServiceInstance, SecurityEventModel, loggerInstance }) {
  const emitter = new EventEmitter();

  const handleSecurityEvent = async (payload) => {
    try {
      const { userId, ipAddress, eventType, severity, scoreDelta, metadata } = payload;
      
      // 1. Log to database asynchronously
      await SecurityEventModel.create({
        userId,
        ipAddress,
        eventType,
        severity,
        scoreDelta,
        metadata
      });

      // 2. Increment Threat Score if applicable
      if (scoreDelta > 0 && userId) {
        await threatScoreServiceInstance.applyScoreDelta(userId, scoreDelta, eventType);
      }

    } catch (error) {
      loggerInstance.error({
        route: "security_emitter",
        error: {
          message: error?.message || "Failed to process security event",
          stack: error?.stack || null
        },
        payload
      });
    }
  };

  emitter.on("security_event", handleSecurityEvent);

  return {
    emitEvent({ userId, ipAddress, eventType, severity, scoreDelta, metadata }) {
      emitter.emit("security_event", { userId, ipAddress, eventType, severity, scoreDelta, metadata });
    }
  };
}
