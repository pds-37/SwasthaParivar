import HealthState from "../../models/HealthState.js";
import { getSeverityBand } from "./healthStateTransformer.js";
import capacityDeficitService from "../capacity/capacityDeficitService.js";
import interventionEngine from "../interventions/interventionEngine.js";
import { logger } from "../../utils/logger.js";

/**
 * StateTransitionEngine:
 * Implements the core State-Transition mechanism of the patent.
 * Evaluates whether an active health state should be:
 *  - MAINTAINED: Contained at its current hierarchical level
 *  - ESCALATED: Propagated upward (e.g. household -> community -> facility -> district -> state)
 *  - DE-ESCALATED: Stepped down following effective clinical intervention
 * 
 * Conditioned dynamically on:
 *  1. Severity score (S_h)
 *  2. Evidence convergence confidence (C_e)
 *  3. Geographic capacity deficit (D_c)
 *  4. Temporal persistence and spatial concentration
 */

const HIERARCHY_LEVELS = ["individual", "household", "community", "facility", "district", "state", "national"];

export function getNextLevelUp(currentLevel) {
  const idx = HIERARCHY_LEVELS.indexOf(currentLevel);
  if (idx === -1 || idx >= HIERARCHY_LEVELS.length - 1) return currentLevel;
  return HIERARCHY_LEVELS[idx + 1];
}

export function getNextLevelDown(currentLevel) {
  const idx = HIERARCHY_LEVELS.indexOf(currentLevel);
  if (idx <= 1) return "household";
  return HIERARCHY_LEVELS[idx - 1];
}

export function evaluateStateTransitionLogic({
  severityScore = 0.5,
  confidence = 0.6,
  capacityDeficit = 0.3,
  evidenceCount = 1,
  currentLevel = "community",
}) {
  // 1. Check for Critical Escalation Condition:
  // Severe disease risk (>0.7) OR multi-source evidence (>3 signals, confidence > 0.6) paired with capacity deficit (>0.45)
  const isHighRisk = severityScore >= 0.65;
  const isStrongConvergence = confidence >= 0.55 && evidenceCount >= 2;
  const isCapacityConstrained = capacityDeficit >= 0.40;

  // 1. Extreme deficit override: If hospitals/beds have severe deficit (>= 0.70), fast-track escalation to District command
  if (capacityDeficit >= 0.70 && (isHighRisk || isStrongConvergence)) {
    return {
      transition: "ESCALATE",
      targetLevel: "district",
      reason: `Critical regional capacity deficit (${capacityDeficit}) triggers fast-track escalation to District command.`,
    };
  }

  // 2. Standard Upward Escalation Condition:
  // Severe disease risk (>0.65) OR multi-source evidence (confidence > 0.55, count >= 2) paired with capacity deficit (>= 0.40)
  if ((isHighRisk || isStrongConvergence) && isCapacityConstrained) {
    return {
      transition: "ESCALATE",
      targetLevel: getNextLevelUp(currentLevel),
      reason: `High risk (${severityScore}) / convergence (${confidence}) combined with healthcare capacity deficit (${capacityDeficit}) requires upward escalation.`,
    };
  }

  // 2. Check for De-escalation Condition:
  // Low severity (<0.30) and low capacity deficit (<0.25)
  if (severityScore <= 0.25 && capacityDeficit <= 0.30) {
    return {
      transition: "DE_ESCALATE",
      targetLevel: getNextLevelDown(currentLevel),
      reason: "Health indicators and local capacity have normalized to baseline.",
    };
  }

  // 3. Default: Maintain state at current tier
  return {
    transition: "MAINTAIN",
    targetLevel: currentLevel,
    reason: "Current local resources and evidence level remain stable; anomaly maintained at current tier.",
  };
}

export async function processHealthStateTransition(healthStateId) {
  const healthState = await HealthState.findById(healthStateId);
  if (!healthState) throw new Error("HealthState not found");

  const pincode = healthState.spatialScope?.pincode || "201306";
  const district = healthState.spatialScope?.district || "Gautam Buddha Nagar";

  // Fetch or evaluate geographic capacity state
  const capacityState = await capacityDeficitService.getOrInitializeCapacityState({ district, pincode });

  const decision = evaluateStateTransitionLogic({
    severityScore: healthState.severityScore,
    confidence: healthState.confidence,
    capacityDeficit: capacityState.capacityDeficitIndex,
    evidenceCount: healthState.evidenceCount,
    currentLevel: healthState.level,
  });

  const previousLevel = healthState.level;
  healthState.severity = getSeverityBand(healthState.severityScore);
  healthState.stateStatus =
    decision.transition === "ESCALATE"
      ? "ESCALATED"
      : decision.transition === "DE_ESCALATE"
        ? "DE_ESCALATED"
        : "MAINTAINED";

  if (decision.transition === "ESCALATE") {
    healthState.level = decision.targetLevel;
  } else if (decision.transition === "DE_ESCALATE" && decision.targetLevel !== healthState.level) {
    healthState.level = decision.targetLevel;
  }

  const evaluatedAt = new Date();
  const history = Array.isArray(healthState.metadata?.transitionHistory)
    ? healthState.metadata.transitionHistory
    : [];

  healthState.metadata = {
    ...(healthState.metadata || {}),
    lastTransitionDecision: decision,
    capacityDeficitAtTransition: capacityState.capacityDeficitIndex,
    evaluatedAt,
    transitionHistory: [
      ...history.slice(-19),
      {
        timestamp: evaluatedAt.toISOString(),
        source: "fsm_transition",
        previousLevel,
        nextLevel: healthState.level,
        severityScore: healthState.severityScore,
        severityBand: healthState.severity,
        transition: decision.transition,
      },
    ],
  };

  await healthState.save();

  logger.info(
    {
      healthStateId: healthState._id,
      transition: decision.transition,
      newLevel: healthState.level,
      reason: decision.reason,
    },
    "Processed health state transition"
  );

  let intervention = null;
  // Automatically trigger level-specific intervention if escalated
  if (decision.transition === "ESCALATE" && !healthState.activeInterventionId) {
    intervention = await interventionEngine.dispatchInterventionForState(healthState, capacityState);
  }

  return {
    healthState,
    capacityState,
    decision,
    intervention,
  };
}

export default {
  evaluateStateTransitionLogic,
  processHealthStateTransition,
  getNextLevelUp,
  getNextLevelDown,
};
