import test, { describe } from "node:test";
import assert from "node:assert";

import familyMemberService, { HEALTH_METRICS } from "../services/member/FamilyMemberService.js";
import { healthRecordSchema } from "../validations/healthSchemas.js";
import { buildHealthTrends } from "../services/health/healthTrendService.js";
import { classifyClinicalCategory, computeSeverityScore } from "../services/hierarchical/healthStateTransformer.js";

describe("BLE Health Snapshot Validation & Telemetry Tests", () => {
  test("healthRecordSchema accepts spO2 and BLE source tags while preserving them", () => {
    const parsed = healthRecordSchema.safeParse({
      date: "2026-11-25T10:30:00.000Z",
      bloodPressure: "124/82",
      heartRate: 76,
      spO2: 98,
      bloodSugar: 108,
      source: "ble_device",
    });

    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.data.spO2, 98);
    assert.strictEqual(parsed.data.source, "ble_device");

    const invalidSpO2 = healthRecordSchema.safeParse({
      date: "2026-11-25T10:30:00.000Z",
      spO2: 125,
    });
    assert.strictEqual(invalidSpO2.success, false);
  });

  test("FamilyMemberService preserves source tags across snapshot merges and serialization", () => {
    assert.ok(HEALTH_METRICS.includes("spO2"));

    const bleDate = "2026-11-25T08:00:00.000Z";
    const manualDate = "2026-11-25T12:00:00.000Z";

    const bleSnapshot = familyMemberService.sanitizeSnapshotPayload({
      date: bleDate,
      bloodPressure: "122/78",
      heartRate: 74,
      spO2: 97,
      source: "ble_device",
    });
    assert.ok(!bleSnapshot.error);

    const afterBle = familyMemberService.mergeSnapshotIntoHealth({}, bleSnapshot.data);
    assert.strictEqual(afterBle.bloodPressure[0].source, "ble_device");
    assert.strictEqual(afterBle.heartRate[0].source, "ble_device");
    assert.strictEqual(afterBle.spO2[0].source, "ble_device");

    const manualSnapshot = familyMemberService.sanitizeSnapshotPayload({
      date: manualDate,
      weight: 70.5,
      source: "manual",
    });
    assert.ok(!manualSnapshot.error);

    // Ensure merging a later manual snapshot preserves prior BLE source metadata
    const afterManual = familyMemberService.mergeSnapshotIntoHealth(afterBle, manualSnapshot.data);
    assert.strictEqual(afterManual.spO2[0].source, "ble_device");
    assert.strictEqual(afterManual.weight[0].source, "manual");

    const timeline = familyMemberService.buildSnapshotTimeline({ health: afterManual });
    assert.strictEqual(timeline.length, 2);
    assert.strictEqual(timeline[0].source, "manual");
    assert.strictEqual(timeline[1].source, "ble_device");
    assert.strictEqual(timeline[1].spO2, 97);
  });

  test("SpO2 integrates cleanly with healthTrendService and HealthStateTransformer", () => {
    const trends = buildHealthTrends({
      health: {
        spO2: [
          { value: 98, date: "2026-11-24T10:00:00.000Z", source: "ble_device" },
          { value: 88, date: "2026-11-25T10:00:00.000Z", source: "ble_device" },
        ],
      },
    });

    assert.ok(trends.flags.some((f) => f.metric === "spO2" && f.severity === "high"));
    assert.strictEqual(classifyClinicalCategory({ spO2: 89 }, []), "ACUTE_RESPIRATORY_SURGE");
    assert.ok(computeSeverityScore({ spO2: 89 }, []) >= 0.5);
  });
});
