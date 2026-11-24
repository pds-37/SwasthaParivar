import Intervention from "../models/Intervention.js";
import HealthState from "../models/HealthState.js";
import interventionEngine from "../services/interventions/interventionEngine.js";
import closedLoopFeedbackService from "../services/interventions/closedLoopFeedbackService.js";
import capacityDeficitService from "../services/capacity/capacityDeficitService.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

export const listInterventions = async (req, res) => {
  try {
    const { district, status, targetLevel } = req.query;
    const filter = {};
    if (district) filter["targetScope.district"] = district;
    if (status) filter.status = status;
    if (targetLevel) filter.targetLevel = targetLevel;

    const interventions = await Intervention.find(filter)
      .populate("healthStateId")
      .sort({ dispatchedAt: -1 })
      .limit(50)
      .lean();

    return sendSuccess(res, { data: interventions });
  } catch (error) {
    return sendError(res, { status: 500, message: "Could not load interventions", details: error.message });
  }
};

export const dispatchIntervention = async (req, res) => {
  try {
    const { healthStateId } = req.body;
    const healthState = await HealthState.findById(healthStateId);
    if (!healthState) {
      return sendError(res, { status: 404, message: "HealthState not found" });
    }

    const capacityState = await capacityDeficitService.getOrInitializeCapacityState({
      district: healthState.spatialScope?.district || "Gautam Buddha Nagar",
      pincode: healthState.spatialScope?.pincode || "201306",
    });

    const intervention = await interventionEngine.dispatchInterventionForState(healthState, capacityState);
    return sendSuccess(res, { data: intervention }, 201);
  } catch (error) {
    return sendError(res, { status: 400, message: "Failed to dispatch intervention", details: error.message });
  }
};

export const submitPostInterventionFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { observedSeverity, notes } = req.body;

    const result = await closedLoopFeedbackService.evaluateInterventionFeedback(id, {
      observedSeverity,
      notes,
    });

    return sendSuccess(res, {
      data: result,
      message: `Feedback processed: Outcome is ${result.feedback.outcome}, state updated to ${result.feedback.actionTaken}`,
    });
  } catch (error) {
    return sendError(res, { status: 400, message: "Feedback evaluation failed", details: error.message });
  }
};
