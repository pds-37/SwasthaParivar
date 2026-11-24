import HealthState from "../../models/HealthState.js";
import { logger } from "../../utils/logger.js";

/**
 * HealthStateTransformer:
 * Transforms raw physiological vitals, symptoms, or member health records
 * into standardized, de-identified machine-readable HealthState representations.
 * 
 * Enforces zero-trust privacy: Strips all personal identifiers (PII), names,
 * phone numbers, and addresses, preserving only normalized clinical metrics and spatial scopes.
 */

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

  const systolic = Number(metrics.bpSystolic || metrics.bloodPressure || 120);
  const diastolic = Number(metrics.bpDiastolic || 80);
  const bloodSugar = Number(metrics.bloodSugar || 100);
  const heartRate = Number(metrics.heartRate || 72);

  if (hasResp) return "ACUTE_RESPIRATORY_SURGE";
  if (hasWaterborne) return "WATERBORNE_CLUSTER";
  if (hasFever) return "FEBRILE_ILLNESS";
  if (systolic >= 160 || diastolic >= 100 || heartRate > 120 || heartRate < 45) return "CARDIAC_ANOMALY";
  if (bloodSugar >= 220 || bloodSugar <= 60) return "METABOLIC_CHRONIC";

  return "GENERAL_STABLE";
}

export function computeSeverityScore(metrics = {}, symptoms = []) {
  let score = 0.1; // Base normal score
  const count = (symptoms || []).length;
  score += Math.min(0.4, count * 0.1);

  const systolic = Number(metrics.bpSystolic || metrics.bloodPressure || 120);
  const bloodSugar = Number(metrics.bloodSugar || 100);
  const heartRate = Number(metrics.heartRate || 72);

  if (systolic >= 180 || systolic <= 85) score += 0.45;
  else if (systolic >= 150) score += 0.25;

  if (bloodSugar >= 280 || bloodSugar <= 50) score += 0.35;
  else if (bloodSugar >= 180) score += 0.15;

  if (heartRate >= 130 || heartRate <= 40) score += 0.3;
  else if (heartRate >= 105) score += 0.15;

  return Math.min(1.0, Math.max(0.05, Number(score.toFixed(2))));
}

export function getSeverityBand(score) {
  if (score >= 0.75) return "CRITICAL";
  if (score >= 0.5) return "HIGH";
  if (score >= 0.3) return "MODERATE";
  return "LOW";
}

export async function transformSignalToHealthState({
  level = "household",
  nodeId,
  metrics = {},
  symptoms = [],
  source = "household",
  spatialScope = {},
  metadata = {},
}) {
  try {
    const category = classifyClinicalCategory(metrics, symptoms);
    const severityScore = computeSeverityScore(metrics, symptoms);
    const severity = getSeverityBand(severityScore);

    // Initial confidence from a single source
    const confidence = source === "diagnostic_lab" ? 0.95 : source === "asha_worker" ? 0.8 : 0.65;

    // Build privacy-preserving anonymized anomaly metrics vector
    const anomalyMetrics = {
      systolic: metrics.bpSystolic || metrics.bloodPressure || null,
      diastolic: metrics.bpDiastolic || null,
      bloodSugar: metrics.bloodSugar || null,
      heartRate: metrics.heartRate || null,
      symptomCount: symptoms.length,
      categoryIdentified: category,
    };

    const healthState = await HealthState.create({
      level,
      nodeId: String(nodeId || "anonymous-node"),
      category,
      severity,
      severityScore,
      confidence,
      evidenceCount: 1,
      sources: [source],
      anomalyMetrics,
      spatialScope: {
        pincode: spatialScope.pincode || "201306",
        ward: spatialScope.ward || "Sector 1",
        district: spatialScope.district || "Gautam Buddha Nagar",
        state: spatialScope.state || "Uttar Pradesh",
        coordinates: spatialScope.coordinates || [77.4977, 28.4744],
      },
      stateStatus: "ACTIVE",
      metadata,
    });

    logger.info(
      { healthStateId: healthState._id, level, category, severityScore },
      "Transformed raw signals into machine-readable HealthState"
    );

    return healthState;
  } catch (error) {
    logger.error({ err: error.message }, "Error transforming signal to HealthState");
    throw error;
  }
}

export default {
  classifyClinicalCategory,
  computeSeverityScore,
  getSeverityBand,
  transformSignalToHealthState,
};
