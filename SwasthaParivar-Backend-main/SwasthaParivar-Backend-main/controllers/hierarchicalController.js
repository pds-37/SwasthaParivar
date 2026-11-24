import HealthState from "../models/HealthState.js";
import EvidenceSignal from "../models/EvidenceSignal.js";
import CapacityState from "../models/CapacityState.js";
import Intervention from "../models/Intervention.js";
import HealthcareFacility from "../models/HealthcareFacility.js";
import healthStateTransformer from "../services/hierarchical/healthStateTransformer.js";
import evidenceConvergenceEngine from "../services/hierarchical/evidenceConvergenceEngine.js";
import capacityDeficitService from "../services/capacity/capacityDeficitService.js";
import stateTransitionEngine from "../services/hierarchical/stateTransitionEngine.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { logger } from "../utils/logger.js";

export const listHealthStates = async (req, res) => {
  try {
    const { level, category, pincode, district, stateStatus } = req.query;
    const filter = {};

    if (level) filter.level = level;
    if (category) filter.category = category;
    if (pincode) filter["spatialScope.pincode"] = pincode;
    if (district) filter["spatialScope.district"] = district;
    if (stateStatus) filter.stateStatus = stateStatus;

    const states = await HealthState.find(filter)
      .populate("activeInterventionId")
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    return sendSuccess(res, { data: states });
  } catch (error) {
    logger.error({ err: error.message }, "Failed to list HealthStates");
    return sendError(res, { status: 500, message: "Could not fetch health states", details: error.message });
  }
};

export const getHealthStateById = async (req, res) => {
  try {
    const state = await HealthState.findById(req.params.id)
      .populate("activeInterventionId")
      .lean();

    if (!state) {
      return sendError(res, { status: 404, message: "HealthState not found" });
    }

    return sendSuccess(res, { data: state });
  } catch (error) {
    return sendError(res, { status: 500, message: "Could not load health state", details: error.message });
  }
};

export const transformRawSignal = async (req, res) => {
  try {
    const { level, nodeId, metrics, symptoms, source, spatialScope, metadata } = req.body;

    const healthState = await healthStateTransformer.transformSignalToHealthState({
      level: level || "household",
      nodeId: nodeId || req.userId,
      metrics: metrics || {},
      symptoms: symptoms || [],
      source: source || "household",
      spatialScope: spatialScope || {},
      metadata: metadata || {},
    });

    return sendSuccess(res, { data: healthState }, 201);
  } catch (error) {
    return sendError(res, { status: 400, message: "Failed to transform signal", details: error.message });
  }
};

export const ingestMultiSourceEvidence = async (req, res) => {
  try {
    const { sourceType, sourceIdentifier, spatialScope, signalType, category, payload, confidenceWeight } = req.body;

    if (!sourceType || !sourceIdentifier) {
      return sendError(res, { status: 400, message: "sourceType and sourceIdentifier are required" });
    }

    const signal = await evidenceConvergenceEngine.ingestEvidenceSignal({
      sourceType,
      sourceIdentifier,
      spatialScope,
      signalType: signalType || "SYMPTOM_REPORT",
      category,
      payload,
      confidenceWeight,
    });

    return sendSuccess(res, { data: signal }, 201);
  } catch (error) {
    return sendError(res, { status: 400, message: "Failed to ingest evidence signal", details: error.message });
  }
};

export const evaluateConvergence = async (req, res) => {
  try {
    const { pincode = "201306", district = "Gautam Buddha Nagar", windowHours = 72 } = req.body;

    const result = await evidenceConvergenceEngine.evaluateCommunityConvergence({
      pincode,
      district,
      windowHours: Number(windowHours),
    });

    return sendSuccess(res, { data: result });
  } catch (error) {
    return sendError(res, { status: 500, message: "Convergence evaluation failed", details: error.message });
  }
};

export const triggerStateTransition = async (req, res) => {
  try {
    const { healthStateId } = req.params;

    const outcome = await stateTransitionEngine.processHealthStateTransition(healthStateId);

    return sendSuccess(res, { data: outcome });
  } catch (error) {
    return sendError(res, { status: 400, message: "State transition failed", details: error.message });
  }
};

export const getDistrictOverview = async (req, res) => {
  try {
    const district = req.query.district || "Gautam Buddha Nagar";
    const pincode = req.query.pincode || "201306";

    const [healthStates, capacity, activeInterventions, facilities] = await Promise.all([
      HealthState.find({ "spatialScope.district": district, stateStatus: { $ne: "RESOLVED" } })
        .sort({ severityScore: -1 })
        .limit(50)
        .lean(),
      capacityDeficitService.getOrInitializeCapacityState({ district, pincode }),
      Intervention.find({ "targetScope.district": district, status: { $in: ["DISPATCHED", "IN_PROGRESS"] } })
        .sort({ dispatchedAt: -1 })
        .limit(20)
        .lean(),
      HealthcareFacility.find({ district }).lean(),
    ]);

    // Aggregate key metrics for District Command Center
    const totalActiveClusters = healthStates.filter((s) => s.level !== "individual" && s.level !== "household").length;
    const criticalSurgeCount = healthStates.filter((s) => s.severity === "CRITICAL" || s.severityScore >= 0.75).length;
    
    // Category distribution
    const categoryBreakdown = {};
    for (const st of healthStates) {
      categoryBreakdown[st.category] = (categoryBreakdown[st.category] || 0) + 1;
    }

    return sendSuccess(res, {
      data: {
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
        healthStates,
        capacityState: capacity,
        activeInterventions,
        facilities,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, message: "Could not compile district overview", details: error.message });
  }
};

export const getAshaTasks = async (req, res) => {
  try {
    const pincode = req.query.pincode || req.user?.assignedScope?.pincode || "201306";

    const tasks = await Intervention.find({
      "targetScope.pincode": pincode,
      assignedRoles: "asha_worker",
      status: { $in: ["DISPATCHED", "IN_PROGRESS"] },
    })
      .sort({ priority: 1, dispatchedAt: -1 })
      .lean();

    return sendSuccess(res, { data: tasks });
  } catch (error) {
    return sendError(res, { status: 500, message: "Could not load ASHA tasks", details: error.message });
  }
};

export const submitAshaSurvey = async (req, res) => {
  try {
    const { ashaId, pincode, ward, symptoms, householdCount, positiveScreenCount, notes } = req.body;

    const signal = await evidenceConvergenceEngine.ingestEvidenceSignal({
      sourceType: "asha_worker",
      sourceIdentifier: ashaId || req.userId || "ASHA-FIELD-OPERATOR",
      spatialScope: {
        pincode: pincode || "201306",
        ward: ward || "Knowledge Park Sector 1",
        district: "Gautam Buddha Nagar",
      },
      signalType: "FIELD_SURVEY",
      category: healthStateTransformer.classifyClinicalCategory({}, symptoms),
      payload: {
        symptoms: symptoms || [],
        affectedCount: positiveScreenCount || 1,
        householdCount: householdCount || 5,
        severityScore: positiveScreenCount >= 3 ? 0.75 : 0.45,
        notes: notes || "Doorstep screening survey completed by ASHA worker.",
      },
      confidenceWeight: 0.85, // High confidence for ground-verified surveys
    });

    return sendSuccess(res, { data: signal, message: "Field survey logged and added to convergence pool" }, 201);
  } catch (error) {
    return sendError(res, { status: 400, message: "Failed to submit survey", details: error.message });
  }
};
