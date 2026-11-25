import test, { describe } from "node:test";
import assert from "node:assert";

import EvidenceSignal from "../models/EvidenceSignal.js";
import HealthState from "../models/HealthState.js";
import Household from "../models/householdmodel.js";
import User from "../models/user.js";
import memberHealthService from "../services/health/MemberHealthService.js";
import familyMemberService from "../services/member/FamilyMemberService.js";
import {
  classifyClinicalCategory,
  computeSeverityScore,
  createPseudonymousNodeId,
  getSeverityBand,
  normalizeVitalMetrics,
  parseBloodPressureReading,
} from "../services/hierarchical/healthStateTransformer.js";
import {
  buildSignalDedupKey,
  evaluateCommunityConvergence,
  isValidGeographicScope,
  processHouseholdVitalTelemetry,
} from "../services/hierarchical/evidenceConvergenceEngine.js";

describe("Phase 2 Individual-to-Hierarchical Privacy & Convergence Pipeline Tests", () => {
  test("Parses manual/BLE blood pressure strings and computes consistent clinical severity bands", () => {
    assert.deepStrictEqual(parseBloodPressureReading("186/114"), { systolic: 186, diastolic: 114 });

    const norm = normalizeVitalMetrics({
      bloodPressure: "186/114",
      heartRate: 122,
      spO2: 89,
      bloodSugar: 112,
      weight: 74,
    });
    assert.strictEqual(norm.bpSystolic, 186);
    assert.strictEqual(norm.spO2, 89);

    const cat = classifyClinicalCategory(norm, []);
    assert.strictEqual(cat, "ACUTE_RESPIRATORY_SURGE");

    const score = computeSeverityScore(norm, []);
    assert.strictEqual(getSeverityBand(score), "CRITICAL");
    assert.strictEqual(getSeverityBand(0.75), "CRITICAL");
    assert.strictEqual(getSeverityBand(0.5), "HIGH");
    assert.strictEqual(getSeverityBand(0.3), "MODERATE");
    assert.strictEqual(getSeverityBand(0.25), "LOW");
  });

  test("Pseudonymous node tokens strip raw IDs and signal dedup keys are deterministic", () => {
    const rawHouseholdId = "507f1f77bcf86cd799439011";
    const token1 = createPseudonymousNodeId("HH", rawHouseholdId);
    const token2 = createPseudonymousNodeId("HH", rawHouseholdId);

    assert.strictEqual(token1, token2);
    assert.ok(token1.startsWith("HH-"));
    assert.strictEqual(token1.includes(rawHouseholdId), false);

    const k1 = buildSignalDedupKey({
      householdId: rawHouseholdId,
      memberId: "507f1f77bcf86cd799439012",
      dateIso: "2026-11-25T10:00:00.000Z",
      metrics: { bloodPressure: "152/96", spO2: 92 },
    });
    const k2 = buildSignalDedupKey({
      householdId: rawHouseholdId,
      memberId: "507f1f77bcf86cd799439012",
      dateIso: "2026-11-25T10:00:00.000Z",
      metrics: { bloodPressure: "152/96", spO2: 92 },
    });
    assert.strictEqual(k1, k2);
  });

  test("Community convergence enforces district+pincode scoping and k-anonymity", async () => {
    assert.strictEqual(isValidGeographicScope({ district: "Gautam Buddha Nagar", pincode: "201306" }), true);
    assert.strictEqual(isValidGeographicScope({ district: "Gautam Buddha Nagar", pincode: "2013" }), false);

    const origSignalFind = EvidenceSignal.find;
    const origStateFindOne = HealthState.findOne;
    const origStateCreate = HealthState.create;

    try {
      // Single source (household only) with 2 signals must NOT trigger public community cluster
      EvidenceSignal.find = () => ({
        lean: async () => [
          {
            sourceType: "household",
            sourceIdentifier: "HH-111",
            category: "ACUTE_RESPIRATORY_SURGE",
            spatialScope: { district: "Gautam Buddha Nagar", pincode: "201306" },
            payload: { severityScore: 0.8 },
          },
          {
            sourceType: "household",
            sourceIdentifier: "HH-222",
            category: "ACUTE_RESPIRATORY_SURGE",
            spatialScope: { district: "Gautam Buddha Nagar", pincode: "201306" },
            payload: { severityScore: 0.8 },
          },
        ],
      });

      const singleSourceRes = await evaluateCommunityConvergence({
        district: "Gautam Buddha Nagar",
        pincode: "201306",
      });
      assert.strictEqual(singleSourceRes.converged, false);

      // Signals from another district sharing same pincode must be filtered out
      EvidenceSignal.find = () => ({
        lean: async () => [
          {
            sourceType: "household",
            sourceIdentifier: "HH-111",
            category: "CARDIAC_ANOMALY",
            spatialScope: { district: "Gautam Buddha Nagar", pincode: "201306" },
            payload: { severityScore: 0.8 },
          },
          {
            sourceType: "asha_worker",
            sourceIdentifier: "ASHA-999",
            category: "CARDIAC_ANOMALY",
            spatialScope: { district: "Other District", pincode: "201306" },
            payload: { severityScore: 0.85 },
          },
        ],
      });

      const crossDistrictRes = await evaluateCommunityConvergence({
        district: "Gautam Buddha Nagar",
        pincode: "201306",
      });
      assert.strictEqual(crossDistrictRes.converged, false);
      assert.strictEqual(crossDistrictRes.totalSignalsEvaluated, 1);

      // Valid multi-source convergence in matching district+pincode produces CRITICAL band
      let createdState = null;
      EvidenceSignal.find = () => ({
        lean: async () => [
          {
            sourceType: "household",
            sourceIdentifier: "HH-111",
            category: "ACUTE_RESPIRATORY_SURGE",
            spatialScope: { district: "Gautam Buddha Nagar", pincode: "201306" },
            payload: { severityScore: 0.82 },
          },
          {
            sourceType: "diagnostic_lab",
            sourceIdentifier: "LAB-444",
            category: "ACUTE_RESPIRATORY_SURGE",
            spatialScope: { district: "gautam buddha nagar", pincode: "201306" },
            payload: { severityScore: 0.88 },
          },
        ],
      });
      HealthState.findOne = async () => null;
      HealthState.create = async (doc) => {
        createdState = { ...doc, _id: "state-1" };
        return createdState;
      };

      const validRes = await evaluateCommunityConvergence({
        district: "Gautam Buddha Nagar",
        pincode: "201306",
      });
      assert.strictEqual(validRes.converged, true);
      assert.strictEqual(createdState.severity, "CRITICAL");
      assert.strictEqual(createdState.metadata.uniqueSourceIdentifiers, 2);
    } finally {
      EvidenceSignal.find = origSignalFind;
      HealthState.findOne = origStateFindOne;
      HealthState.create = origStateCreate;
    }
  });

  test("Telemetry emission retries idempotently and isolates personal vital save on DB error", async () => {
    const origFindOne = EvidenceSignal.findOne;
    const origCreateSignal = EvidenceSignal.create;
    const origFindState = HealthState.findOne;
    const origCreateState = HealthState.create;
    const origFindOwned = familyMemberService.findOwnedMember;
    const origHouseholdFind = Household.findById;
    const origUserFindById = User.findById;

    try {
      // 1. Retries transient failure once and creates de-identified signal without PII
      let createCalls = 0;
      let capturedSignal = null;
      EvidenceSignal.findOne = async () => null;
      EvidenceSignal.create = async (doc) => {
        createCalls += 1;
        if (createCalls === 1) throw new Error("Transient connection drop");
        capturedSignal = { ...doc, _id: "sig-1" };
        return capturedSignal;
      };
      HealthState.findOne = async () => null;
      HealthState.create = async (doc) => ({ ...doc, _id: "hs-1" });

      const outcome = await processHouseholdVitalTelemetry({
        member: {
          _id: "507f1f77bcf86cd799439020",
          name: "Priya Sensitive Name",
          householdId: "507f1f77bcf86cd799439021",
          health: {},
        },
        household: {
          _id: "507f1f77bcf86cd799439021",
          location: { state: "Uttar Pradesh", district: "Gautam Buddha Nagar", pincode: "201306" },
        },
        snapshot: {
          date: "2026-11-25T10:30:00.000Z",
          bloodPressure: "188/112",
          spO2: 88,
          source: "ble_device",
        },
        maxRetries: 2,
      });

      assert.strictEqual(outcome.status, "EMITTED");
      assert.strictEqual(createCalls, 2);
      assert.ok(capturedSignal.dedupKey);
      assert.strictEqual(JSON.stringify(capturedSignal).includes("Priya"), false);
      assert.strictEqual(capturedSignal.provenance.ingestionSource, "ble_device");

      // 2. MemberHealthService.create preserves personal record even when downstream signal save fails completely
      const fakeMember = {
        _id: "507f1f77bcf86cd799439020",
        householdId: "507f1f77bcf86cd799439021",
        name: "Ramesh Kumar",
        health: {},
        markModified() {},
        async save() {
          return this;
        },
        toObject() {
          return { _id: this._id, householdId: this.householdId, name: this.name, health: this.health };
        },
      };
      familyMemberService.findOwnedMember = async () => ({ member: fakeMember });
      User.findById = () => ({ select: async () => null });
      Household.findById = () => ({
        select: () => ({
          lean: async () => ({
            _id: "507f1f77bcf86cd799439021",
            location: { state: "Uttar Pradesh", district: "Gautam Buddha Nagar", pincode: "201306" },
          }),
        }),
      });
      EvidenceSignal.create = async () => {
        throw new Error("Persistent telemetry outage");
      };

      const saveRes = await memberHealthService.create("507f1f77bcf86cd799439099", fakeMember._id, {
        date: "2026-11-25T11:00:00.000Z",
        bloodPressure: "178/108",
        spO2: 91,
        source: "ble_device",
      });

      assert.strictEqual(saveRes.status, 201);
      assert.strictEqual(saveRes.data.member.health.spO2[0].value, 91);
      assert.strictEqual(saveRes.data.member.health.spO2[0].source, "ble_device");
      assert.strictEqual(saveRes.data.telemetryStatus, "FAILED_ISOLATED");
    } finally {
      EvidenceSignal.findOne = origFindOne;
      EvidenceSignal.create = origCreateSignal;
      HealthState.findOne = origFindState;
      HealthState.create = origCreateState;
      familyMemberService.findOwnedMember = origFindOwned;
      Household.findById = origHouseholdFind;
      User.findById = origUserFindById;
    }
  });
});
