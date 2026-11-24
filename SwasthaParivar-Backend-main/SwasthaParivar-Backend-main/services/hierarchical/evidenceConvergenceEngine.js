import EvidenceSignal from "../../models/EvidenceSignal.js";
import HealthState from "../../models/HealthState.js";
import { logger } from "../../utils/logger.js";

/**
 * EvidenceConvergenceEngine:
 * Evaluates spatial and temporal relationships between health states and signals.
 * Combines independently obtained evidence from:
 *  - Households (self-reported vitals/symptoms)
 *  - ASHA / Community health workers (field doorstep observations)
 *  - Primary Health Centres (PHC outpatient trends)
 *  - Pharmacies (medication demand and OTC surges)
 *  - Diagnostic laboratories (confirmed positive tests)
 * 
 * Generates an aggregated Higher-Level Health State (e.g. at Community or District level)
 * when configurable convergence conditions are satisfied.
 */

const SOURCE_WEIGHTS = {
  diagnostic_lab: 0.5,
  phc_clinic: 0.4,
  asha_worker: 0.35,
  pharmacy_demand: 0.25,
  household: 0.2,
};

export function calculateConvergenceConfidence(signals = []) {
  if (!signals.length) return 0;

  // Group signals by source type
  const sourceCounts = {};
  for (const sig of signals) {
    const sType = sig.sourceType || "household";
    sourceCounts[sType] = (sourceCounts[sType] || 0) + 1;
  }

  let totalWeight = 0;
  for (const [source, count] of Object.entries(sourceCounts)) {
    const baseWeight = SOURCE_WEIGHTS[source] || 0.2;
    // Logarithmic scaling for multiple signals from the same source category
    totalWeight += baseWeight * Math.log2(1 + count);
  }

  // Bonus for cross-category diversity
  const uniqueCategories = Object.keys(sourceCounts).length;
  if (uniqueCategories >= 3) {
    totalWeight *= 1.35; // 35% boost when 3+ independent sources agree
  } else if (uniqueCategories === 2) {
    totalWeight *= 1.15;
  }

  return Math.min(1.0, Math.max(0.1, Number(totalWeight.toFixed(2))));
}

export async function ingestEvidenceSignal({
  sourceType,
  sourceIdentifier,
  spatialScope = {},
  signalType,
  category = "FEBRILE_ILLNESS",
  payload = {},
  confidenceWeight = 0.6,
}) {
  const signal = await EvidenceSignal.create({
    sourceType,
    sourceIdentifier,
    spatialScope: {
      pincode: spatialScope.pincode || "201306",
      ward: spatialScope.ward || "Sector 1",
      district: spatialScope.district || "Gautam Buddha Nagar",
      coordinates: spatialScope.coordinates || [77.4977, 28.4744],
    },
    signalType,
    category,
    payload,
    confidenceWeight,
  });

  logger.info(
    { signalId: signal._id, sourceType, category, pincode: spatialScope.pincode },
    "Ingested multi-source evidence signal"
  );

  return signal;
}

export async function evaluateCommunityConvergence({
  pincode = "201306",
  district = "Gautam Buddha Nagar",
  windowHours = 72,
}) {
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  // 1. Fetch recent signals in this spatial zone
  const recentSignals = await EvidenceSignal.find({
    "spatialScope.pincode": pincode,
    createdAt: { $gte: cutoff },
  }).lean();

  if (recentSignals.length < 2) {
    return {
      converged: false,
      message: "Insufficient signal density for community state formation",
      signalCount: recentSignals.length,
    };
  }

  // 2. Group signals by clinical category
  const categoryGroups = {};
  for (const sig of recentSignals) {
    const cat = sig.category || "GENERAL_STABLE";
    if (!categoryGroups[cat]) categoryGroups[cat] = [];
    categoryGroups[cat].push(sig);
  }

  const results = [];

  for (const [category, signals] of Object.entries(categoryGroups)) {
    if (signals.length < 2) continue;

    const confidence = calculateConvergenceConfidence(signals);
    const uniqueSources = Array.from(new Set(signals.map((s) => s.sourceType)));
    
    // Compute mean severity across signals
    const avgSeverity =
      signals.reduce((sum, s) => sum + (s.payload?.severityScore || 0.4), 0) / signals.length;

    // High convergence threshold: >= 2 sources and confidence >= 0.4
    const isConverged = uniqueSources.length >= 2 && confidence >= 0.35;

    if (isConverged) {
      // Create or update a Community-Level HealthState
      const existingState = await HealthState.findOne({
        level: "community",
        "spatialScope.pincode": pincode,
        category,
        stateStatus: { $in: ["ACTIVE", "MAINTAINED", "ESCALATED"] },
      });

      let communityState;
      if (existingState) {
        existingState.confidence = confidence;
        existingState.evidenceCount = signals.length;
        existingState.sources = uniqueSources;
        existingState.severityScore = Number(avgSeverity.toFixed(2));
        existingState.metadata = {
          lastEvaluated: new Date(),
          participatingSignalIds: signals.map((s) => s._id),
        };
        communityState = await existingState.save();
      } else {
        communityState = await HealthState.create({
          level: "community",
          nodeId: `COMMUNITY-${pincode}-${category}`,
          category,
          severity: avgSeverity >= 0.7 ? "HIGH" : avgSeverity >= 0.4 ? "MODERATE" : "LOW",
          severityScore: Number(avgSeverity.toFixed(2)),
          confidence,
          evidenceCount: signals.length,
          sources: uniqueSources,
          spatialScope: {
            pincode,
            district,
            coordinates: signals[0]?.spatialScope?.coordinates || [77.4977, 28.4744],
          },
          stateStatus: "ACTIVE",
          metadata: {
            formedAt: new Date(),
            participatingSignalIds: signals.map((s) => s._id),
          },
        });
      }

      results.push(communityState);
    }
  }

  return {
    converged: results.length > 0,
    generatedCommunityStates: results,
    totalSignalsEvaluated: recentSignals.length,
  };
}

export default {
  calculateConvergenceConfidence,
  ingestEvidenceSignal,
  evaluateCommunityConvergence,
};
