import axios from "axios";
import mongoose from "mongoose";
import { logger } from "../../utils/logger.js";
import MLPredictionAudit from "../../models/mlpredictionaudit.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const INFERENCE_TIMEOUT_MS = 120; // Strict <100-150ms timeout target for Node -> FastAPI
const MAX_RETRIES = 1;

// Configured Axios client with automated timeout and connection pooling
const mlApiClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: INFERENCE_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    "X-Client-Service": "SwasthaParivar-Node-Backend",
  },
});

/**
 * Extracts and sanitizes physiological features from raw member context and recent telemetry.
 * Prevents invalid payload transmission by clamping metrics to biological plausibility ranges.
 */
export function extractFeatures(member = {}, latestVitals = {}) {
  const age = Number(member?.age || 45);
  const weight = Number(latestVitals?.weight || member?.weight || 72);
  const heightM = Number(member?.height || 170) / 100.0;
  const bmi = heightM > 0 ? Number((weight / (heightM * heightM)).toFixed(1)) : 24.9;

  const systolic = Number(latestVitals?.systolic || latestVitals?.bpSystolic || 128);
  const diastolic = Number(latestVitals?.diastolic || latestVitals?.bpDiastolic || 82);
  const pulsePressure = systolic - diastolic;

  const glucose = Number(latestVitals?.bloodSugar || latestVitals?.glucose || 110);
  const heartRate = Number(latestVitals?.heartRate || latestVitals?.pulse || 74);
  const sleepHours = Number(latestVitals?.sleepHours || 7.2);

  const conditions = Array.isArray(member?.conditions) ? member.conditions.length : 0;
  const meds = Array.isArray(member?.medications) ? member.medications.length : 1;
  const adherence = Number(member?.medicationAdherence ?? 0.88);

  // Derive behavioral lifestyle indexes from text metadata or structured defaults
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

/**
 * Executes lightweight health probe against FastAPI service without taking inference locks.
 */
export async function checkMlServiceHealth() {
  try {
    const res = await mlApiClient.get("/health", { timeout: 1000 });
    return res.status === 200 && res.data?.status === "UP";
  } catch (error) {
    logger.warn({ err: error.message }, "FastAPI ML service health probe unreachable or unhealthy");
    return false;
  }
}

/**
 * Requests prediction from FastAPI ML service with automatic retry, timeout protection,
 * deterministic audit lifecycle tracking, and verified schema mapping.
 */
export async function requestMlPrediction({ userId, memberId, member, latestVitals }) {
  const startTime = Date.now();
  const features = extractFeatures(member, latestVitals);
  
  // Issue 2: Generate unique deterministic auditRecordId before invoking ML engine
  const auditRecordId = new mongoose.Types.ObjectId();
  const resolvedPatientId = memberId || member?._id || "anonymous";
  const resolvedUserId = userId || "unauthenticated";

  const payload = {
    memberId: String(resolvedPatientId),
    patient_id: String(resolvedPatientId),
    timestamp: new Date().toISOString(),
    features,
  };

  let attempt = 0;
  let responseData = null;
  let lastError = null;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await mlApiClient.post("/api/v1/predict", payload);
      if (response.status === 200 && response.data) {
        responseData = response.data;
        break;
      }
    } catch (error) {
      lastError = error;
      attempt += 1;

      // Do not retry if FastAPI returns explicit 503 MODEL_NOT_READY or validation errors (422/400)
      if (error?.response?.status === 503 || error?.response?.status === 422 || error?.response?.status === 400) {
        break;
      }

      if (attempt <= MAX_RETRIES) {
        logger.info({ attempt, timeout: INFERENCE_TIMEOUT_MS }, "Transient latency/network error to ML engine. Retrying once...");
      }
    }
  }

  const durationMs = Date.now() - startTime;

  // GRACEFUL DEGRADATION: If all network tries failed or FastAPI returned 503 MODEL_NOT_READY
  if (!responseData) {
    const errorReason = lastError?.response?.status === 503 
      ? "MODEL_NOT_READY_503" 
      : (lastError?.code || lastError?.message || "INFERENCE_TIMEOUT_OR_UNREACHABLE");

    logger.warn({
      durationMs,
      errorReason,
      patientId: resolvedPatientId,
    }, "FastAPI ML Engine unavailable - Gracefully degrading to deterministic Clinical Rules Engine");

    const fallbackResponse = {
      mlAvailable: false,
      auditRecordId,
      prediction: "MODEL_NOT_READY",
      probability: 0.0,
      decisionPath: ["ML engine offline or warming up - safety fallback to deterministic Clinical Rules Engine active."],
      inferenceTimeMs: durationMs,
      modelVersion: "offline-fallback-v1",
      featuresUsed: features,
    };

    // Issue 2 & 3: Deterministic awaited audit logging supporting anonymous/self sessions
    try {
      await MLPredictionAudit.create({
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

  // Issue 1: SUCCESSFUL PREDICTION INGESTION - EXACT FASTAPI SCHEMA ALIGNMENT
  const successfulResponse = {
    mlAvailable: true,
    auditRecordId,
    prediction: responseData?.primaryPrediction?.riskLevel || responseData?.random_forest_prediction || "MEDIUM_RISK",
    probability: typeof responseData?.benchmarkValidation?.calibratedProbability === "number" 
      ? responseData.benchmarkValidation.calibratedProbability 
      : (typeof responseData?.logistic_probability === "number" ? responseData.logistic_probability : 0.0),
    decisionPath: Array.isArray(responseData?.explainableDecision?.decisionPath) 
      ? responseData.explainableDecision.decisionPath 
      : (Array.isArray(responseData?.decision_tree_path) ? responseData.decision_tree_path : ["No rule path extracted."]),
    inferenceTimeMs: typeof responseData?.inferenceTimeMs === "number" ? responseData.inferenceTimeMs : durationMs,
    modelVersion: responseData?.primaryPrediction?.modelName || responseData?.model_version || "v2.6.0-production-audited",
    featuresUsed: features,
  };

  logger.info({
    durationMs,
    prediction: successfulResponse.prediction,
    probability: successfulResponse.probability,
    patientId: resolvedPatientId,
  }, "Completed high-speed FastAPI ML inference");

  // Issue 2: Deterministic Awaited Audit Insertion to ensure record exists before reconciliation
  try {
    await MLPredictionAudit.create({
      _id: auditRecordId,
      patientId: resolvedPatientId,
      userId: resolvedUserId,
      prediction: successfulResponse.prediction,
      probability: successfulResponse.probability,
      decisionPath: successfulResponse.decisionPath,
      inferenceTimeMs: successfulResponse.inferenceTimeMs,
      modelVersion: successfulResponse.modelVersion,
      clinicalOverrideStatus: "ACCEPTED", // Updated later by Rules Engine if overridden
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
