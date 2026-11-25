import test, { describe } from "node:test";
import assert from "node:assert";

import { ROLES } from "../config/roles.js";
import User from "../models/user.js";
import FamilyMember from "../models/familymembermodel.js";
import Reminder from "../models/remindermodel.js";
import AIInsight from "../models/aiinsightmodel.js";
import Intervention from "../models/Intervention.js";
import {
  generateInterventionPlan,
  selectAuthorizedRecipients,
} from "../services/interventions/interventionEngine.js";
import { evaluateInterventionFeedback } from "../services/interventions/closedLoopFeedbackService.js";
import { getNextLevelDown, getNextLevelUp } from "../services/hierarchical/stateTransitionEngine.js";
import {
  deduplicateSubscriptions,
  isValidPushSubscription,
  sendPush,
} from "../controllers/notificationController.js";
import { generateDigest } from "../jobs/weeklyDigest.js";
import { runTrendAlerts } from "../jobs/trendAlerts.js";
import {
  computeNextRun as cronComputeNext,
  startReminderScheduler as cronStart,
} from "../utils/reminderCron.js";
import {
  computeNextRun as shimComputeNext,
  startReminderScheduler as shimStart,
} from "../utils/reminderScheduler.js";

describe("Phase 4, 5 & 6 Role Reconciliation, Severity Labels & Push Notification Tests", () => {
  test("Intervention plans assign only canonical User roles and scope-restricted recipients", () => {
    for (const level of ["household", "community", "facility", "district", "state"]) {
      const plan = generateInterventionPlan({
        level,
        category: "FEBRILE_ILLNESS",
        severityScore: 0.65,
        spatialScope: { district: "Gautam Buddha Nagar", pincode: "201306", state: "Uttar Pradesh" },
      });
      assert.ok(plan.assignedRoles.length >= 1);
      for (const role of plan.assignedRoles) {
        assert.ok(ROLES.includes(role), `Unexpected non-canonical role: ${role}`);
      }
    }

    const candidates = [
      {
        _id: "u1",
        role: "asha_worker",
        assignedScope: { state: "Uttar Pradesh", district: "Gautam Buddha Nagar", pincode: "201306" },
        pushSubscriptions: [{ endpoint: "https://push.example/1", keys: { auth: "a", p256dh: "p" } }],
      },
      {
        _id: "u2",
        role: "asha_worker",
        assignedScope: { state: "Uttar Pradesh", district: "Gautam Buddha Nagar", pincode: "201308" },
        pushSubscriptions: [{ endpoint: "https://push.example/2", keys: { auth: "a", p256dh: "p" } }],
      },
      {
        _id: "u3",
        role: "district_officer",
        assignedScope: { state: "Uttar Pradesh", district: "Ghaziabad" },
        pushSubscriptions: [{ endpoint: "https://push.example/3", keys: { auth: "a", p256dh: "p" } }],
      },
      {
        _id: "u4",
        role: "district_officer",
        assignedScope: { state: "Uttar Pradesh", district: "Gautam Buddha Nagar" },
        preferences: { notificationsEnabled: false },
        pushSubscriptions: [{ endpoint: "https://push.example/4", keys: { auth: "a", p256dh: "p" } }],
      },
      {
        _id: "u5",
        role: "user",
        pushSubscriptions: [{ endpoint: "https://push.example/5", keys: { auth: "a", p256dh: "p" } }],
      },
    ];

    const selected = selectAuthorizedRecipients(
      candidates,
      { state: "Uttar Pradesh", district: "Gautam Buddha Nagar", pincode: "201306" },
      ["asha_worker", "district_officer", "user"]
    );
    assert.deepStrictEqual(selected.map((u) => u._id), ["u1"]);
  });

  test("Closed-loop feedback updates severity label alongside severityScore and appends history", async () => {
    const origFindById = Intervention.findById;

    try {
      const mockHealthState = {
        _id: "hs-1",
        level: "district",
        severityScore: 0.85,
        severity: "CRITICAL",
        stateStatus: "ESCALATED",
        metadata: {},
        async save() {
          return this;
        },
      };

      const mockIntervention = {
        _id: "int-1",
        healthStateId: mockHealthState,
        status: "DISPATCHED",
        async save() {
          return this;
        },
      };

      Intervention.findById = () => ({
        populate: async () => mockIntervention,
      });

      // Recovery: 0.85 -> 0.18 (delta -0.67 <= -0.15) should set severity to LOW and step down level
      const resRecovery = await evaluateInterventionFeedback("int-1", { observedSeverity: 0.18 });
      assert.strictEqual(resRecovery.feedback.outcome, "IMPROVED");
      assert.strictEqual(mockHealthState.severityScore, 0.18);
      assert.strictEqual(mockHealthState.severity, "LOW");
      assert.strictEqual(mockHealthState.level, getNextLevelDown("district"));
      assert.strictEqual(mockHealthState.metadata.transitionHistory.length, 1);

      // Deterioration: 0.18 -> 0.78 (delta +0.60 >= 0.10) should set severity to CRITICAL and escalate
      const resWorse = await evaluateInterventionFeedback("int-1", { observedSeverity: 0.78 });
      assert.strictEqual(resWorse.feedback.outcome, "DETERIORATED");
      assert.strictEqual(mockHealthState.severity, "CRITICAL");
      assert.strictEqual(mockHealthState.level, getNextLevelUp("facility"));
    } finally {
      Intervention.findById = origFindById;
    }
  });

  test("sendPush validates subscriptions, respects opt-out, and prunes expired 410 endpoints", async () => {
    assert.strictEqual(isValidPushSubscription({ endpoint: "https://push.example/a", keys: { auth: "1", p256dh: "2" } }), true);
    assert.strictEqual(isValidPushSubscription({ endpoint: "ftp://bad", keys: { auth: "1", p256dh: "2" } }), false);

    const { valid, invalidEndpoints } = deduplicateSubscriptions([
      { endpoint: "https://push.example/valid", keys: { auth: "a", p256dh: "p" } },
      { endpoint: "https://push.example/valid", keys: { auth: "a", p256dh: "p" } },
      { endpoint: "https://push.example/missing-keys" },
    ]);
    assert.strictEqual(valid.length, 1);
    assert.deepStrictEqual(invalidEndpoints, ["https://push.example/missing-keys"]);

    const optOut = await sendPush(
      { preferences: { notificationsEnabled: false }, pushSubscriptions: valid },
      "Title",
      "Body",
      {},
      { pushEnabledOverride: true }
    );
    assert.strictEqual(optOut.skipped, true);
    assert.strictEqual(optOut.reason, "USER_OPT_OUT");

    const origFindByIdAndUpdate = User.findByIdAndUpdate;
    let pulledEndpoints = null;
    User.findByIdAndUpdate = async (_id, update) => {
      pulledEndpoints = update?.$pull?.pushSubscriptions?.endpoint?.$in || [];
    };

    try {
      const mockTransport = {
        async sendNotification(sub) {
          if (sub.endpoint.endsWith("/expired")) {
            const err = new Error("Gone");
            err.statusCode = 410;
            throw err;
          }
        },
      };

      const delivery = await sendPush(
        {
          _id: "user-123",
          pushSubscriptions: [
            { endpoint: "https://push.example/ok", keys: { auth: "a", p256dh: "p" } },
            { endpoint: "https://push.example/expired", keys: { auth: "a", p256dh: "p" } },
          ],
        },
        "Alert",
        "Test body",
        {},
        { pushEnabledOverride: true, transport: mockTransport }
      );

      assert.strictEqual(delivery.attempted, 2);
      assert.strictEqual(delivery.delivered, 1);
      assert.strictEqual(delivery.failed, 1);
      assert.strictEqual(delivery.expiredRemoved, 1);
      assert.deepStrictEqual(pulledEndpoints, ["https://push.example/expired"]);
    } finally {
      User.findByIdAndUpdate = origFindByIdAndUpdate;
    }
  });

  test("Weekly digest counts SpO2 and trendAlerts queries plural pushSubscriptions without duplicating alerts", async () => {
    const origMemberFind = FamilyMember.find;
    const origReminderFind = Reminder.find;
    const origUserFind = User.find;
    const origInsightFindOne = AIInsight.findOne;
    const origInsightCreate = AIInsight.create;

    try {
      const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      FamilyMember.find = () => ({
        select: () => ({
          lean: async () => [
            {
              _id: "m1",
              name: "Asha Patient",
              health: { spO2: [{ value: 98, date: recentDate, source: "ble_device" }] },
            },
          ],
        }),
      });
      Reminder.find = () => ({
        select: () => ({ lean: async () => [] }),
      });

      const digest = await generateDigest({ _id: "u1" });
      assert.ok(digest && digest.includes("1 health record day(s) logged this week"));

      let selectedFields = "";
      User.find = () => ({
        select: async (fields) => {
          selectedFields = fields;
          return [];
        },
      });
      await runTrendAlerts();
      assert.ok(selectedFields.includes("pushSubscriptions"), "trendAlerts must select plural pushSubscriptions");
      assert.strictEqual(/\bpushSubscription\b/.test(selectedFields), false);
    } finally {
      FamilyMember.find = origMemberFind;
      Reminder.find = origReminderFind;
      User.find = origUserFind;
      AIInsight.findOne = origInsightFindOne;
      AIInsight.create = origInsightCreate;
    }
  });

  test("Reminder scheduler modules are consolidated to a single authoritative implementation", () => {
    assert.strictEqual(cronStart, shimStart);
    assert.strictEqual(cronComputeNext, shimComputeNext);

    const base = new Date("2026-11-25T08:00:00.000Z");
    const nextDaily = cronComputeNext(base, "daily");
    assert.strictEqual(nextDaily.getDate(), new Date("2026-11-26T08:00:00.000Z").getDate());
  });
});
