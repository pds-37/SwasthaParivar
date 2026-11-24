import test, { describe } from "node:test";
import assert from "node:assert";

import {
  classifyClinicalCategory,
  computeSeverityScore,
  getSeverityBand,
} from "../services/hierarchical/healthStateTransformer.js";
import {
  calculateConvergenceConfidence,
} from "../services/hierarchical/evidenceConvergenceEngine.js";
import {
  computeCapacityScores,
} from "../services/capacity/capacityDeficitService.js";
import {
  evaluateStateTransitionLogic,
  getNextLevelUp,
  getNextLevelDown,
} from "../services/hierarchical/stateTransitionEngine.js";
import {
  generateInterventionPlan,
} from "../services/interventions/interventionEngine.js";

describe("Hierarchical Health Intelligence & Capacity Deficit Engine Tests", () => {
  test("HealthStateTransformer correctly categorizes clinical symptoms", () => {
    const respCategory = classifyClinicalCategory({}, ["cough", "wheezing", "breathlessness"]);
    assert.strictEqual(respCategory, "ACUTE_RESPIRATORY_SURGE");

    const waterCategory = classifyClinicalCategory({}, ["severe diarrhea", "vomiting"]);
    assert.strictEqual(waterCategory, "WATERBORNE_CLUSTER");

    const cardiacCategory = classifyClinicalCategory({ bpSystolic: 175, bpDiastolic: 105 }, []);
    assert.strictEqual(cardiacCategory, "CARDIAC_ANOMALY");

    const generalCategory = classifyClinicalCategory({ bpSystolic: 120 }, []);
    assert.strictEqual(generalCategory, "GENERAL_STABLE");
  });

  test("Severity score scales appropriately and bands correctly", () => {
    const normalScore = computeSeverityScore({ bpSystolic: 120, bloodSugar: 95 }, []);
    assert.ok(normalScore <= 0.25);
    assert.strictEqual(getSeverityBand(normalScore), "LOW");

    const criticalScore = computeSeverityScore({ bpSystolic: 190, bloodSugar: 310 }, ["fever", "chest pain"]);
    assert.ok(criticalScore >= 0.75);
    assert.strictEqual(getSeverityBand(criticalScore), "CRITICAL");
  });

  test("Evidence Convergence Engine boosts confidence with diverse independent sources", () => {
    // 3 signals from household only
    const singleSourceSignals = [
      { sourceType: "household" },
      { sourceType: "household" },
      { sourceType: "household" },
    ];
    const singleConfidence = calculateConvergenceConfidence(singleSourceSignals);

    // 3 signals across distinct sources: household, asha_worker, diagnostic_lab
    const diverseSignals = [
      { sourceType: "household" },
      { sourceType: "asha_worker" },
      { sourceType: "diagnostic_lab" },
    ];
    const diverseConfidence = calculateConvergenceConfidence(diverseSignals);

    assert.ok(diverseConfidence > singleConfidence, "Multi-source evidence must achieve higher convergence confidence than single-source");
    assert.ok(diverseConfidence >= 0.7, "Convergence across lab, ASHA, and household should produce high confidence");
  });

  test("Healthcare Capacity Deficit Index calculation accounts for bed and doctor bottlenecks", () => {
    // High capacity scenario (many beds, doctors, medicine in stock)
    const healthyCapacity = computeCapacityScores({
      totalBeds: 50,
      availableBeds: 35,
      icuBedsTotal: 8,
      icuBedsAvailable: 5,
      doctorsOnDuty: 6,
      currentPatientLoad: 25,
      criticalMedicineStockIndex: 0.9,
      ambulancesAvailable: 3,
    });

    assert.ok(healthyCapacity.effectiveCapacityScore >= 0.7);
    assert.ok(healthyCapacity.capacityDeficitIndex <= 0.35);

    // Severe bottleneck scenario (overflowing patient load, bed shortage, doctor shortage)
    const stressedCapacity = computeCapacityScores({
      totalBeds: 50,
      availableBeds: 2,
      icuBedsTotal: 8,
      icuBedsAvailable: 0,
      doctorsOnDuty: 1,
      currentPatientLoad: 80,
      criticalMedicineStockIndex: 0.2,
      ambulancesAvailable: 0,
    });

    assert.ok(stressedCapacity.effectiveCapacityScore < 0.3);
    assert.ok(stressedCapacity.capacityDeficitIndex >= 0.7, "Severely constrained infrastructure must yield high deficit index");
  });

  test("State Transition Engine: Escalate, Maintain, and De-escalate logic", () => {
    // Scenario 1: Moderate anomaly with adequate capacity -> Maintain locally
    const maintainDecision = evaluateStateTransitionLogic({
      severityScore: 0.4,
      confidence: 0.3,
      capacityDeficit: 0.2,
      evidenceCount: 1,
      currentLevel: "community",
    });
    assert.strictEqual(maintainDecision.transition, "MAINTAIN");
    assert.strictEqual(maintainDecision.targetLevel, "community");

    // Scenario 2: High risk cluster paired with severe capacity deficit -> Escalate
    const escalateDecision = evaluateStateTransitionLogic({
      severityScore: 0.72,
      confidence: 0.65,
      capacityDeficit: 0.55,
      evidenceCount: 3,
      currentLevel: "community",
    });
    assert.strictEqual(escalateDecision.transition, "ESCALATE");
    assert.strictEqual(escalateDecision.targetLevel, "facility");

    // Scenario 3: Critical deficit override (>0.70) triggers direct District escalation
    const emergencyEscalate = evaluateStateTransitionLogic({
      severityScore: 0.68,
      confidence: 0.60,
      capacityDeficit: 0.78,
      evidenceCount: 2,
      currentLevel: "household",
    });
    assert.strictEqual(emergencyEscalate.transition, "ESCALATE");
    assert.strictEqual(emergencyEscalate.targetLevel, "district");

    // Scenario 4: Normalized metrics -> De-escalate
    const deescalateDecision = evaluateStateTransitionLogic({
      severityScore: 0.18,
      confidence: 0.4,
      capacityDeficit: 0.20,
      evidenceCount: 1,
      currentLevel: "district",
    });
    assert.strictEqual(deescalateDecision.transition, "DE_ESCALATE");
    assert.strictEqual(deescalateDecision.targetLevel, "facility");
  });

  test("Hierarchy step levels compute correctly", () => {
    assert.strictEqual(getNextLevelUp("household"), "community");
    assert.strictEqual(getNextLevelUp("community"), "facility");
    assert.strictEqual(getNextLevelUp("facility"), "district");
    assert.strictEqual(getNextLevelDown("district"), "facility");
    assert.strictEqual(getNextLevelDown("facility"), "community");
    assert.strictEqual(getNextLevelDown("community"), "household");
  });

  test("Intervention Engine dispatches appropriate level-specific plan", () => {
    // District level emergency intervention
    const districtPlan = generateInterventionPlan(
      { level: "district", category: "ACUTE_RESPIRATORY_SURGE", severityScore: 0.8 },
      { capacityDeficitIndex: 0.6 }
    );
    assert.strictEqual(districtPlan.interventionType, "MOBILE_CAMP_DEPLOYMENT");
    assert.strictEqual(districtPlan.priority, "EMERGENCY");
    assert.ok(districtPlan.recommendations.length >= 3);

    // Community level intervention
    const communityPlan = generateInterventionPlan(
      { level: "community", category: "FEBRILE_ILLNESS", severityScore: 0.5 },
      { capacityDeficitIndex: 0.3 }
    );
    assert.strictEqual(communityPlan.interventionType, "ASHA_FIELD_SCREENING");
    assert.ok(communityPlan.assignedRoles.includes("asha_worker"));
  });
});
