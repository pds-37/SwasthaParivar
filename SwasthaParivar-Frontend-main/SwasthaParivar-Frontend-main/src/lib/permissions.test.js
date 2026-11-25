import test, { describe } from "node:test";
import assert from "node:assert";

import {
  PERMISSIONS,
  canAccessAshaPortal,
  canAccessCommandCenter,
  filterAuthorizedLinks,
  hasPermission,
} from "./permissions.js";

describe("Frontend Role-Aware Permission Helpers", () => {
  test("Ordinary users cannot access ASHA or Command Center navigation links", () => {
    const user = { id: "1", role: "user" };
    assert.strictEqual(canAccessAshaPortal(user), false);
    assert.strictEqual(canAccessCommandCenter(user), false);
    assert.strictEqual(hasPermission(user, PERMISSIONS.HEALTH_OWN), true);

    const links = [
      { path: "/health", label: "Health" },
      { path: "/command-center", label: "Command Center", requiredPermission: PERMISSIONS.DISTRICT_OVERVIEW },
      { path: "/asha-portal", label: "ASHA Field", requiredPermission: PERMISSIONS.SURVEY_SUBMIT },
    ];
    assert.deepStrictEqual(
      filterAuthorizedLinks(links, user).map((l) => l.path),
      ["/health"]
    );
  });

  test("ASHA workers see ASHA Field while District/State/National roles see authorized portals", () => {
    const asha = { id: "2", role: "asha_worker" };
    assert.strictEqual(canAccessAshaPortal(asha), true);
    assert.strictEqual(canAccessCommandCenter(asha), false);

    const districtOfficer = { id: "3", role: "district_officer" };
    assert.strictEqual(canAccessCommandCenter(districtOfficer), true);
    assert.strictEqual(canAccessAshaPortal(districtOfficer), true);

    const stateOfficer = { id: "4", role: "state_officer" };
    assert.strictEqual(hasPermission(stateOfficer, PERMISSIONS.STATE_OVERVIEW), true);
  });
});
