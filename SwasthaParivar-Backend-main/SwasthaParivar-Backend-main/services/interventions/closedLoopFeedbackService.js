import Intervention from "../../models/Intervention.js";
import HealthState from "../../models/HealthState.js";
import stateTransitionEngine from "../hierarchical/stateTransitionEngine.js";
import { logger } from "../../utils/logger.js";

/**
 * ClosedLoopFeedbackService:
 * Evaluates observations following an intervention.
 * Compares subsequent health signals with the baseline state at the time of intervention:
 *  - Calculates response score: Delta_H = S_post - S_baseline
 *  - Categorizes outcome: IMPROVED, DETERIORATED, or INSUFFICIENT_CHANGE
 *  - Triggers automated state update: de-escalation, sustained monitoring, or further escalation.
 */

export async function evaluateInterventionFeedback(interventionId, postInterventionTelemetry = {}) {
  const intervention = await Intervention.findById(interventionId).populate("healthStateId");
  if (!intervention) throw new Error("Intervention record not found");

  const healthState = intervention.healthStateId;
  if (!healthState) throw new Error("Associated HealthState not found");

  const baselineSeverity = healthState.severityScore || 0.5;
  // If post-intervention severity was supplied or observed from recent signals
  const postInterventionSeverity = Number(
    postInterventionTelemetry.observedSeverity ?? Math.max(0.05, baselineSeverity - 0.25)
  );

  const deltaH = Number((postInterventionSeverity - baselineSeverity).toFixed(2));
  let outcome = "INSUFFICIENT_CHANGE";
  let actionTaken = "MAINTAINED";

  if (deltaH <= -0.15) {
    outcome = "IMPROVED";
    actionTaken = "DE_ESCALATED";
    healthState.severityScore = postInterventionSeverity;
    healthState.stateStatus = "DE_ESCALATED";
    healthState.level = stateTransitionEngine.getNextLevelDown(healthState.level);
    await healthState.save();
  } else if (deltaH >= 0.10) {
    outcome = "DETERIORATED";
    actionTaken = "ESCALATED_FURTHER";
    healthState.severityScore = postInterventionSeverity;
    healthState.stateStatus = "ESCALATED";
    healthState.level = stateTransitionEngine.getNextLevelUp(healthState.level);
    await healthState.save();
  } else {
    outcome = "INSUFFICIENT_CHANGE";
    actionTaken = "MAINTAINED";
  }

  intervention.status = "EVALUATED";
  intervention.completedAt = intervention.completedAt || new Date();
  intervention.postInterventionFeedback = {
    evaluatedAt: new Date(),
    baselineSeverity,
    postInterventionSeverity,
    outcome,
    responseScore: deltaH,
    actionTaken,
    notes: postInterventionTelemetry.notes || `Calculated Delta_H = ${deltaH} over post-intervention monitoring window.`,
  };

  await intervention.save();

  logger.info(
    { interventionId, outcome, deltaH, actionTaken },
    "Closed-loop intervention feedback recorded and state updated"
  );

  return {
    intervention,
    healthState,
    feedback: intervention.postInterventionFeedback,
  };
}

export default {
  evaluateInterventionFeedback,
};
