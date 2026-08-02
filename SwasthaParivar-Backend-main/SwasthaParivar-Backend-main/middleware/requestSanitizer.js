import mongoSanitize from "express-mongo-sanitize";
import { securityEmitter } from "../services/diContainer.js";
import securityConfig from "../config/security.config.js";

// We wrap it to emit security events when a NoSQL injection payload is found
const sanitizerMiddleware = mongoSanitize({
  onSanitize: ({ req, key }) => {
    securityEmitter.emitEvent({
      userId: req.userId || null, // Might be anonymous since it happens before auth
      ipAddress: req.ip,
      eventType: "NOSQL_INJECTION_ATTEMPT",
      severity: "high",
      scoreDelta: securityConfig.threatThresholds.nosqlInjection,
      metadata: { route: req.originalUrl, badKey: key }
    });
  },
});

export default sanitizerMiddleware;
