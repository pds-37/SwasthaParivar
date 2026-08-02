import test from "node:test";
import assert from "node:assert";
import { abac } from "../middleware/abac.middleware.js";
import householdService from "../services/household/HouseholdService.js";

test("ABAC Middleware Tests", async (t) => {
  await t.test("should return 403 if findAccessibleMember returns error", async () => {
    // Mock the service
    const originalFind = householdService.findAccessibleMember;
    householdService.findAccessibleMember = async () => ({ error: "Not found", status: 404 });
    
    const req = { params: { id: "some-id" }, userId: "user-123" };
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.data = data; }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    const middleware = abac("id");
    await middleware(req, res, next);

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.data.error.code, "FORBIDDEN");
    assert.strictEqual(nextCalled, false);

    // Restore
    householdService.findAccessibleMember = originalFind;
  });
  
  await t.test("should call next if resource belongs to user", async () => {
    const originalFind = householdService.findAccessibleMember;
    householdService.findAccessibleMember = async () => ({ member: { _id: "some-id" } });
    
    const req = { params: { id: "some-id" }, userId: "user-123" };
    const res = {};
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    const middleware = abac("id");
    await middleware(req, res, next);

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.accessibleMember._id, "some-id");

    householdService.findAccessibleMember = originalFind;
  });
});
