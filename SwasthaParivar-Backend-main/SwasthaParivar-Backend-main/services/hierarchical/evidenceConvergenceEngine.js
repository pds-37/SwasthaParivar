import crypto from "node:crypto";
import EvidenceSignal from "../../models/EvidenceSignal.js";
import HealthState from "../../models/HealthState.js";
import { buildHealthTrends } from "../health/healthTrendService.js";
import {
  classifyClinicalCategory,
  computeSeverityScore,
  createPseudonymousNodeId,
  getSeverityBand,
  normalizeVitalMetrics,
  transformSignalToHealthState,
} from "./healthStateTransformer.js";
import { normalizeGeoToken } from "../../config/roles.js";
import { logger } from "../../utils/logger.js";

/**
 * EvidenceConvergenceEngine:
 * Evaluates spatial and temporal relationships between health signals while enforcing
 * geographic isolation (district + pincode) and k-anonymity thresholds to prevent
 * re-identification of small household groups.
 */

const SOURCE_WEIGHTS = {
  diagnostic_lab: 0.5,
  phc_clinic: 0.4,
  asha_worker: 0.35,
  pharmacy_demand: 0.25,
  household: 0.2,
};

const PII_KEYS = new Set([
  "name",
  "fullName",
  "email",
  "phone",
  "mobile",
  "memberId",
  "householdId",
  "userId",
  "linkedUserId",
  "address",
]);

function scrubPiiObject(obj = {}) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const scrubbed = {};
  for (const [key, val] of Object.entries(obj)) {
    if (PII_KEYS.has(key)) continue;
    scrubbed[key] = val;
  }
  return scrubbed;
}

export function isValidGeographicScope(spatialScope = {}) {
  const pincode = String(spatialScope?.pincode || "").trim();
  const district = String(spatialScope?.district || "").trim();
  return /^\d{6}$/.test(pincode) && district.length >= 2;
}

export function buildSignalDedupKey({ householdId, memberId, dateIso, metrics = {} }) {
  const hashInput = JSON.stringify({
    householdId: String(householdId || ""),
    memberId: String(memberId || ""),
    dateIso: String(dateIso || ""),
    metrics: normalizeVitalMetrics(metrics),
  });
  return crypto.createHash("sha256").update(hashInput).digest("hex");
}

export function calculateConvergenceConfidence(signals = []) {
  if (!signals.length) return 0;

  const sourceCounts = {};
  for (const sig of signals) {
    const sType = sig.sourceType || "household";
    sourceCounts[sType] = (sourceCounts[sType] || 0) + 1;
  }

  let totalWeight = 0;
  for (const [source, count] of Object.entries(sourceCounts)) {
    const baseWeight = SOURCE_WEIGHTS[source] || 0.2;
    totalWeight += baseWeight * Math.log2(1 + count);
  }

  const uniqueCategories = Object.keys(sourceCounts).length;
  if (uniqueCategories >= 3) {
    totalWeight *= 1.35;
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
  dedupKey = null,
  provenance = {},
}) {
  const safeScope = {
    pincode: String(spatialScope.pincode || "201306").trim(),
    ward: String(spatialScope.ward || "Sector 1").trim(),
    district: String(spatialScope.district || "Gautam Buddha Nagar").trim(),
    state: String(spatialScope.state || "Uttar Pradesh").trim(),
    coordinates:
      sourceType === "household"
        ? [77.4977, 28.4744]
        : spatialScope.coordinates || [77.4977, 28.4744],
  };

  if (!isValidGeographicScope(safeScope)) {
    throw new Error("Invalid spatial scope: district and 6-digit pincode are required");
  }

  if (dedupKey) {
    const existing = await EvidenceSignal.findOne({ dedupKey });
    if (existing) {
      return existing;
    }
  }

  const scrubbedPayload = {
    symptoms: Array.isArray(payload.symptoms) ? payload.symptoms.slice(0, 20) : [],
    affectedCount: Number(payload.affectedCount ?? 1),
    severityScore: Number(payload.severityScore ?? 0.5),
    notes: sourceType === "household" ? "" : String(payload.notes || "").slice(0, 400),
    metrics: scrubPiiObject(payload.metrics || {}),
  };

  try {
    const signal = await EvidenceSignal.create({
      sourceType,
      sourceIdentifier,
      spatialScope: safeScope,
      signalType,
      category,
      payload: scrubbedPayload,
      confidenceWeight,
      ...(dedupKey ? { dedupKey } : {}),
      provenance: {
        ingestionSource: provenance.ingestionSource || "api",
        snapshotTimestamp: provenance.snapshotTimestamp || null,
        transformerVersion: provenance.transformerVersion || "v2",
      },
    });

    logger.info(
      {
        signalId: signal._id,
        sourceType,
        category,
        district: safeScope.district,
        pincode: safeScope.pincode,
      },
      "Ingested de-identified evidence signal"
    );

    return signal;
  } catch (error) {
    if (error?.code === 11000 && dedupKey) {
      const existing = await EvidenceSignal.findOne({ dedupKey });
      if (existing) return existing;
    }
    throw error;
  }
}

export async function evaluateCommunityConvergence({
  state = "Uttar Pradesh",
  pincode = "201306",
  district = "Gautam Buddha Nagar",
  windowHours = 72,
}) {
  if (!isValidGeographicScope({ pincode, district })) {
    return {
      converged: false,
      message: "Valid district and 6-digit pincode are required for community convergence",
      signalCount: 0,
      generatedCommunityStates: [],
      totalSignalsEvaluated: 0,
    };
  }

  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const canonicalDistrict = normalizeGeoToken(district);

  // Scope strictly by pincode and district to prevent cross-district collisions
  const rawSignals = await EvidenceSignal.find({
    "spatialScope.pincode": String(pincode).trim(),
    createdAt: { $gte: cutoff },
  }).lean();

  const recentSignals = rawSignals.filter(
    (sig) => normalizeGeoToken(sig.spatialScope?.district) === canonicalDistrict
  );

  if (recentSignals.length < 2) {
    return {
      converged: false,
      message: "Insufficient signal density for community state formation",
      signalCount: recentSignals.length,
      generatedCommunityStates: [],
      totalSignalsEvaluated: recentSignals.length,
    };
  }

  const categoryGroups = {};
  for (const sig of recentSignals) {
    const cat = sig.category || "GENERAL_STABLE";
    if (!categoryGroups[cat]) categoryGroups[cat] = [];
    categoryGroups[cat].push(sig);
  }

  const results = [];

  for (const [category, signals] of Object.entries(categoryGroups)) {
    if (signals.length < 2) continue;

    // Privacy k-anonymity guard: require at least 2 distinct reporting identifiers
    // and at least 2 distinct evidence source categories before community aggregation
    const uniqueSources = Array.from(new Set(signals.map((s) => s.sourceType)));
    const uniqueIdentifiers = new Set(signals.map((s) => String(s.sourceIdentifier || "")));
    if (uniqueSources.length < 2 || uniqueIdentifiers.size < 2) {
      continue;
    }

    const confidence = calculateConvergenceConfidence(signals);
    const avgSeverity = Number(
      (
        signals.reduce((sum, s) => sum + Number(s.payload?.severityScore || 0.4), 0) /
        signals.length
      ).toFixed(2)
    );
    const computedBand = getSeverityBand(avgSeverity);

    const isConverged = confidence >= 0.35;
    if (!isConverged) continue;

    const existingState = await HealthState.findOne({
      level: "community",
      "spatialScope.pincode": String(pincode).trim(),
      "spatialScope.district": district,
      category,
      stateStatus: { $in: ["ACTIVE", "MAINTAINED", "ESCALATED"] },
    });

    let communityState;
    if (existingState) {
      existingState.confidence = confidence;
      existingState.evidenceCount = signals.length;
      existingState.sources = uniqueSources;
      existingState.severityScore = avgSeverity;
      existingState.severity = computedBand;
      existingState.metadata = {
        ...existingState.metadata,
        lastEvaluated: new Date(),
        participatingSignalCount: signals.length,
        uniqueSourceIdentifiers: uniqueIdentifiers.size,
      };
      communityState = await existingState.save();
    } else {
      communityState = await HealthState.create({
        level: "community",
        nodeId: `COMMUNITY-${String(pincode).trim()}-${category}`,
        category,
        severity: computedBand,
        severityScore: avgSeverity,
        confidence,
        evidenceCount: signals.length,
        sources: uniqueSources,
        spatialScope: {
          state,
          pincode: String(pincode).trim(),
          district,
          coordinates: signals[0]?.spatialScope?.coordinates || [77.4977, 28.4744],
        },
        stateStatus: "ACTIVE",
        metadata: {
          formedAt: new Date(),
          participatingSignalCount: signals.length,
          uniqueSourceIdentifiers: uniqueIdentifiers.size,
        },
      });
    }

    results.push(communityState);
  }

  return {
    converged: results.length > 0,
    generatedCommunityStates: results,
    totalSignalsEvaluated: recentSignals.length,
  };
}

/**
 * Transform an individual/BLE snapshot into privacy-preserving hierarchical signals
 * with idempotency and bounded retry recovery.
 */
export async function processHouseholdVitalTelemetry({
  member,
  household,
  snapshot,
  maxRetries = 2,
}) {
  if (!member || !snapshot) {
    return { status: "SKIPPED", reason: "MISSING_CONTEXT" };
  }

  const normalizedMetrics = normalizeVitalMetrics(snapshot);
  const trends = buildHealthTrends(member);
  const category = classifyClinicalCategory(normalizedMetrics, []);
  const severityScore = computeSeverityScore(normalizedMetrics, [], trends.flags);
  const isAnomalous = severityScore >= 0.3 || trends.flags.length > 0;

  const spatialScope = {
    state: household?.location?.state || "Uttar Pradesh",
    district: household?.location?.district || "Gautam Buddha Nagar",
    pincode: household?.location?.pincode || "201306",
    ward: household?.location?.ward || "Sector 1",
  };

  if (!isValidGeographicScope(spatialScope)) {
    logger.warn("Skipped hierarchical telemetry emission due to incomplete household spatialScope");
    return { status: "SKIPPED", reason: "INVALID_SCOPE" };
  }

  const pseudonymousId = createPseudonymousNodeId(
    "HH",
    member.householdId || household?._id || member._id
  );
  const dedupKey = buildSignalDedupKey({
    householdId: member.householdId || household?._id || "",
    memberId: member._id,
    dateIso: snapshot.date,
    metrics: normalizedMetrics,
  });

  if (!isAnomalous) {
    // If previous household state existed for this pseudonymous node and vitals normalized, step it down cleanly
    try {
      await HealthState.updateMany(
        {
          level: "household",
          nodeId: pseudonymousId,
          "spatialScope.district": spatialScope.district,
          "spatialScope.pincode": spatialScope.pincode,
          stateStatus: { $in: ["ACTIVE", "MAINTAINED", "ESCALATED"] },
        },
        {
          $set: {
            severityScore,
            severity: getSeverityBand(severityScore),
            stateStatus: "DE_ESCALATED",
          },
        }
      );
    } catch {
      // Non-fatal cleanup
    }
    return {
      status: "BASELINE_NORMAL",
      severityScore,
      severity: getSeverityBand(severityScore),
      category,
    };
  }

  const confidenceWeight = snapshot.source === "ble_device" ? 0.78 : 0.62;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const signal = await ingestEvidenceSignal({
        sourceType: "household",
        sourceIdentifier: pseudonymousId,
        spatialScope,
        signalType: "VITAL_ANOMALY",
        category,
        payload: {
          symptoms: [],
          affectedCount: 1,
          severityScore,
          notes: "",
          metrics: normalizedMetrics,
        },
        confidenceWeight,
        dedupKey,
        provenance: {
          ingestionSource: snapshot.source || "manual",
          snapshotTimestamp: new Date(snapshot.date),
          transformerVersion: "v2",
        },
      });

      const healthState = await transformSignalToHealthState({
        level: "household",
        nodeId: pseudonymousId,
        metrics: normalizedMetrics,
        symptoms: [],
        trendFlags: trends.flags,
        source: "household",
        spatialScope,
        metadata: {
          ingestionSource: snapshot.source || "manual",
          dedupKey,
        },
      });

      return {
        status: "EMITTED",
        signalId: signal._id,
        healthStateId: healthState._id,
        severityScore,
        severity: getSeverityBand(severityScore),
        category,
      };
    } catch (error) {
      lastError = error;
      logger.warn(
        { attempt, maxRetries, err: error.message },
        "Transient failure emitting household vital telemetry"
      );
    }
  }

  logger.error(
    { err: lastError?.message, category, district: spatialScope.district },
    "Failed to emit hierarchical telemetry after retries; personal health record preserved"
  );
  return { status: "FAILED_ISOLATED", reason: lastError?.message || "TELEMETRY_ERROR" };
}

export default {
  isValidGeographicScope,
  buildSignalDedupKey,
  calculateConvergenceConfidence,
  ingestEvidenceSignal,
  evaluateCommunityConvergence,
  processHouseholdVitalTelemetry,
};
