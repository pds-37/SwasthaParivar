import { logger } from "../utils/logger.js";
import Session from "../models/Session.js";
import ThreatScore from "../models/ThreatScore.js";
import SecurityEvent from "../models/SecurityEvent.js";
import PromptLog from "../models/PromptLog.js";
import Report from "../models/reportmodel.js";
import User from "../models/user.js";
import AuditLog from "../models/AuditLog.js";
import SystemState from "../models/SystemState.js";
import securityConfig from "../config/security.config.js";
import aiPolicyConfig from "../config/aiPolicy.config.js";
import promptNormalizationService from "./ai/PromptNormalizationService.js";
import { createSecurityEmitter } from "./security/SecurityEmitter.js";

// Import Service Factories
import { createAuditLoggerService } from "./audit/AuditLoggerService.js";
import { createDataPrivacyService } from "./audit/DataPrivacyService.js";
import { createAiOutputSafetyLayer } from "./ai/AiOutputSafetyLayer.js";
import { createContextSanitizer } from "./ai/ContextSanitizer.js";
import { createPromptRiskEngine } from "./ai/PromptRiskEngine.js";
import { createThreatScoreService } from "./security/ThreatScoreService.js";

// Instantiate Services with injected dependencies
export const auditLoggerService = createAuditLoggerService({
  AuditLogModel: AuditLog,
  SystemStateModel: SystemState,
  loggerInstance: logger
});

export const dataPrivacyService = createDataPrivacyService({
  SessionModel: Session,
  ThreatScoreModel: ThreatScore,
  SecurityEventModel: SecurityEvent,
  PromptLogModel: PromptLog,
  ReportModel: Report,
  UserModel: User,
  auditLoggerServiceInstance: auditLoggerService,
  loggerInstance: logger
});

export const aiOutputSafetyLayer = createAiOutputSafetyLayer();

export const contextSanitizer = createContextSanitizer();

export const threatScoreService = createThreatScoreService({
  ThreatScoreModel: ThreatScore,
  SessionModel: Session,
  securityConfig,
  loggerInstance: logger
});

export const securityEmitter = createSecurityEmitter({
  threatScoreServiceInstance: threatScoreService,
  SecurityEventModel: SecurityEvent,
  loggerInstance: logger
});

export const promptRiskEngine = createPromptRiskEngine({
  aiPolicyConfig,
  promptNormalizationService,
  PromptLogModel: PromptLog,
  securityEmitter
});

// A central registry for legacy modules to import from until they are also refactored
export default {
  auditLoggerService,
  dataPrivacyService,
  aiOutputSafetyLayer,
  contextSanitizer,
  promptRiskEngine,
  threatScoreService
};
