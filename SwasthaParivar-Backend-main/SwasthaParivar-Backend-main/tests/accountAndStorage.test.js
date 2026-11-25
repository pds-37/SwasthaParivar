import test, { describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

import User from "../models/user.js";
import FamilyMember from "../models/familymembermodel.js";
import HealthRecord from "../models/healthrecord.js";
import Consent from "../models/Consent.js";
import Reminder from "../models/remindermodel.js";
import Report from "../models/reportmodel.js";
import AIMemory from "../models/aimemorymodel.js";
import AIInsight from "../models/aiinsightmodel.js";
import AIChatLog from "../models/aichatlog.js";
import SymptomEpisode from "../models/symptomepisode.js";
import DoctorPacket from "../models/doctorpacket.js";
import Household from "../models/householdmodel.js";
import HouseholdMembership from "../models/householdmembershipmodel.js";
import HouseholdInvite from "../models/householdinvitemodel.js";
import Session from "../models/Session.js";
import ThreatScore from "../models/ThreatScore.js";
import SecurityEvent from "../models/SecurityEvent.js";
import PromptLog from "../models/PromptLog.js";
import MLPredictionAudit from "../models/mlpredictionaudit.js";
import { auditLoggerService } from "../services/diContainer.js";
import reportStorageService, {
  buildPresignedGetUrl,
  buildReportObjectKey,
  deleteReportObject,
  isObjectStorageConfigured,
  readReportBuffer,
  signS3Request,
  storeReportObject,
} from "../services/storage/reportStorageService.js";
import {
  buildAuthorizedMemberScopeQuery,
  deleteUserAccountData,
  exportUserAccountData,
  extractActiveHealthSnapshots,
  sanitizeUserForExport,
} from "../services/account/accountPrivacyService.js";

function makeLeanChain(result) {
  const chain = {
    select() {
      return chain;
    },
    sort() {
      return chain;
    },
    async lean() {
      return result;
    },
  };
  return chain;
}

describe("Phase 8 & 9 DPDP Account Privacy and Report Storage Tests", () => {
  test("sanitizeUserForExport and extractActiveHealthSnapshots include active metrics and redact secrets", () => {
    const safe = sanitizeUserForExport({
      _id: "u1",
      name: "Aarav",
      email: "aarav@example.com",
      role: "user",
      password: "hashed-password",
      refreshTokenHash: "secret-rt",
      refreshTokenExpiresAt: new Date(),
      pushSubscriptions: [{ endpoint: "https://push.example/1" }],
      googleId: "google-123",
    });

    assert.strictEqual(safe.email, "aarav@example.com");
    assert.strictEqual("password" in safe, false);
    assert.strictEqual("refreshTokenHash" in safe, false);
    assert.strictEqual("pushSubscriptions" in safe, false);
    assert.strictEqual("googleId" in safe, false);

    const snapshots = extractActiveHealthSnapshots([
      {
        _id: "m1",
        name: "Aarav",
        relation: "self",
        health: {
          bloodPressure: [{ value: "132/84", date: "2026-10-01T10:00:00.000Z", source: "manual" }],
          spO2: [{ value: 98, date: "2026-10-01T10:00:00.000Z", source: "ble_device" }],
          weight: [{ value: 72.5, date: "2026-09-30T10:00:00.000Z", source: "manual" }],
        },
      },
    ]);

    assert.strictEqual(snapshots.length, 2);
    assert.strictEqual(snapshots[0].spO2, 98);
    assert.strictEqual(snapshots[0].bloodPressure, "132/84");
    assert.strictEqual(snapshots[0].source, "ble_device");
    assert.strictEqual(snapshots[1].weight, 72.5);
  });

  test("exportUserAccountData aggregates authorized household members and active FamilyMember health snapshots", async (t) => {
    const userId = new mongoose.Types.ObjectId();
    const householdId = new mongoose.Types.ObjectId();
    const memberId = new mongoose.Types.ObjectId();

    const scopeQuery = buildAuthorizedMemberScopeQuery(userId, householdId);
    assert.deepStrictEqual(scopeQuery, {
      householdId,
      profileStatus: { $ne: "archived" },
    });

    let capturedMemberFilter = null;
    t.mock.method(User, "findById", () =>
      makeLeanChain({
        _id: userId,
        name: "Meera",
        email: "meera@example.com",
        role: "user",
        activeHouseholdId: householdId,
        password: "should-be-stripped-if-present",
      })
    );
    t.mock.method(FamilyMember, "find", (filter) => {
      capturedMemberFilter = filter;
      return makeLeanChain([
        {
          _id: memberId,
          name: "Meera",
          relation: "self",
          householdId,
          health: {
            heartRate: [{ value: 74, date: "2026-10-05T08:00:00.000Z", source: "ble_device" }],
            spO2: [{ value: 99, date: "2026-10-05T08:00:00.000Z", source: "ble_device" }],
          },
        },
      ]);
    });

    t.mock.method(Consent, "find", () => makeLeanChain([{ consentVersion: "1.0" }]));
    t.mock.method(HealthRecord, "find", () => makeLeanChain([]));
    t.mock.method(Reminder, "find", () => makeLeanChain([]));
    t.mock.method(Report, "find", () => makeLeanChain([{ _id: "r1", title: "Lab CBC", storageProvider: "s3_r2" }]));
    t.mock.method(AIMemory, "find", () => makeLeanChain([]));
    t.mock.method(AIInsight, "find", () => makeLeanChain([]));
    t.mock.method(AIChatLog, "find", () => makeLeanChain([]));
    t.mock.method(SymptomEpisode, "find", () => makeLeanChain([]));
    t.mock.method(DoctorPacket, "find", () => makeLeanChain([]));
    t.mock.method(HouseholdMembership, "find", () => makeLeanChain([{ householdId, role: "owner" }]));
    t.mock.method(HouseholdInvite, "find", () => makeLeanChain([]));

    const exported = await exportUserAccountData(userId);
    assert.ok(exported);
    assert.deepStrictEqual(capturedMemberFilter, { householdId, profileStatus: { $ne: "archived" } });
    assert.strictEqual(exported.user.email, "meera@example.com");
    assert.strictEqual("password" in exported.user, false);
    assert.strictEqual(exported.activeHealthSnapshots.length, 1);
    assert.strictEqual(exported.activeHealthSnapshots[0].spO2, 99);
    assert.strictEqual(exported.activeHealthSnapshots[0].source, "ble_device");
    assert.strictEqual(exported.healthRecords.length, 1);
    assert.strictEqual(exported.reports.length, 1);
  });

  test("deleteUserAccountData erases objects, clears auth sessions/logs, anonymizes audits, and promotes next owner", async (t) => {
    const userId = new mongoose.Types.ObjectId();
    const nextUserId = new mongoose.Types.ObjectId();
    const householdId = new mongoose.Types.ObjectId();
    const memberId = new mongoose.Types.ObjectId();
    const nextMembershipId = new mongoose.Types.ObjectId();

    const deletedObjectIds = [];
    const anonymizedUsers = [];
    const deletedModels = [];
    let promotedHouseholdUpdate = null;

    t.mock.method(FamilyMember, "find", () => makeLeanChain([{ _id: memberId, householdId }]));
    t.mock.method(Household, "find", () => makeLeanChain([{ _id: householdId }]));
    t.mock.method(Report, "find", () =>
      makeLeanChain([{ _id: "rep-1", storageProvider: "s3_r2", storageKey: "reports/users/u1/abc.pdf" }])
    );
    t.mock.method(reportStorageService, "deleteReportObject", async (rep) => {
      deletedObjectIds.push(rep._id);
      return { deleted: true, provider: "s3_r2" };
    });
    t.mock.method(auditLoggerService, "anonymizeUserLogs", async (uid) => {
      anonymizedUsers.push(String(uid));
    });

    t.mock.method(Session, "deleteMany", async () => { deletedModels.push("Session"); });
    t.mock.method(ThreatScore, "deleteOne", async () => { deletedModels.push("ThreatScore"); });
    t.mock.method(SecurityEvent, "updateMany", async () => { deletedModels.push("SecurityEvent"); });
    t.mock.method(PromptLog, "updateMany", async () => { deletedModels.push("PromptLog"); });
    t.mock.method(MLPredictionAudit, "updateMany", async () => { deletedModels.push("MLPredictionAudit"); });
    t.mock.method(HealthRecord, "deleteMany", async () => { deletedModels.push("HealthRecord"); });
    t.mock.method(Reminder, "deleteMany", async () => { deletedModels.push("Reminder"); });
    t.mock.method(Report, "deleteMany", async () => { deletedModels.push("Report"); });
    t.mock.method(AIMemory, "deleteMany", async () => { deletedModels.push("AIMemory"); });
    t.mock.method(AIInsight, "deleteMany", async () => { deletedModels.push("AIInsight"); });
    t.mock.method(AIChatLog, "deleteMany", async () => { deletedModels.push("AIChatLog"); });
    t.mock.method(SymptomEpisode, "deleteMany", async () => { deletedModels.push("SymptomEpisode"); });
    t.mock.method(DoctorPacket, "deleteMany", async () => { deletedModels.push("DoctorPacket"); });
    t.mock.method(Consent, "deleteMany", async () => { deletedModels.push("Consent"); });
    t.mock.method(HouseholdInvite, "deleteMany", async () => { deletedModels.push("HouseholdInvite"); });
    t.mock.method(HouseholdMembership, "deleteMany", async () => { deletedModels.push("HouseholdMembership"); });
    t.mock.method(FamilyMember, "deleteMany", async () => { deletedModels.push("FamilyMember"); });
    t.mock.method(User, "deleteOne", async () => { deletedModels.push("User"); });

    t.mock.method(HouseholdMembership, "findOne", () => ({
      async sort() {
        return { _id: nextMembershipId, userId: nextUserId, householdId, status: "active" };
      },
    }));
    t.mock.method(Household, "updateOne", async (filter, update) => {
      promotedHouseholdUpdate = { filter, update };
    });
    t.mock.method(HouseholdMembership, "updateOne", async () => {});

    const res = await deleteUserAccountData(userId);
    assert.deepStrictEqual(res, { deleted: true });
    assert.deepStrictEqual(deletedObjectIds, ["rep-1"]);
    assert.deepStrictEqual(anonymizedUsers, [String(userId)]);
    assert.ok(deletedModels.includes("Session"));
    assert.ok(deletedModels.includes("ThreatScore"));
    assert.ok(deletedModels.includes("User"));
    assert.strictEqual(String(promotedHouseholdUpdate.update.$set.createdByUserId), String(nextUserId));
  });

  test("reportStorageService signs S3/R2 requests, clamps presigned TTL, and switches cleanly between mongodb_buffer and s3_r2", async () => {
    const s3Env = {
      OBJECT_STORAGE_ENDPOINT: "https://r2.example.com",
      OBJECT_STORAGE_BUCKET: "swastha-reports",
      OBJECT_STORAGE_ACCESS_KEY_ID: "AKIAEXAMPLE",
      OBJECT_STORAGE_SECRET_ACCESS_KEY: "secret-key-material",
      OBJECT_STORAGE_REGION: "auto",
      OBJECT_STORAGE_SSE: "AES256",
    };

    assert.strictEqual(isObjectStorageConfigured({}), false);
    assert.strictEqual(isObjectStorageConfigured(s3Env), true);

    const key = buildReportObjectKey({
      ownerId: "u1",
      householdId: "h1",
      storedFileName: "lab-report.pdf",
    });
    assert.strictEqual(key, "reports/households/h1/lab-report.pdf");

    const signed = signS3Request({
      method: "PUT",
      key,
      payload: Buffer.from("pdf-bytes"),
      contentType: "application/pdf",
      config: {
        endpoint: s3Env.OBJECT_STORAGE_ENDPOINT,
        bucket: s3Env.OBJECT_STORAGE_BUCKET,
        accessKeyId: s3Env.OBJECT_STORAGE_ACCESS_KEY_ID,
        secretAccessKey: s3Env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
        region: s3Env.OBJECT_STORAGE_REGION,
        configured: true,
      },
      now: new Date("2026-10-01T00:00:00.000Z"),
    });
    assert.strictEqual(signed.url, "https://r2.example.com/swastha-reports/reports/households/h1/lab-report.pdf");
    assert.match(signed.headers.Authorization, /^AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE\/20261001\/auto\/s3\/aws4_request/);

    const presigned = buildPresignedGetUrl({
      key,
      expiresInSeconds: 7200,
      config: {
        endpoint: s3Env.OBJECT_STORAGE_ENDPOINT,
        bucket: s3Env.OBJECT_STORAGE_BUCKET,
        accessKeyId: s3Env.OBJECT_STORAGE_ACCESS_KEY_ID,
        secretAccessKey: s3Env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
        region: s3Env.OBJECT_STORAGE_REGION,
        configured: true,
      },
      now: new Date("2026-10-01T00:00:00.000Z"),
    });
    assert.match(presigned, /X-Amz-Expires=900/);
    assert.match(presigned, /X-Amz-Signature=[0-9a-f]{64}/);

    const buf = Buffer.from("%PDF-1.4 test");
    const fallbackSaved = await storeReportObject(
      { key, buffer: buf, contentType: "application/pdf" },
      { env: {} }
    );
    assert.strictEqual(fallbackSaved.storageProvider, "mongodb_buffer");
    assert.strictEqual(Buffer.isBuffer(fallbackSaved.fileBuffer), true);

    let capturedPutHeaders = null;
    const s3Saved = await storeReportObject(
      { key, buffer: buf, contentType: "application/pdf" },
      {
        env: s3Env,
        fetchImpl: async (_url, opts) => {
          capturedPutHeaders = opts.headers;
          return { ok: true, status: 200 };
        },
      }
    );
    assert.strictEqual(s3Saved.storageProvider, "s3_r2");
    assert.strictEqual(s3Saved.fileBuffer, undefined);
    assert.strictEqual(capturedPutHeaders["x-amz-server-side-encryption"], "AES256");

    const downloaded = await readReportBuffer(
      { storageProvider: "s3_r2", storageKey: key },
      {
        env: s3Env,
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          async arrayBuffer() {
            return buf;
          },
        }),
      }
    );
    assert.strictEqual(downloaded.toString("utf8"), "%PDF-1.4 test");

    const legacyDownloaded = await readReportBuffer({
      storageProvider: "mongodb_buffer",
      fileBuffer: buf,
    });
    assert.strictEqual(legacyDownloaded.toString("utf8"), "%PDF-1.4 test");

    const del404 = await deleteReportObject(
      { storageProvider: "s3_r2", storageKey: key },
      { env: s3Env, fetchImpl: async () => ({ ok: false, status: 404 }) }
    );
    assert.deepStrictEqual(del404, { deleted: true, provider: "s3_r2" });
  });
});
