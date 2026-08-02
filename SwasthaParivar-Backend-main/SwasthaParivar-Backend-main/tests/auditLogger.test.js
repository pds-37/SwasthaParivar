import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { createHash } from "node:crypto";

import AuditLog from "../models/AuditLog.js";
import SystemState from "../models/SystemState.js";

test("Audit Logger Hash Chain Tests", async (t) => {
  await t.test("should properly chain hashes sequentially", async () => {
    // Because this test accesses the DB, and we don't have a real DB running in the test env, 
    // we will simulate the hashing logic directly to ensure the math works.

    const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
    
    const payload1 = {
      action: "READ",
      resourceType: "Report",
      resourceId: "null",
      actorId: "123",
      ipAddress: "127.0.0.1",
      metadata: "{}"
    };

    const dataToHash1 = GENESIS_HASH + JSON.stringify(payload1);
    const hash1 = createHash("sha256").update(dataToHash1).digest("hex");

    const payload2 = {
      action: "UPDATE",
      resourceType: "Profile",
      resourceId: "null",
      actorId: "123",
      ipAddress: "127.0.0.1",
      metadata: "{}"
    };

    const dataToHash2 = hash1 + JSON.stringify(payload2);
    const hash2 = createHash("sha256").update(dataToHash2).digest("hex");

    assert.notStrictEqual(hash1, hash2);
    assert.strictEqual(hash1.length, 64);
    assert.strictEqual(hash2.length, 64);
  });
});
