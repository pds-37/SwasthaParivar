/**
 * Frontend role and permission helpers aligned with backend config/roles.js.
 * UI visibility NEVER replaces backend enforcement; both use the same canonical matrix.
 */

export const ROLES = Object.freeze([
  "user",
  "asha_worker",
  "facility_admin",
  "district_officer",
  "state_officer",
  "national_admin",
]);

export const PERMISSIONS = Object.freeze({
  HEALTH_OWN: "health:own",
  SURVEY_SUBMIT: "survey:submit",
  ASHA_TASKS_VIEW: "asha_tasks:view",
  CAPACITY_READ: "capacity:read",
  CAPACITY_WRITE: "capacity:write",
  DISTRICT_OVERVIEW: "district:overview",
  STATE_OVERVIEW: "state:overview",
  INTERVENTION_DISPATCH: "intervention:dispatch",
});

const ROLE_PERMISSIONS = {
  user: [PERMISSIONS.HEALTH_OWN],
  asha_worker: [
    PERMISSIONS.HEALTH_OWN,
    PERMISSIONS.SURVEY_SUBMIT,
    PERMISSIONS.ASHA_TASKS_VIEW,
    PERMISSIONS.CAPACITY_READ,
  ],
  facility_admin: [
    PERMISSIONS.HEALTH_OWN,
    PERMISSIONS.SURVEY_SUBMIT,
    PERMISSIONS.ASHA_TASKS_VIEW,
    PERMISSIONS.CAPACITY_READ,
    PERMISSIONS.CAPACITY_WRITE,
  ],
  district_officer: [
    PERMISSIONS.HEALTH_OWN,
    PERMISSIONS.SURVEY_SUBMIT,
    PERMISSIONS.ASHA_TASKS_VIEW,
    PERMISSIONS.CAPACITY_READ,
    PERMISSIONS.CAPACITY_WRITE,
    PERMISSIONS.DISTRICT_OVERVIEW,
    PERMISSIONS.INTERVENTION_DISPATCH,
  ],
  state_officer: [
    PERMISSIONS.HEALTH_OWN,
    PERMISSIONS.SURVEY_SUBMIT,
    PERMISSIONS.ASHA_TASKS_VIEW,
    PERMISSIONS.CAPACITY_READ,
    PERMISSIONS.CAPACITY_WRITE,
    PERMISSIONS.DISTRICT_OVERVIEW,
    PERMISSIONS.STATE_OVERVIEW,
    PERMISSIONS.INTERVENTION_DISPATCH,
  ],
  national_admin: Object.values(PERMISSIONS),
};

export function getUserRoles(user) {
  if (!user) return [];
  const primary = ROLES.includes(user.role) ? user.role : "user";
  const secondary = Array.isArray(user.secondaryRoles)
    ? user.secondaryRoles.filter((role) => ROLES.includes(role))
    : [];
  return Array.from(new Set([primary, ...secondary]));
}

export function hasPermission(user, permission) {
  if (!permission) return true;
  if (!user) return false;
  return getUserRoles(user).some((role) => (ROLE_PERMISSIONS[role] || []).includes(permission));
}

export function canAccessCommandCenter(user) {
  return hasPermission(user, PERMISSIONS.DISTRICT_OVERVIEW);
}

export function canAccessAshaPortal(user) {
  return hasPermission(user, PERMISSIONS.SURVEY_SUBMIT);
}

export function filterAuthorizedLinks(links = [], user) {
  return links.filter((item) => !item.requiredPermission || hasPermission(user, item.requiredPermission));
}
