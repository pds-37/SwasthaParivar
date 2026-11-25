import test, { describe } from "node:test";
import assert from "node:assert";

import { extractFeatures, requestMlPrediction } from "../services/ml/mlInferenceClient.js";

describe("Phase 7 ML Inference Client Feature & Fallback Tests", () => {
  test("extractFeatures parses string BP snapshots and clamps biological bounds", () => {
    const features = extractFeatures(
      { age: 58, height: 170, conditions: ["hypertension"], medications: ["amlodipine", "metformin"] },
      { bloodPressure: "154/96", heartRate: 88, bloodSugar: 164, weight: 78, sleep: 6 }
    );

    assert.strictEqual(features.bp_systolic_mean_14d, 154);
    assert.strictEqual(features.bp_diastolic_mean_14d, 96);
    assert.strictEqual(features.bp_pulse_pressure, 58);
    assert.strictEqual(features.glucose_fasting_last, 164);
    assert.strictEqual(features.heart_rate_resting_mean_14d, 88);
    assert.strictEqual(features.sleep_hours_mean_7d, 6);
    assert.strictEqual(Object.keys(features).length, 17);
  });

  test("requestMlPrediction gracefully falls back on timeout and 503 without throwing", async () => {
    const audits = [];
    const mockAuditModel = {
      async create(doc) {
        audits.push(doc);
        return doc;
      },
    };

    const timeoutClient = {
      async post() {
        const err = new Error("timeout of 120ms exceeded");
        err.code = "ECONNABORTED";
        throw err;
      },
    };

    const resTimeout = await requestMlPrediction(
      { memberId: "507f1f77bcf86cd799439011", member: { age: 50 }, latestVitals: { bloodPressure: "130/80" } },
      { client: timeoutClient, auditModel: mockAuditModel }
    );
    assert.strictEqual(resTimeout.mlAvailable, false);
    assert.strictEqual(resTimeout.prediction, "MODEL_NOT_READY");
    assert.strictEqual(audits.length, 1);
    assert.strictEqual(audits[0].userId, null);

    const readyClient = {
      async post() {
        return {
          status: 200,
          data: {
            modelVersion: "v2.6.0-production-leak-free-audited",
            primaryPrediction: { riskLevel: "MEDIUM_RISK", modelName: "RF" },
            benchmarkValidation: { calibratedProbability: 0.61, isConcordantWithPrimary: true },
            explainableDecision: { decisionPath: ["bp_systolic_mean_14d > 140", "OUTCOME_CLASSIFIED: MEDIUM_RISK"] },
            inferenceTimeMs: 9.5,
          },
        };
      },
    };

    const resOk = await requestMlPrediction(
      { userId: "507f1f77bcf86cd799439022", memberId: "507f1f77bcf86cd799439011", member: { age: 50 }, latestVitals: {} },
      { client: readyClient, auditModel: mockAuditModel }
    );
    assert.strictEqual(resOk.mlAvailable, true);
    assert.strictEqual(resOk.prediction, "MEDIUM_RISK");
    assert.strictEqual(resOk.probability, 0.61);
    assert.strictEqual(audits.length, 2);
  });
});
