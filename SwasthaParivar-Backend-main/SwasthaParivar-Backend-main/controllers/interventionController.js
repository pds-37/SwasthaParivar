import Intervention from "../models/Intervention.js";
import HealthState from "../models/HealthState.js";
import interventionEngine from "../services/interventions/interventionEngine.js";
import closedLoopFeedbackService from "../services/interventions/closedLoopFeedbackService.js";
import capacityDeficitService from "../services/capacity/capacityDeficitService.js";
import { auditLoggerService } from "../services/diContainer.js";
import { getUserRoles, isScopeAuthorized, resolveScopedQuery } from "../config/roles.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { logger } from "../utils/logger.js";

export const listInterventions = async (req, res) => {
  try {
    const { state, district, pincode, status, targetLevel } = req.query;
    const scopeCheck = resolveScopedQuery(req.user, { state, district, pincode });

    if (!scopeCheck.authorized) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "Interventions query is outside your assigned jurisdiction.",
      });
    }

    const filter = {};
    if (scopeCheck.state) filter["targetScope.state"] = scopeCheck.state;
    if (scopeCheck.district) filter["targetScope.district"] = scopeCheck.district;
    if (scopeCheck.pincode) filter["targetScope.pincode"] = scopeCheck.pincode;
    if (status) filter.status = status;
    if (targetLevel) filter.targetLevel = targetLevel;

    const roles = getUserRoles(req.user);
    if (roles.every((r) => r === "asha_worker")) {
      filter.assignedRoles = "asha_worker";
    }

    const interventions = await Intervention.find(filter)
      .populate("healthStateId")
      .sort({ dispatchedAt: -1 })
      .limit(50)
      .lean();

    const safeInterventions = interventions.map((inv) => {
      if (
        inv.healthStateId &&
        typeof inv.healthStateId === "object" &&
        (inv.healthStateId.level === "individual" || inv.healthStateId.level === "household")
      ) {
        return {
          ...inv,
          healthStateId: {
            ...inv.healthStateId,
            nodeId: "REDACTED_HOUSEHOLD_NODE",
          },
        };
      }
      return inv;
    });

    return sendSuccess(res, { data: safeInterventions });
  } catch (error) {
    logger.error({ err: error.message }, "Could not load interventions");
    return sendError(res, {
      status: 500,
      code: "INTERVENTION_LIST_FAILED",
      message: "Could not load interventions",
    });
  }
};

export const dispatchIntervention = async (req, res) => {
  try {
    const { healthStateId } = req.body;
    const healthState = await HealthState.findById(healthStateId);
    if (!healthState) {
      return sendError(res, { status: 404, code: "NOT_FOUND", message: "HealthState not found" });
    }

    if (!isScopeAuthorized(req.user, healthState.spatialScope || {})) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "Intervention dispatch is outside your assigned jurisdiction.",
      });
    }

    const capacityState = await capacityDeficitService.getOrInitializeCapacityState({
      state: healthState.spatialScope?.state || "Uttar Pradesh",
      district: healthState.spatialScope?.district || "Gautam Buddha Nagar",
      pincode: healthState.spatialScope?.pincode || "201306",
    });

    const intervention = await interventionEngine.dispatchInterventionForState(healthState, capacityState);

    await auditLoggerService.logAction({
      action: "INTERVENTION_DISPATCH",
      resourceType: "Intervention",
      resourceId: intervention._id,
      actorId: req.userId,
      ipAddress: req.ip,
      metadata: {
        healthStateId,
        interventionType: intervention.interventionType,
        priority: intervention.priority,
        district: healthState.spatialScope?.district,
      },
    });

    return sendSuccess(res, { data: intervention }, 201);
  } catch (error) {
    logger.error({ err: error.message }, "Failed to dispatch intervention");
    return sendError(res, {
      status: 400,
      code: "INTERVENTION_DISPATCH_FAILED",
      message: "Failed to dispatch intervention",
    });
  }
};

export const submitPostInterventionFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { observedSeverity, notes } = req.body;

    const existingIntervention = await Intervention.findById(id).lean();
    if (!existingIntervention) {
      return sendError(res, { status: 404, code: "NOT_FOUND", message: "Intervention not found" });
    }

    if (!isScopeAuthorized(req.user, existingIntervention.targetScope || {})) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "Feedback submission is outside your assigned jurisdiction.",
      });
    }

    const result = await closedLoopFeedbackService.evaluateInterventionFeedback(id, {
      observedSeverity,
      notes,
    });

    await auditLoggerService.logAction({
      action: "INTERVENTION_FEEDBACK",
      resourceType: "Intervention",
      resourceId: id,
      actorId: req.userId,
      ipAddress: req.ip,
      metadata: {
        outcome: result.feedback.outcome,
        responseScore: result.feedback.responseScore,
        actionTaken: result.feedback.actionTaken,
      },
    });

    return sendSuccess(res, {
      data: {
        ...result,
        message: `Feedback processed: Outcome is ${result.feedback.outcome}, state updated to ${result.feedback.actionTaken}`,
      },
    });
  } catch (error) {
    logger.error({ err: error.message }, "Feedback evaluation failed");
    return sendError(res, {
      status: 400,
      code: "INTERVENTION_FEEDBACK_FAILED",
      message: "Feedback evaluation failed",
    });
  }
};
