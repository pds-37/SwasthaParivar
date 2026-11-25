import test, { describe } from "node:test";
import assert from "node:assert";

import {
  PERMISSIONS,
  ROLES,
  hasPermission,
  isScopeAuthorized,
  resolveScopedQuery,
} from "../config/roles.js";
import { rbac, requirePermission, requireScope } from "../middleware/rbac.middleware.js";
import hierarchicalRoutes from "../routes/hierarchicalRoutes.js";
import householdService from "../services/household/HouseholdService.js";
import { healthStateIdParamSchema } from "../validations/hierarchicalSchemas.js";

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("Phase 1 Hierarchical RBAC, Geographic Scope & Route Security Tests", () => {
  test("Canonical roles enforce strict hierarchical permission boundaries", () => {
    assert.deepStrictEqual(ROLES, [
      "user",
      "asha_worker",
      "facility_admin",
      "district_officer",
      "state_officer",
      "national_admin",
    ]);

    const ordinaryUser = { role: "user" };
    assert.strictEqual(hasPermission(ordinaryUser, PERMISSIONS.HEALTH_OWN), true);
    assert.strictEqual(hasPermission(ordinaryUser, PERMISSIONS.SURVEY_SUBMIT), false);
    assert.strictEqual(hasPermission(ordinaryUser, PERMISSIONS.DISTRICT_OVERVIEW), false);
    assert.strictEqual(hasPermission(ordinaryUser, PERMISSIONS.INTERVENTION_DISPATCH), false);
    assert.strictEqual(hasPermission(ordinaryUser, PERMISSIONS.CAPACITY_WRITE), false);

    const asha = { role: "asha_worker" };
    assert.strictEqual(hasPermission(asha, PERMISSIONS.SURVEY_SUBMIT), true);
    assert.strictEqual(hasPermission(asha, PERMISSIONS.CAPACITY_READ), true);
    assert.strictEqual(hasPermission(asha, PERMISSIONS.CAPACITY_WRITE), false);
    assert.strictEqual(hasPermission(asha, PERMISSIONS.INTERVENTION_DISPATCH), false);
    assert.strictEqual(hasPermission(asha, PERMISSIONS.DISTRICT_OVERVIEW), false);

    const facilityAdmin = { role: "facility_admin" };
    assert.strictEqual(hasPermission(facilityAdmin, PERMISSIONS.CAPACITY_WRITE), true);
    assert.strictEqual(hasPermission(facilityAdmin, PERMISSIONS.CONVERGENCE_EVALUATE), true);
    assert.strictEqual(hasPermission(facilityAdmin, PERMISSIONS.DISTRICT_OVERVIEW), false);
    assert.strictEqual(hasPermission(facilityAdmin, PERMISSIONS.INTERVENTION_DISPATCH), false);

    const districtOfficer = { role: "district_officer" };
    assert.strictEqual(hasPermission(districtOfficer, PERMISSIONS.DISTRICT_OVERVIEW), true);
    assert.strictEqual(hasPermission(districtOfficer, PERMISSIONS.INTERVENTION_DISPATCH), true);
    assert.strictEqual(hasPermission(districtOfficer, PERMISSIONS.STATE_OVERVIEW), false);

    const stateOfficer = { role: "state_officer" };
    assert.strictEqual(hasPermission(stateOfficer, PERMISSIONS.STATE_OVERVIEW), true);
    assert.strictEqual(hasPermission(stateOfficer, PERMISSIONS.NATIONAL_OVERVIEW), false);
  });

  test("Geographic scope validation enforces pincode, district, facility, state and fails closed", () => {
    const asha = {
      role: "asha_worker",
      assignedScope: { state: "Uttar Pradesh", district: "Gautam Buddha Nagar", pincode: "201306" },
    };
    assert.strictEqual(isScopeAuthorized(asha, { district: "Gautam Buddha Nagar", pincode: "201306" }), true);
    assert.strictEqual(isScopeAuthorized(asha, { district: "Gautam Buddha Nagar", pincode: "201308" }), false);
    assert.strictEqual(isScopeAuthorized(asha, { district: "Lucknow", pincode: "201306" }), false);

    const districtOfficer = {
      role: "district_officer",
      assignedScope: { state: "Uttar Pradesh", district: "Gautam Buddha Nagar" },
    };
    assert.strictEqual(isScopeAuthorized(districtOfficer, { district: "gautam buddha nagar", pincode: "201308" }), true);
    assert.strictEqual(isScopeAuthorized(districtOfficer, { district: "Ghaziabad", pincode: "201001" }), false);

    const facilityAdmin = {
      role: "facility_admin",
      assignedScope: { state: "Uttar Pradesh", district: "Gautam Buddha Nagar", facilityId: "PHC-01" },
    };
    assert.strictEqual(isScopeAuthorized(facilityAdmin, { district: "Gautam Buddha Nagar", facilityId: "PHC-01" }), true);
    assert.strictEqual(isScopeAuthorized(facilityAdmin, { district: "Gautam Buddha Nagar", facilityId: "PHC-02" }), false);

    // Operator missing required district must fail closed
    assert.strictEqual(isScopeAuthorized({ role: "district_officer", assignedScope: {} }, { district: "Lucknow" }), false);

    const scoped = resolveScopedQuery(districtOfficer, { district: "Ghaziabad" });
    assert.strictEqual(scoped.authorized, false);
  });

  test("RBAC & permission middlewares return 401 unauthenticated and 403 unauthorized", () => {
    const permMiddleware = requirePermission(PERMISSIONS.DISTRICT_OVERVIEW);

    const unauthRes = createMockRes();
    let nextCalled = false;
    permMiddleware({}, unauthRes, () => { nextCalled = true; });
    assert.strictEqual(unauthRes.statusCode, 401);
    assert.strictEqual(nextCalled, false);

    const userRes = createMockRes();
    permMiddleware({ user: { role: "user" } }, userRes, () => { nextCalled = true; });
    assert.strictEqual(userRes.statusCode, 403);
    assert.strictEqual(nextCalled, false);

    const allowedRes = createMockRes();
    permMiddleware({ user: { role: "district_officer" } }, allowedRes, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);

    const scopeMiddleware = requireScope((req) => req.body);
    const outOfScopeRes = createMockRes();
    let scopeNext = false;
    scopeMiddleware(
      { user: { role: "district_officer", assignedScope: { district: "Gautam Buddha Nagar" } }, body: { district: "Agra" } },
      outOfScopeRes,
      () => { scopeNext = true; }
    );
    assert.strictEqual(outOfScopeRes.statusCode, 403);
    assert.strictEqual(scopeNext, false);

    // Multi-role via secondaryRoles is honored by rbac()
    let multiRoleNext = false;
    rbac("facility_admin")({ user: { role: "asha_worker", secondaryRoles: ["facility_admin"] } }, createMockRes(), () => {
      multiRoleNext = true;
    });
    assert.strictEqual(multiRoleNext, true);
  });

  test("All hierarchical routes bind auth middleware and ObjectId validation", () => {
    const stack = hierarchicalRoutes.stack || [];
    // Router-level auth middleware must be registered before route handlers
    assert.ok(stack.length > 5);
    assert.strictEqual(stack[0].name, "auth");

    const routeLayers = stack.filter((layer) => layer.route);
    assert.ok(routeLayers.length >= 14);
    for (const layer of routeLayers) {
      assert.ok(layer.route.stack.length >= 2, `Route ${layer.route.path} missing permission middleware`);
    }

    assert.strictEqual(healthStateIdParamSchema.safeParse({ id: "not-an-id" }).success, false);
    assert.strictEqual(healthStateIdParamSchema.safeParse({ id: "507f1f77bcf86cd799439011" }).success, true);
  });

  test("HouseholdService.buildSafeUser exposes role and assignedScope without secrets", () => {
    const safe = householdService.buildSafeUser({
      _id: "507f1f77bcf86cd799439011",
      email: "officer@example.com",
      fullName: "District Officer",
      role: "district_officer",
      secondaryRoles: ["facility_admin"],
      assignedScope: { state: "Uttar Pradesh", district: "Gautam Buddha Nagar", pincode: "201306", facilityId: "" },
      password: "secret",
      refreshTokenHash: "hash",
    });

    assert.strictEqual(safe.role, "district_officer");
    assert.deepStrictEqual(safe.secondaryRoles, ["facility_admin"]);
    assert.strictEqual(safe.assignedScope.district, "Gautam Buddha Nagar");
    assert.strictEqual("password" in safe, false);
    assert.strictEqual("refreshTokenHash" in safe, false);
  });
});
