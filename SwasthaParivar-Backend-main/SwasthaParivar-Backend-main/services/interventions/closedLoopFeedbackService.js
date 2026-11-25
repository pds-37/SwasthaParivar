import Intervention from "../../models/Intervention.js";
import { getSeverityBand } from "../hierarchical/healthStateTransformer.js";
import stateTransitionEngine from "../hierarchical/stateTransitionEngine.js";
import { logger } from "../../utils/logger.js";

/**
 * ClosedLoopFeedbackService:
 * Evaluates post-intervention clinical telemetry:
 *  - Delta_H = S_post - S_baseline
 *  - Recomputes normalized severity label via authoritative getSeverityBand()
 *  - Updates hierarchical level & transition history with timestamps
 */

export async function evaluateInterventionFeedback(interventionId, postInterventionTelemetry = {}) {
  const intervention = await Intervention.findById(interventionId).populate("healthStateId");
  if (!intervention) throw new Error("Intervention record not found");

  const healthState = intervention.healthStateId;
  if (!healthState) throw new Error("Associated HealthState not found");

  const baselineSeverity = Number(healthState.severityScore ?? 0.5);
  const rawPost = Number(
    postInterventionTelemetry.observedSeverity ?? Math.max(0.05, baselineSeverity - 0.25)
  );
  const postInterventionSeverity = Number(Math.min(1, Math.max(0.05, rawPost)).toFixed(2));
  const newSeverityBand = getSeverityBand(postInterventionSeverity);

  const deltaH = Number((postInterventionSeverity - baselineSeverity).toFixed(2));
  let outcome = "INSUFFICIENT_CHANGE";
  let actionTaken = "MAINTAINED";

  const previousLevel = healthState.level;

  if (deltaH <= -0.15) {
    outcome = "IMPROVED";
    actionTaken = "DE_ESCALATED";
    healthState.severityScore = postInterventionSeverity;
    healthState.severity = newSeverityBand;
    healthState.stateStatus = "DE_ESCALATED";
    healthState.level = stateTransitionEngine.getNextLevelDown(healthState.level);
  } else if (deltaH >= 0.1) {
    outcome = "DETERIORATED";
    actionTaken = "ESCALATED_FURTHER";
    healthState.severityScore = postInterventionSeverity;
    healthState.severity = newSeverityBand;
    healthState.stateStatus = "ESCALATED";
    healthState.level = stateTransitionEngine.getNextLevelUp(healthState.level);
  } else {
    outcome = "INSUFFICIENT_CHANGE";
    actionTaken = "MAINTAINED";
    healthState.severityScore = postInterventionSeverity;
    healthState.severity = newSeverityBand;
    healthState.stateStatus = "MAINTAINED";
  }

  const evaluatedAt = new Date();
  const history = Array.isArray(healthState.metadata?.transitionHistory)
    ? healthState.metadata.transitionHistory
    : [];

  healthState.metadata = {
    ...(healthState.metadata || {}),
    lastFeedbackEvaluatedAt: evaluatedAt.toISOString(),
    transitionHistory: [
      ...history.slice(-19),
      {
        timestamp: evaluatedAt.toISOString(),
        source: "closed_loop_feedback",
        previousLevel,
        nextLevel: healthState.level,
        previousSeverityScore: baselineSeverity,
        nextSeverityScore: postInterventionSeverity,
        nextSeverityBand: newSeverityBand,
        actionTaken,
      },
    ],
  };

  await healthState.save();

  intervention.status = "EVALUATED";
  intervention.completedAt = intervention.completedAt || evaluatedAt;
  intervention.postInterventionFeedback = {
    evaluatedAt,
    baselineSeverity,
    postInterventionSeverity,
    outcome,
    responseScore: deltaH,
    actionTaken,
    notes:
      postInterventionTelemetry.notes ||
      `Calculated Delta_H = ${deltaH} over post-intervention monitoring window.`,
  };

  await intervention.save();

  logger.info(
    { interventionId, outcome, deltaH, actionTaken, newSeverityBand },
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
