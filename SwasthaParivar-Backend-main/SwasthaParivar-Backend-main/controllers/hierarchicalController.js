import HealthState from "../models/HealthState.js";
import CapacityState from "../models/CapacityState.js";
import Intervention from "../models/Intervention.js";
import HealthcareFacility from "../models/HealthcareFacility.js";
import healthStateTransformer from "../services/hierarchical/healthStateTransformer.js";
import evidenceConvergenceEngine from "../services/hierarchical/evidenceConvergenceEngine.js";
import capacityDeficitService from "../services/capacity/capacityDeficitService.js";
import stateTransitionEngine from "../services/hierarchical/stateTransitionEngine.js";
import { auditLoggerService } from "../services/diContainer.js";
import {
  getUserRoles,
  isScopeAuthorized,
  normalizeGeoToken,
  resolveScopedQuery,
} from "../config/roles.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { logger } from "../utils/logger.js";

const ASHA_ALLOWED_SOURCE_TYPES = new Set(["household", "asha_worker"]);
const LEVEL_CAP_FOR_ASHA = new Set(["individual", "household", "community"]);

/**
 * Strip direct household/individual identifiers from HealthState records returned to
 * public-health dashboards while preserving cluster/operational attributes.
 */
function sanitizeHealthStateForPublicView(state) {
  if (!state) return state;
  const plain = typeof state.toObject === "function" ? state.toObject() : { ...state };
  const isPersonalTier = plain.level === "individual" || plain.level === "household";

  return {
    ...plain,
    nodeId: isPersonalTier ? "REDACTED_HOUSEHOLD_NODE" : plain.nodeId,
    metadata: isPersonalTier ? { redacted: true, provenance: plain.metadata?.provenance || "aggregated" } : plain.metadata,
  };
}

export const listHealthStates = async (req, res) => {
  try {
    const { level, category, pincode, district, state, stateStatus } = req.query;
    const scopeCheck = resolveScopedQuery(req.user, { state, district, pincode });
    if (!scopeCheck.authorized) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "Requested geographic scope is outside your assigned jurisdiction.",
      });
    }

    const filter = {};
    if (level) filter.level = level;
    if (category) filter.category = category;
    if (stateStatus) filter.stateStatus = stateStatus;
    if (scopeCheck.state) filter["spatialScope.state"] = scopeCheck.state;
    if (scopeCheck.district) filter["spatialScope.district"] = scopeCheck.district;
    if (scopeCheck.pincode) filter["spatialScope.pincode"] = scopeCheck.pincode;

    const states = await HealthState.find(filter)
      .populate("activeInterventionId")
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    return sendSuccess(res, { data: states.map(sanitizeHealthStateForPublicView) });
  } catch (error) {
    logger.error({ err: error.message }, "Failed to list HealthStates");
    return sendError(res, {
      status: 500,
      code: "HEALTH_STATE_LIST_FAILED",
      message: "Could not fetch health states",
    });
  }
};

export const getHealthStateById = async (req, res) => {
  try {
    const state = await HealthState.findById(req.params.id)
      .populate("activeInterventionId")
      .lean();

    if (!state) {
      return sendError(res, { status: 404, code: "NOT_FOUND", message: "HealthState not found" });
    }

    if (!isScopeAuthorized(req.user, state.spatialScope || {})) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "You are not authorized to access records in this jurisdiction.",
      });
    }

    return sendSuccess(res, { data: sanitizeHealthStateForPublicView(state) });
  } catch (error) {
    logger.error({ err: error.message }, "Failed to load HealthState");
    return sendError(res, {
      status: 500,
      code: "HEALTH_STATE_FETCH_FAILED",
      message: "Could not load health state",
    });
  }
};

export const transformRawSignal = async (req, res) => {
  try {
    const { level = "household", nodeId, metrics, symptoms, source, spatialScope = {}, metadata } = req.body;
    const roles = getUserRoles(req.user);

    const targetScope = {
      state: spatialScope.state || req.user?.assignedScope?.state || "Uttar Pradesh",
      district: spatialScope.district || req.user?.assignedScope?.district,
      pincode: spatialScope.pincode || req.user?.assignedScope?.pincode,
      ward: spatialScope.ward || "",
    };

    if (!isScopeAuthorized(req.user, targetScope)) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "Signal transformation is outside your assigned jurisdiction.",
      });
    }

    if (roles.every((r) => r === "asha_worker" || r === "user") && !LEVEL_CAP_FOR_ASHA.has(level)) {
      return sendError(res, {
        status: 403,
        code: "FORBIDDEN",
        message: "ASHA role cannot generate health states above community tier.",
      });
    }

    const healthState = await healthStateTransformer.transformSignalToHealthState({
      level,
      nodeId: nodeId || String(req.userId),
      metrics: metrics || {},
      symptoms: symptoms || [],
      source: source || "household",
      spatialScope: targetScope,
      metadata: { sourceOrigin: metadata?.sourceOrigin || "api_transform" },
    });

    await auditLoggerService.logAction({
      action: "SIGNAL_TRANSFORM",
      resourceType: "HealthState",
      resourceId: healthState._id,
      actorId: req.userId,
      ipAddress: req.ip,
      metadata: { level: healthState.level, district: targetScope.district, pincode: targetScope.pincode },
    });

    return sendSuccess(res, { data: sanitizeHealthStateForPublicView(healthState) }, 201);
  } catch (error) {
    logger.error({ err: error.message }, "Failed to transform signal");
    return sendError(res, {
      status: 400,
      code: "SIGNAL_TRANSFORM_FAILED",
      message: "Failed to transform health signal",
    });
  }
};

export const ingestMultiSourceEvidence = async (req, res) => {
  try {
    const { sourceType, sourceIdentifier, spatialScope = {}, signalType, category, payload, confidenceWeight } = req.body;

    if (!sourceType || !sourceIdentifier) {
      return sendError(res, {
        status: 400,
        code: "VALIDATION_ERROR",
        message: "sourceType and sourceIdentifier are required",
      });
    }

    const roles = getUserRoles(req.user);
    if (roles.every((r) => r === "asha_worker" || r === "user") && !ASHA_ALLOWED_SOURCE_TYPES.has(sourceType)) {
      return sendError(res, {
        status: 403,
        code: "FORBIDDEN",
        message: "Your role is not authorized to ingest this clinical evidence source type.",
      });
    }

    const targetScope = {
      state: spatialScope.state || req.user?.assignedScope?.state || "Uttar Pradesh",
      district: spatialScope.district || req.user?.assignedScope?.district,
      pincode: spatialScope.pincode || req.user?.assignedScope?.pincode,
      ward: spatialScope.ward || "",
    };

    if (!isScopeAuthorized(req.user, targetScope)) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "Evidence ingestion is outside your assigned jurisdiction.",
      });
    }

    const signal = await evidenceConvergenceEngine.ingestEvidenceSignal({
      sourceType,
      sourceIdentifier,
      spatialScope: targetScope,
      signalType: signalType || "SYMPTOM_REPORT",
      category,
      payload,
      confidenceWeight,
    });

    await auditLoggerService.logAction({
      action: "EVIDENCE_INGEST",
      resourceType: "EvidenceSignal",
      resourceId: signal._id,
      actorId: req.userId,
      ipAddress: req.ip,
      metadata: { sourceType, district: targetScope.district, pincode: targetScope.pincode },
    });

    return sendSuccess(res, { data: signal }, 201);
  } catch (error) {
    logger.error({ err: error.message }, "Failed to ingest evidence signal");
    return sendError(res, {
      status: 400,
      code: "EVIDENCE_INGEST_FAILED",
      message: "Failed to ingest evidence signal",
    });
  }
};

export const evaluateConvergence = async (req, res) => {
  try {
    const scopeCheck = resolveScopedQuery(req.user, {
      state: req.body?.state,
      district: req.body?.district,
      pincode: req.body?.pincode,
    });

    if (!scopeCheck.authorized) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "Convergence evaluation is outside your assigned jurisdiction.",
      });
    }

    const state = scopeCheck.state || req.user?.assignedScope?.state || "Uttar Pradesh";
    const district = scopeCheck.district || req.user?.assignedScope?.district;
    const pincode = scopeCheck.pincode || req.body?.pincode || req.user?.assignedScope?.pincode;
    const windowHours = Number(req.body?.windowHours || 72);

    const result = await evidenceConvergenceEngine.evaluateCommunityConvergence({
      state,
      pincode,
      district,
      windowHours,
    });

    await auditLoggerService.logAction({
      action: "CONVERGENCE_EVALUATE",
      resourceType: "HealthState",
      resourceId: pincode || district || "scope",
      actorId: req.userId,
      ipAddress: req.ip,
      metadata: { state, district, pincode, windowHours },
    });

    return sendSuccess(res, { data: result });
  } catch (error) {
    logger.error({ err: error.message }, "Convergence evaluation failed");
    return sendError(res, {
      status: 500,
      code: "CONVERGENCE_FAILED",
      message: "Convergence evaluation failed",
    });
  }
};

export const triggerStateTransition = async (req, res) => {
  try {
    const { healthStateId } = req.params;
    const existing = await HealthState.findById(healthStateId).lean();

    if (!existing) {
      return sendError(res, { status: 404, code: "NOT_FOUND", message: "HealthState not found" });
    }

    if (!isScopeAuthorized(req.user, existing.spatialScope || {})) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "State transition is outside your assigned jurisdiction.",
      });
    }

    const outcome = await stateTransitionEngine.processHealthStateTransition(healthStateId);

    await auditLoggerService.logAction({
      action: "STATE_TRANSITION",
      resourceType: "HealthState",
      resourceId: healthStateId,
      actorId: req.userId,
      ipAddress: req.ip,
      metadata: {
        transition: outcome.decision?.transition,
        targetLevel: outcome.decision?.targetLevel,
        district: existing.spatialScope?.district,
      },
    });

    return sendSuccess(res, {
      data: {
        ...outcome,
        healthState: sanitizeHealthStateForPublicView(outcome.healthState),
      },
    });
  } catch (error) {
    logger.error({ err: error.message }, "State transition failed");
    return sendError(res, {
      status: 400,
      code: "STATE_TRANSITION_FAILED",
      message: "State transition failed",
    });
  }
};

export const getDistrictOverview = async (req, res) => {
  try {
    const scopeCheck = resolveScopedQuery(req.user, {
      state: req.query.state,
      district: req.query.district,
      pincode: req.query.pincode,
    });

    if (!scopeCheck.authorized) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "District overview is outside your assigned jurisdiction.",
      });
    }

    const district = scopeCheck.district || req.query.district || req.user?.assignedScope?.district || "Gautam Buddha Nagar";
    const pincode = scopeCheck.pincode || req.query.pincode || req.user?.assignedScope?.pincode || "201306";
    const state = scopeCheck.state || req.user?.assignedScope?.state || "Uttar Pradesh";

    const [healthStates, capacity, activeInterventions, facilities] = await Promise.all([
      HealthState.find({ "spatialScope.district": district, stateStatus: { $ne: "RESOLVED" } })
        .sort({ severityScore: -1 })
        .limit(50)
        .lean(),
      capacityDeficitService.getOrInitializeCapacityState({ state, district, pincode }),
      Intervention.find({ "targetScope.district": district, status: { $in: ["DISPATCHED", "IN_PROGRESS"] } })
        .sort({ dispatchedAt: -1 })
        .limit(20)
        .lean(),
      HealthcareFacility.find({ district }).lean(),
    ]);

    const safeStates = healthStates.map(sanitizeHealthStateForPublicView);
    const totalActiveClusters = safeStates.filter((s) => s.level !== "individual" && s.level !== "household").length;
    const criticalSurgeCount = safeStates.filter((s) => s.severity === "CRITICAL" || s.severityScore >= 0.75).length;

    const categoryBreakdown = {};
    for (const st of safeStates) {
      categoryBreakdown[st.category] = (categoryBreakdown[st.category] || 0) + 1;
    }

    return sendSuccess(res, {
      data: {
        state,
        district,
        pincode,
        metrics: {
          totalActiveClusters,
          criticalSurgeCount,
          capacityDeficitIndex: capacity.capacityDeficitIndex,
          effectiveCapacityScore: capacity.effectiveCapacityScore,
          availableBeds: capacity.availableBeds,
          totalBeds: capacity.totalBeds,
          icuAvailable: capacity.icuBedsAvailable,
          doctorsOnDuty: capacity.doctorsOnDuty,
          ambulancesAvailable: capacity.ambulancesAvailable,
          medicineStockIndex: capacity.criticalMedicineStockIndex,
        },
        categoryBreakdown,
        healthStates: safeStates,
        capacityState: capacity,
        activeInterventions,
        facilities,
      },
    });
  } catch (error) {
    logger.error({ err: error.message }, "Could not compile district overview");
    return sendError(res, {
      status: 500,
      code: "DISTRICT_OVERVIEW_FAILED",
      message: "Could not compile district overview",
    });
  }
};

export const getStateOverview = async (req, res) => {
  try {
    const scopeCheck = resolveScopedQuery(req.user, {
      state: req.query.state,
    });

    if (!scopeCheck.authorized) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "State overview is outside your assigned jurisdiction.",
      });
    }

    const state = scopeCheck.state || req.query.state || req.user?.assignedScope?.state || "Uttar Pradesh";

    const [states, capacities, interventions] = await Promise.all([
      HealthState.find({
        "spatialScope.state": state,
        level: { $in: ["community", "facility", "district", "state"] },
        stateStatus: { $ne: "RESOLVED" },
      })
        .sort({ severityScore: -1 })
        .limit(100)
        .lean(),
      CapacityState.find({ state }).sort({ recordedAt: -1 }).limit(50).lean(),
      Intervention.find({ status: { $in: ["DISPATCHED", "IN_PROGRESS"] } })
        .sort({ dispatchedAt: -1 })
        .limit(30)
        .lean(),
    ]);

    const districtSummary = {};
    for (const hs of states) {
      const dist = hs.spatialScope?.district || "Unknown";
      if (!districtSummary[dist]) {
        districtSummary[dist] = { activeClusters: 0, criticalCount: 0, maxSeverity: 0 };
      }
      districtSummary[dist].activeClusters += 1;
      if (hs.severity === "CRITICAL" || hs.severityScore >= 0.75) {
        districtSummary[dist].criticalCount += 1;
      }
      districtSummary[dist].maxSeverity = Math.max(districtSummary[dist].maxSeverity, hs.severityScore || 0);
    }

    const filteredInterventions = interventions.filter(
      (inv) => !inv.targetScope?.state || normalizeGeoToken(inv.targetScope.state) === normalizeGeoToken(state)
    );

    return sendSuccess(res, {
      data: {
        state,
        totalActiveClusters: states.length,
        districtSummary,
        capacities,
        activeInterventions: filteredInterventions,
      },
    });
  } catch (error) {
    logger.error({ err: error.message }, "Could not compile state overview");
    return sendError(res, {
      status: 500,
      code: "STATE_OVERVIEW_FAILED",
      message: "Could not compile state overview",
    });
  }
};

export const getAshaTasks = async (req, res) => {
  try {
    const scopeCheck = resolveScopedQuery(req.user, {
      state: req.query.state,
      district: req.query.district,
      pincode: req.query.pincode,
    });

    if (!scopeCheck.authorized) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "Requested pincode is outside your assigned jurisdiction.",
      });
    }

    const pincode = scopeCheck.pincode || req.query.pincode || req.user?.assignedScope?.pincode || "201306";

    const filter = {
      "targetScope.pincode": pincode,
      assignedRoles: "asha_worker",
      status: { $in: ["DISPATCHED", "IN_PROGRESS"] },
    };
    if (scopeCheck.district) {
      filter["targetScope.district"] = scopeCheck.district;
    }

    const tasks = await Intervention.find(filter)
      .sort({ priority: 1, dispatchedAt: -1 })
      .lean();

    return sendSuccess(res, { data: tasks });
  } catch (error) {
    logger.error({ err: error.message }, "Could not load ASHA tasks");
    return sendError(res, {
      status: 500,
      code: "ASHA_TASKS_FAILED",
      message: "Could not load ASHA tasks",
    });
  }
};

export const submitAshaSurvey = async (req, res) => {
  try {
    const scopeCheck = resolveScopedQuery(req.user, {
      state: req.body.state,
      district: req.body.district,
      pincode: req.body.pincode,
    });

    if (!scopeCheck.authorized) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "Survey submission is outside your assigned jurisdiction.",
      });
    }

    const { ward, symptoms, householdCount, positiveScreenCount, notes } = req.body;
    const pincode = scopeCheck.pincode || req.body.pincode || req.user?.assignedScope?.pincode || "201306";
    const district = scopeCheck.district || req.body.district || req.user?.assignedScope?.district || "Gautam Buddha Nagar";
    const state = scopeCheck.state || req.body.state || req.user?.assignedScope?.state || "Uttar Pradesh";

    const signal = await evidenceConvergenceEngine.ingestEvidenceSignal({
      sourceType: "asha_worker",
      sourceIdentifier: String(req.userId),
      spatialScope: {
        state,
        district,
        pincode,
        ward: ward || "Sector 1",
      },
      signalType: "FIELD_SURVEY",
      category: healthStateTransformer.classifyClinicalCategory({}, symptoms),
      payload: {
        symptoms: symptoms || [],
        affectedCount: positiveScreenCount || 0,
        householdCount: householdCount || 1,
        severityScore: positiveScreenCount >= 3 ? 0.75 : positiveScreenCount >= 1 ? 0.45 : 0.15,
        notes: notes || "Doorstep screening survey completed by ASHA worker.",
      },
      confidenceWeight: 0.85,
    });

    await auditLoggerService.logAction({
      action: "ASHA_SURVEY_SUBMIT",
      resourceType: "EvidenceSignal",
      resourceId: signal._id,
      actorId: req.userId,
      ipAddress: req.ip,
      metadata: { state, district, pincode, positiveScreenCount },
    });

    return sendSuccess(
      res,
      { data: signal, message: "Field survey logged and added to convergence pool" },
      201
    );
  } catch (error) {
    logger.error({ err: error.message }, "Failed to submit ASHA survey");
    return sendError(res, {
      status: 400,
      code: "ASHA_SURVEY_FAILED",
      message: "Failed to submit survey",
    });
  }
};
