/**
 * Canonical Role Registry, Permission Matrix & Geographic Scope Helpers.
 * Single source of truth used by User model, RBAC/scope middleware, controllers, and interventions.
 */

export const ROLES = Object.freeze([
  "user",
  "asha_worker",
  "facility_admin",
  "district_officer",
  "state_officer",
  "national_admin",
]);

export const ROLE_RANK = Object.freeze({
  user: 0,
  asha_worker: 1,
  facility_admin: 2,
  district_officer: 3,
  state_officer: 4,
  national_admin: 5,
});

export const INTERVENTION_ASSIGNABLE_ROLES = Object.freeze([
  "user",
  "asha_worker",
  "facility_admin",
  "district_officer",
  "state_officer",
  "national_admin",
]);

export const PERMISSIONS = Object.freeze({
  HEALTH_OWN: "health:own",
  STATES_READ: "states:read",
  SIGNAL_TRANSFORM: "signal:transform",
  EVIDENCE_INGEST: "evidence:ingest",
  CONVERGENCE_EVALUATE: "convergence:evaluate",
  STATE_TRANSITION: "state:transition",
  DISTRICT_OVERVIEW: "district:overview",
  STATE_OVERVIEW: "state:overview",
  NATIONAL_OVERVIEW: "national:overview",
  ASHA_TASKS_VIEW: "asha_tasks:view",
  SURVEY_SUBMIT: "survey:submit",
  CAPACITY_READ: "capacity:read",
  CAPACITY_WRITE: "capacity:write",
  FACILITY_READ: "facility:read",
  FACILITY_CREATE: "facility:create",
  INTERVENTION_READ: "intervention:read",
  INTERVENTION_DISPATCH: "intervention:dispatch",
  INTERVENTION_FEEDBACK: "intervention:feedback",
});

export const ROLE_PERMISSIONS = Object.freeze({
  user: [PERMISSIONS.HEALTH_OWN],
  asha_worker: [
    PERMISSIONS.HEALTH_OWN,
    PERMISSIONS.STATES_READ,
    PERMISSIONS.SIGNAL_TRANSFORM,
    PERMISSIONS.EVIDENCE_INGEST,
    PERMISSIONS.ASHA_TASKS_VIEW,
    PERMISSIONS.SURVEY_SUBMIT,
    PERMISSIONS.CAPACITY_READ,
    PERMISSIONS.FACILITY_READ,
    PERMISSIONS.INTERVENTION_READ,
  ],
  facility_admin: [
    PERMISSIONS.HEALTH_OWN,
    PERMISSIONS.STATES_READ,
    PERMISSIONS.SIGNAL_TRANSFORM,
    PERMISSIONS.EVIDENCE_INGEST,
    PERMISSIONS.CONVERGENCE_EVALUATE,
    PERMISSIONS.ASHA_TASKS_VIEW,
    PERMISSIONS.SURVEY_SUBMIT,
    PERMISSIONS.CAPACITY_READ,
    PERMISSIONS.CAPACITY_WRITE,
    PERMISSIONS.FACILITY_READ,
    PERMISSIONS.FACILITY_CREATE,
    PERMISSIONS.INTERVENTION_READ,
    PERMISSIONS.INTERVENTION_FEEDBACK,
  ],
  district_officer: [
    PERMISSIONS.HEALTH_OWN,
    PERMISSIONS.STATES_READ,
    PERMISSIONS.SIGNAL_TRANSFORM,
    PERMISSIONS.EVIDENCE_INGEST,
    PERMISSIONS.CONVERGENCE_EVALUATE,
    PERMISSIONS.STATE_TRANSITION,
    PERMISSIONS.DISTRICT_OVERVIEW,
    PERMISSIONS.ASHA_TASKS_VIEW,
    PERMISSIONS.SURVEY_SUBMIT,
    PERMISSIONS.CAPACITY_READ,
    PERMISSIONS.CAPACITY_WRITE,
    PERMISSIONS.FACILITY_READ,
    PERMISSIONS.FACILITY_CREATE,
    PERMISSIONS.INTERVENTION_READ,
    PERMISSIONS.INTERVENTION_DISPATCH,
    PERMISSIONS.INTERVENTION_FEEDBACK,
  ],
  state_officer: [
    PERMISSIONS.HEALTH_OWN,
    PERMISSIONS.STATES_READ,
    PERMISSIONS.SIGNAL_TRANSFORM,
    PERMISSIONS.EVIDENCE_INGEST,
    PERMISSIONS.CONVERGENCE_EVALUATE,
    PERMISSIONS.STATE_TRANSITION,
    PERMISSIONS.DISTRICT_OVERVIEW,
    PERMISSIONS.STATE_OVERVIEW,
    PERMISSIONS.ASHA_TASKS_VIEW,
    PERMISSIONS.SURVEY_SUBMIT,
    PERMISSIONS.CAPACITY_READ,
    PERMISSIONS.CAPACITY_WRITE,
    PERMISSIONS.FACILITY_READ,
    PERMISSIONS.FACILITY_CREATE,
    PERMISSIONS.INTERVENTION_READ,
    PERMISSIONS.INTERVENTION_DISPATCH,
    PERMISSIONS.INTERVENTION_FEEDBACK,
  ],
  national_admin: Object.values(PERMISSIONS),
});

export function normalizeGeoToken(value = "") {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function getUserRoles(user) {
  if (!user) return [];
  const primary = ROLES.includes(user.role) ? user.role : "user";
  const secondary = Array.isArray(user.secondaryRoles)
    ? user.secondaryRoles.filter((role) => ROLES.includes(role))
    : [];
  return Array.from(new Set([primary, ...secondary]));
}

export function hasAnyRole(user, allowedRoles = []) {
  const userRoles = getUserRoles(user);
  return allowedRoles.some((role) => userRoles.includes(role));
}

export function hasPermission(user, permission) {
  const userRoles = getUserRoles(user);
  return userRoles.some((role) => (ROLE_PERMISSIONS[role] || []).includes(permission));
}

export function getHighestRoleRank(user) {
  return getUserRoles(user).reduce((maxRank, role) => Math.max(maxRank, ROLE_RANK[role] ?? 0), 0);
}

/**
 * Evaluate whether a target geographic scope is allowed under the user's roles and assignedScope.
 * Fail-closed: if a scoped operator lacks required geographic scope fields, access is denied.
 */
export function isScopeAuthorized(user, targetScope = {}) {
  if (!user) return false;
  const roles = getUserRoles(user);

  // Household-only user has no public-health jurisdiction
  if (roles.every((role) => role === "user")) {
    return false;
  }

  if (roles.includes("national_admin")) {
    return true;
  }

  const assigned = user.assignedScope || {};
  const userState = normalizeGeoToken(assigned.state || "Uttar Pradesh");
  const userDistrict = normalizeGeoToken(assigned.district);
  const userPincode = normalizeGeoToken(assigned.pincode);
  const userFacilityId = normalizeGeoToken(assigned.facilityId);

  const reqState = normalizeGeoToken(targetScope.state);
  const reqDistrict = normalizeGeoToken(targetScope.district);
  const reqPincode = normalizeGeoToken(targetScope.pincode);
  const reqFacilityId = normalizeGeoToken(targetScope.facilityId);

  if (roles.includes("state_officer")) {
    if (!userState) return false;
    return !reqState || reqState === userState;
  }

  if (roles.includes("district_officer")) {
    if (!userDistrict) return false;
    if (reqState && userState && reqState !== userState) return false;
    return !reqDistrict || reqDistrict === userDistrict;
  }

  if (roles.includes("facility_admin")) {
    if (!userDistrict) return false;
    if (reqState && userState && reqState !== userState) return false;
    if (reqDistrict && reqDistrict !== userDistrict) return false;
    if (userFacilityId && reqFacilityId && reqFacilityId !== userFacilityId) return false;
    return true;
  }

  if (roles.includes("asha_worker")) {
    if (!userDistrict || !userPincode) return false;
    if (reqState && userState && reqState !== userState) return false;
    if (reqDistrict && reqDistrict !== userDistrict) return false;
    return !reqPincode || reqPincode === userPincode;
  }

  return false;
}

/**
 * Resolve default and constrained MongoDB scope filter fields for a user's jurisdiction.
 */
export function resolveScopedQuery(user, requested = {}) {
  const assigned = user?.assignedScope || {};
  const roles = getUserRoles(user);

  if (roles.includes("national_admin")) {
    return {
      authorized: true,
      district: requested.district || "",
      pincode: requested.pincode || "",
      state: requested.state || "",
    };
  }

  const target = {
    state: requested.state || assigned.state || "Uttar Pradesh",
    district: requested.district || assigned.district || "",
    pincode: requested.pincode || (roles.includes("asha_worker") ? assigned.pincode : "") || "",
    facilityId: requested.facilityId || "",
  };

  if (!isScopeAuthorized(user, target)) {
    return { authorized: false };
  }

  return {
    authorized: true,
    district: roles.includes("state_officer") ? requested.district || "" : assigned.district || "",
    pincode: roles.includes("asha_worker") ? assigned.pincode : requested.pincode || "",
    state: assigned.state || "Uttar Pradesh",
  };
}
