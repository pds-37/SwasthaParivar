import axios from "axios";
import mongoose from "mongoose";
import { logger } from "../../utils/logger.js";
import MLPredictionAudit from "../../models/mlpredictionaudit.js";
import { parseBloodPressureReading } from "../hierarchical/healthStateTransformer.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const RAW_TIMEOUT_MS = Number(process.env.ML_INFERENCE_TIMEOUT_MS || 120);
const INFERENCE_TIMEOUT_MS = Number.isFinite(RAW_TIMEOUT_MS)
  ? Math.min(2000, Math.max(50, RAW_TIMEOUT_MS))
  : 120;
const MAX_RETRIES = 1;

const mlApiClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: INFERENCE_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    "X-Client-Service": "SwasthaParivar-Node-Backend",
  },
});

/**
 * Extracts and sanitizes the 17 canonical UCI-mapped physiological features.
 * Clamps metrics to biological plausibility ranges and parses string BP snapshots.
 * Note: spO2 is intentionally excluded here because the trained .joblib models
 * use the frozen 17-feature schema; SpO2 is evaluated by deterministic rules.
 */
export function extractFeatures(member = {}, latestVitals = {}) {
  const age = Number(member?.age || 45);
  const weight = Number(latestVitals?.weight || member?.weight || 72);
  const heightM = Number(member?.height || 170) / 100.0;
  const bmi = heightM > 0 ? Number((weight / (heightM * heightM)).toFixed(1)) : 24.9;

  const parsedBp = parseBloodPressureReading(latestVitals?.bloodPressure);
  const rawSystolic = Number(
    latestVitals?.systolic ?? latestVitals?.bpSystolic ?? parsedBp.systolic ?? 128
  );
  const rawDiastolic = Number(
    latestVitals?.diastolic ?? latestVitals?.bpDiastolic ?? parsedBp.diastolic ?? 82
  );
  const systolic = Number.isFinite(rawSystolic) ? rawSystolic : 128;
  const diastolic = Number.isFinite(rawDiastolic) ? rawDiastolic : 82;
  const pulsePressure = Math.max(10, systolic - diastolic);

  const rawGlucose = Number(latestVitals?.bloodSugar ?? latestVitals?.glucose ?? 110);
  const glucose = Number.isFinite(rawGlucose) ? rawGlucose : 110;
  const rawHr = Number(latestVitals?.heartRate ?? latestVitals?.pulse ?? 74);
  const heartRate = Number.isFinite(rawHr) ? rawHr : 74;
  const rawSleep = Number(latestVitals?.sleepHours ?? latestVitals?.sleep ?? 7.2);
  const sleepHours = Number.isFinite(rawSleep) ? rawSleep : 7.2;

  const conditions = Array.isArray(member?.conditions) ? member.conditions.length : 0;
  const meds = Array.isArray(member?.medications) ? member.medications.length : 1;
  const adherence = Number(member?.medicationAdherence ?? 0.88);

  const activityIdx = String(member?.activityLevel || "").toLowerCase().includes("active") ? 2 : 1;
  const smokingFlag = String(member?.smokingStatus || "").toLowerCase().includes("smok") ? 1 : 0;
  const alcoholIdx = String(member?.alcohol || "").toLowerCase().includes("heavy") ? 2 : 0;
  const familyHist = Array.isArray(member?.familyHistory) && member.familyHistory.length > 0 ? 1 : 0;

  return {
    age_years: Math.max(1, Math.min(115, age)),
    bmi_score: Math.max(12.0, Math.min(65.0, bmi)),
    bp_systolic_mean_14d: Math.max(70.0, Math.min(260.0, systolic)),
    bp_diastolic_mean_14d: Math.max(40.0, Math.min(160.0, diastolic)),
    bp_pulse_pressure: Math.max(10.0, Math.min(150.0, pulsePressure)),
    glucose_fasting_last: Math.max(40.0, Math.min(600.0, glucose)),
    heart_rate_resting_mean_14d: Math.max(35.0, Math.min(220.0, heartRate)),
    sleep_hours_mean_7d: Math.max(2.0, Math.min(16.0, sleepHours)),
    chronic_disease_count: Math.max(0, Math.min(15, conditions)),
    medication_active_count: Math.max(0, Math.min(25, meds)),
    medication_adherence_rate_30d: Math.max(0.0, Math.min(1.0, adherence)),
    previous_alerts_90d_count: Math.max(0, Math.min(50, Number(member?.previousAlertsCount || 0))),
    emergency_episode_count_180d: Math.max(0, Math.min(20, Number(member?.emergencyEpisodesCount || 0))),
    activity_level_idx: Math.max(0, Math.min(3, activityIdx)),
    smoking_status_flag: smokingFlag,
    alcohol_consumption_idx: Math.max(0, Math.min(2, alcoholIdx)),
    has_cardiac_family_history: familyHist,
  };
}

export async function checkMlServiceHealth(client = mlApiClient) {
  try {
    const res = await client.get("/health", { timeout: 1000 });
    return res.status === 200 && res.data?.status === "UP";
  } catch (error) {
    logger.warn({ err: error.message }, "FastAPI ML service health probe unreachable or unhealthy");
    return false;
  }
}

export async function requestMlPrediction(
  { userId, memberId, member, latestVitals },
  { client = mlApiClient, auditModel = MLPredictionAudit } = {}
) {
  const startTime = Date.now();
  const features = extractFeatures(member, latestVitals);

  const auditRecordId = new mongoose.Types.ObjectId();
  const resolvedPatientId = memberId || member?._id || "anonymous";
  const resolvedUserId =
    userId && mongoose.Types.ObjectId.isValid(String(userId)) ? userId : null;

  const payload = {
    memberId: String(resolvedPatientId),
    features,
  };

  let attempt = 0;
  let responseData = null;
  let lastError = null;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await client.post("/api/v1/predict", payload);
      if (response.status === 200 && response.data) {
        responseData = response.data;
        break;
      }
    } catch (error) {
      lastError = error;
      attempt += 1;

      if (
        error?.response?.status === 503 ||
        error?.response?.status === 422 ||
        error?.response?.status === 400
      ) {
        break;
      }

      if (attempt <= MAX_RETRIES) {
        logger.info(
          { attempt, timeout: INFERENCE_TIMEOUT_MS },
          "Transient latency/network error to ML engine. Retrying once..."
        );
      }
    }
  }

  const durationMs = Date.now() - startTime;

  if (!responseData) {
    const errorReason =
      lastError?.response?.status === 503
        ? "MODEL_NOT_READY_503"
        : lastError?.code || lastError?.message || "INFERENCE_TIMEOUT_OR_UNREACHABLE";

    logger.warn(
      {
        durationMs,
        errorReason,
        patientId: resolvedPatientId,
      },
      "FastAPI ML Engine unavailable - gracefully falling back to deterministic Clinical Rules Engine"
    );

    const fallbackResponse = {
      mlAvailable: false,
      auditRecordId,
      prediction: "MODEL_NOT_READY",
      probability: 0.0,
      decisionPath: [
        "ML engine offline or warming up - safety fallback to deterministic Clinical Rules Engine active.",
      ],
      inferenceTimeMs: durationMs,
      modelVersion: "offline-fallback-v1",
      featuresUsed: features,
      clinicalDisclaimer:
        "Decision-support indicator unavailable; deterministic Clinical Rules Engine remains active.",
    };

    try {
      await auditModel.create({
        _id: auditRecordId,
        patientId: resolvedPatientId,
        userId: resolvedUserId,
        prediction: "MODEL_NOT_READY",
        probability: 0.0,
        decisionPath: fallbackResponse.decisionPath,
        inferenceTimeMs: durationMs,
        modelVersion: fallbackResponse.modelVersion,
        clinicalOverrideStatus: "NOT_APPLICABLE",
        rawFeatureVector: features,
        errorMessage: errorReason,
      });
    } catch (e) {
      logger.error({ err: e?.message, auditRecordId }, "Failed to persist offline ML prediction audit record");
    }

    return fallbackResponse;
  }

  const successfulResponse = {
    mlAvailable: true,
    auditRecordId,
    prediction:
      responseData?.primaryPrediction?.riskLevel ||
      responseData?.random_forest_prediction ||
      "MEDIUM_RISK",
    probability:
      typeof responseData?.benchmarkValidation?.calibratedProbability === "number"
        ? responseData.benchmarkValidation.calibratedProbability
        : typeof responseData?.logistic_probability === "number"
          ? responseData.logistic_probability
          : 0.0,
    decisionPath: Array.isArray(responseData?.explainableDecision?.decisionPath)
      ? responseData.explainableDecision.decisionPath
      : Array.isArray(responseData?.decision_tree_path)
        ? responseData.decision_tree_path
        : ["No rule path extracted."],
    inferenceTimeMs:
      typeof responseData?.inferenceTimeMs === "number" ? responseData.inferenceTimeMs : durationMs,
    modelVersion:
      responseData?.modelVersion ||
      responseData?.primaryPrediction?.modelName ||
      "v2.6.0-production-leak-free-audited",
    isConcordant: Boolean(responseData?.benchmarkValidation?.isConcordantWithPrimary ?? true),
    featuresUsed: features,
    clinicalDisclaimer:
      responseData?.clinicalDisclaimer ||
      "Decision-support score only; deterministic Clinical Rules Engine retains final triage authority.",
  };

  try {
    await auditModel.create({
      _id: auditRecordId,
      patientId: resolvedPatientId,
      userId: resolvedUserId,
      prediction: successfulResponse.prediction,
      probability: successfulResponse.probability,
      decisionPath: successfulResponse.decisionPath,
      inferenceTimeMs: successfulResponse.inferenceTimeMs,
      modelVersion: successfulResponse.modelVersion,
      clinicalOverrideStatus: "ACCEPTED",
      rawFeatureVector: features,
      errorMessage: null,
    });
  } catch (e) {
    logger.error({ err: e?.message, auditRecordId }, "Failed to persist ML prediction audit record");
  }

  return successfulResponse;
}

export default {
  extractFeatures,
  checkMlServiceHealth,
  requestMlPrediction,
};
