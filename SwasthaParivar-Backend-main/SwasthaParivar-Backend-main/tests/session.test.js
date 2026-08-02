import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import Session from "../models/Session.js";

test("Session Model Tests", async (t) => {
  await t.test("should consider unrevoked, unexpired session as active", () => {
    const session = new Session({
      userId: new mongoose.Types.ObjectId(),
      refreshTokenHash: "testhash",
      expiresAt: new Date(Date.now() + 100000)
    });
    
    assert.strictEqual(session.isActive(), true);
  });

  await t.test("should consider revoked session as inactive", () => {
    const session = new Session({
      userId: new mongoose.Types.ObjectId(),
      refreshTokenHash: "testhash",
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: new Date()
    });
    
    assert.strictEqual(session.isActive(), false);
  });

  await t.test("should consider expired session as inactive", () => {
    const session = new Session({
      userId: new mongoose.Types.ObjectId(),
      refreshTokenHash: "testhash",
      expiresAt: new Date(Date.now() - 100000)
    });
    
    assert.strictEqual(session.isActive(), false);
  });
});
