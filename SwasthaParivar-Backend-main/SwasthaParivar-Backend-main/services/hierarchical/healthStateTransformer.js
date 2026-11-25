import crypto from "node:crypto";
import HealthState from "../../models/HealthState.js";
import { logger } from "../../utils/logger.js";

/**
 * HealthStateTransformer:
 * Transforms raw physiological vitals (manual or BLE), symptoms, or member health records
 * into standardized, de-identified machine-readable HealthState representations.
 *
 * Enforces zero-trust privacy:
 * - Strips all direct identifiers (names, phone numbers, emails, raw memberId/householdId).
 * - Uses keyed HMAC/SHA-256 pseudonymous tokens for repeatable aggregation without re-identification.
 */

const NODE_HASH_SECRET =
  process.env.HEALTH_SIGNAL_SALT || process.env.JWT_SECRET || "swastha-hierarchical-pseudonym-v1";

export function parseBloodPressureReading(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { systolic: value, diastolic: null };
  }
  const match = String(value || "")
    .trim()
    .match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
  if (!match) return { systolic: null, diastolic: null };

  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
}

export function normalizeVitalMetrics(rawMetrics = {}) {
  const parsedBp = parseBloodPressureReading(rawMetrics.bloodPressure);
  const bpSystolic =
    rawMetrics.bpSystolic != null && rawMetrics.bpSystolic !== ""
      ? Number(rawMetrics.bpSystolic)
      : parsedBp.systolic;
  const bpDiastolic =
    rawMetrics.bpDiastolic != null && rawMetrics.bpDiastolic !== ""
      ? Number(rawMetrics.bpDiastolic)
      : parsedBp.diastolic;

  const bloodSugar =
    rawMetrics.bloodSugar != null && rawMetrics.bloodSugar !== ""
      ? Number(rawMetrics.bloodSugar)
      : null;
  const heartRate =
    rawMetrics.heartRate != null && rawMetrics.heartRate !== ""
      ? Number(rawMetrics.heartRate)
      : null;
  const spO2 =
    rawMetrics.spO2 != null && rawMetrics.spO2 !== "" ? Number(rawMetrics.spO2) : null;
  const weight =
    rawMetrics.weight != null && rawMetrics.weight !== "" ? Number(rawMetrics.weight) : null;

  return {
    bpSystolic: Number.isFinite(bpSystolic) ? bpSystolic : null,
    bpDiastolic: Number.isFinite(bpDiastolic) ? bpDiastolic : null,
    bloodSugar: Number.isFinite(bloodSugar) ? bloodSugar : null,
    heartRate: Number.isFinite(heartRate) ? heartRate : null,
    spO2: Number.isFinite(spO2) ? spO2 : null,
    weight: Number.isFinite(weight) ? weight : null,
  };
}

export function createPseudonymousNodeId(prefix = "HH", rawId = "") {
  const digest = crypto
    .createHmac("sha256", NODE_HASH_SECRET)
    .update(String(rawId || "anonymous"))
    .digest("hex")
    .slice(0, 16);
  return `${prefix}-${digest}`;
}

export function classifyClinicalCategory(metrics = {}, symptoms = []) {
  const normSymptoms = (symptoms || []).map((s) => String(s).toLowerCase());

  const hasResp = normSymptoms.some((s) =>
    ["cough", "breathlessness", "wheezing", "sore throat", "chest tightness"].some((k) => s.includes(k))
  );
  const hasWaterborne = normSymptoms.some((s) =>
    ["diarrhea", "vomiting", "stomach cramps", "cholera", "dehydration"].some((k) => s.includes(k))
  );
  const hasFever = normSymptoms.some((s) =>
    ["fever", "chills", "high temperature", "body ache"].some((k) => s.includes(k))
  );

  const normalized = normalizeVitalMetrics(metrics);

  if (hasResp || (normalized.spO2 !== null && normalized.spO2 < 92)) {
    return "ACUTE_RESPIRATORY_SURGE";
  }
  if (hasWaterborne) return "WATERBORNE_CLUSTER";
  if (hasFever) return "FEBRILE_ILLNESS";
  if (
    (normalized.bpSystolic !== null && (normalized.bpSystolic >= 160 || normalized.bpSystolic <= 85)) ||
    (normalized.bpDiastolic !== null && normalized.bpDiastolic >= 100) ||
    (normalized.heartRate !== null && (normalized.heartRate > 120 || normalized.heartRate < 45))
  ) {
    return "CARDIAC_ANOMALY";
  }
  if (
    (normalized.bloodSugar !== null && (normalized.bloodSugar >= 220 || normalized.bloodSugar <= 60)) ||
    (normalized.weight !== null && (normalized.weight < 25 || normalized.weight > 180))
  ) {
    return "METABOLIC_CHRONIC";
  }

  return "GENERAL_STABLE";
}

export function computeSeverityScore(metrics = {}, symptoms = [], trendFlags = []) {
  let score = 0.1; // Base normal score
  const count = (symptoms || []).length;
  score += Math.min(0.4, count * 0.1);

  const normalized = normalizeVitalMetrics(metrics);

  if (normalized.bpSystolic !== null) {
    if (normalized.bpSystolic >= 180 || normalized.bpSystolic <= 85) score += 0.45;
    else if (normalized.bpSystolic >= 140) score += 0.25;
  }

  if (normalized.bpDiastolic !== null) {
    if (normalized.bpDiastolic >= 120) score += 0.35;
    else if (normalized.bpDiastolic >= 90 && (normalized.bpSystolic ?? 120) < 140) score += 0.2;
  }

  if (normalized.bloodSugar !== null) {
    if (normalized.bloodSugar >= 280 || normalized.bloodSugar <= 50) score += 0.35;
    else if (normalized.bloodSugar >= 180 || normalized.bloodSugar < 70) score += 0.2;
  }

  if (normalized.heartRate !== null) {
    if (normalized.heartRate >= 130 || normalized.heartRate <= 40) score += 0.3;
    else if (normalized.heartRate >= 105 || normalized.heartRate < 50) score += 0.15;
  }

  if (normalized.spO2 !== null) {
    if (normalized.spO2 <= 90) score += 0.45;
    else if (normalized.spO2 < 94) score += 0.25;
  }

  if (normalized.weight !== null && (normalized.weight < 25 || normalized.weight > 180)) {
    score += 0.2;
  }

  if (Array.isArray(trendFlags) && trendFlags.length > 0) {
    const hasHighFlag = trendFlags.some((flag) => flag?.severity === "high");
    score += hasHighFlag ? 0.15 : 0.08;
  }

  return Math.min(1.0, Math.max(0.05, Number(score.toFixed(2))));
}

/**
 * Single authoritative severity classification band mapper across all hierarchical services.
 */
export function getSeverityBand(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return "LOW";
  if (numeric >= 0.75) return "CRITICAL";
  if (numeric >= 0.5) return "HIGH";
  if (numeric >= 0.3) return "MODERATE";
  return "LOW";
}

export async function transformSignalToHealthState({
  level = "household",
  nodeId,
  metrics = {},
  symptoms = [],
  trendFlags = [],
  source = "household",
  spatialScope = {},
  metadata = {},
}) {
  try {
    const normalized = normalizeVitalMetrics(metrics);
    const category = classifyClinicalCategory(normalized, symptoms);
    const severityScore = computeSeverityScore(normalized, symptoms, trendFlags);
    const severity = getSeverityBand(severityScore);

    const confidence =
      source === "diagnostic_lab"
        ? 0.95
        : source === "asha_worker"
          ? 0.8
          : metadata?.ingestionSource === "ble_device"
            ? 0.78
            : 0.65;

    const anomalyMetrics = {
      systolic: normalized.bpSystolic,
      diastolic: normalized.bpDiastolic,
      bloodSugar: normalized.bloodSugar,
      heartRate: normalized.heartRate,
      spO2: normalized.spO2,
      weight: normalized.weight,
      symptomCount: (symptoms || []).length,
      categoryIdentified: category,
    };

    const pseudonymousNodeId =
      level === "household" || level === "individual"
        ? String(nodeId || "").startsWith("HH-")
          ? String(nodeId)
          : createPseudonymousNodeId("HH", nodeId || "anonymous")
        : String(nodeId || "anonymous-node");

    // Strip any potential direct PII keys from metadata
    const safeMetadata = {
      provenance: metadata?.ingestionSource || metadata?.provenance || "api",
      transformedAt: new Date().toISOString(),
      ...(metadata?.dedupKey ? { dedupKey: metadata.dedupKey } : {}),
    };

    const safeScope = {
      pincode: spatialScope.pincode || "201306",
      ward: spatialScope.ward || "",
      district: spatialScope.district || "Gautam Buddha Nagar",
      state: spatialScope.state || "Uttar Pradesh",
      // Omit exact household GPS on household/individual tiers to protect residential location privacy
      coordinates:
        level === "household" || level === "individual"
          ? [77.4977, 28.4744]
          : spatialScope.coordinates || [77.4977, 28.4744],
    };

    if (level === "household" || level === "individual") {
      const existing = await HealthState.findOne({
        level,
        nodeId: pseudonymousNodeId,
        category,
        "spatialScope.district": safeScope.district,
        "spatialScope.pincode": safeScope.pincode,
        stateStatus: { $ne: "RESOLVED" },
      });

      if (existing) {
        existing.severityScore = severityScore;
        existing.severity = severity;
        existing.confidence = confidence;
        existing.evidenceCount = (existing.evidenceCount || 1) + 1;
        existing.anomalyMetrics = anomalyMetrics;
        existing.stateStatus = severityScore <= 0.25 ? "DE_ESCALATED" : "ACTIVE";
        existing.metadata = { ...existing.metadata, ...safeMetadata };
        return existing.save();
      }
    }

    const healthState = await HealthState.create({
      level,
      nodeId: pseudonymousNodeId,
      category,
      severity,
      severityScore,
      confidence,
      evidenceCount: 1,
      sources: [source],
      anomalyMetrics,
      spatialScope: safeScope,
      stateStatus: "ACTIVE",
      metadata: safeMetadata,
    });

    logger.info(
      { healthStateId: healthState._id, level, category, severityScore, severity },
      "Transformed raw signals into de-identified HealthState"
    );

    return healthState;
  } catch (error) {
    logger.error({ err: error.message }, "Error transforming signal to HealthState");
    throw error;
  }
}

export default {
  parseBloodPressureReading,
  normalizeVitalMetrics,
  createPseudonymousNodeId,
  classifyClinicalCategory,
  computeSeverityScore,
  getSeverityBand,
  transformSignalToHealthState,
};
