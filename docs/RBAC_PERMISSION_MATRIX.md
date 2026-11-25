# RBAC & Geographic Scope Permission Matrix

Canonical role definitions and permission mappings live in [config/roles.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/config/roles.js), enforced server-side by [rbac.middleware.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/middleware/rbac.middleware.js) and mirrored in [permissions.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main/src/lib/permissions.js).

---

## 1. Canonical Role Hierarchy (`ROLES`)

1. `user` (Rank 0) — Standard household owner / family care member.
2. `asha_worker` (Rank 1) — Accredited Social Health Activist scoped to assigned `state` + `district` + `pincode`.
3. `facility_admin` (Rank 2) — Clinic / PHC / CHC administrator scoped to assigned `state` + `district` (+ optional `facilityId`).
4. `district_officer` (Rank 3) — District health surveillance & intervention commander scoped to assigned `state` + `district`.
5. `state_officer` (Rank 4) — State public-health oversight officer scoped to assigned `state`.
6. `national_admin` (Rank 5) — Unscoped cross-state platform administrator holding all permissions.

---

## 2. Endpoint & Permission Matrix

| Permission / Operation | Backend Route / Scope | `user` | `asha_worker` | `facility_admin` | `district_officer` | `state_officer` | `national_admin` |
|---|---|---|---|---|---|---|---|
| `health:own` (Personal & household care APIs) | `/api/members/*`, `/api/reports/*`, `/api/account/*` | Yes | Yes | Yes | Yes | Yes | Yes |
| `states:read` (Read health states) | `GET /api/hierarchical/states`, `GET /states/:id` | No | Scoped (`district+pincode`) | Scoped (`district`) | Scoped (`district`) | Scoped (`state`) | Global |
| `signal:transform` (Transform signal to HealthState) | `POST /api/hierarchical/transform` | No | Scoped | Scoped | Scoped | Scoped | Global |
| `evidence:ingest` (Ingest multi-source evidence) | `POST /api/hierarchical/evidence/ingest` | No | Scoped | Scoped | Scoped | Scoped | Global |
| `convergence:evaluate` (Evaluate community convergence) | `POST /api/hierarchical/convergence/evaluate` | No | No | Scoped (`district`) | Scoped (`district`) | Scoped (`state`) | Global |
| `state:transition` (Trigger FSM level transition) | `POST /api/hierarchical/states/:healthStateId/transition` | No | No | No | Scoped (`district`) | Scoped (`state`) | Global |
| `district:overview` (Command Center district view) | `GET /api/hierarchical/district/overview` | No | No | No | Scoped (`district`) | Scoped (`state`) | Global |
| `state:overview` (Macro state overview) | `GET /api/hierarchical/state/overview` | No | No | No | No | Scoped (`state`) | Global |
| `national:overview` (National aggregate access) | Reserved in `PERMISSIONS.NATIONAL_OVERVIEW` | No | No | No | No | No | Global |
| `asha_tasks:view` (View field worker tasks) | `GET /api/hierarchical/asha/tasks` | No | Scoped (`district+pincode`) | Scoped | Scoped | Scoped | Global |
| `survey:submit` (Submit doorstep field survey) | `POST /api/hierarchical/asha/survey` | No | Scoped (`district+pincode`) | Scoped | Scoped | Scoped | Global |
| `capacity:read` (View facility bed/staff capacity) | `GET /api/hierarchical/capacity` | No | Scoped | Scoped | Scoped | Scoped | Global |
| `capacity:write` (Update facility capacity metrics) | `PUT /api/hierarchical/capacity/:id` | No | No | Scoped (`district` / `facilityId`) | Scoped (`district`) | Scoped (`state`) | Global |
| `facility:read` (List healthcare facilities) | `GET /api/hierarchical/facilities` | No | Scoped | Scoped | Scoped | Scoped | Global |
| `facility:create` (Register healthcare facility) | `POST /api/hierarchical/facilities` | No | No | Scoped (`district`) | Scoped (`district`) | Scoped (`state`) | Global |
| `intervention:read` (View dispatched interventions) | `GET /api/hierarchical/interventions` | No | Scoped | Scoped | Scoped | Scoped | Global |
| `intervention:dispatch` (Dispatch public-health response) | `POST /api/hierarchical/interventions/dispatch` | No | No | No | Scoped (`district`) | Scoped (`state`) | Global |
| `intervention:feedback` (Submit post-intervention outcome) | `POST /api/hierarchical/interventions/:id/feedback` | No | No | Scoped | Scoped | Scoped | Global |

---

## 3. Geographic Scope Rules (`isScopeAuthorized`)

- All comparisons normalize whitespace and casing via `normalizeGeoToken()`.
- If `user.assignedScope` is missing the minimum field for a role, `isScopeAuthorized()` returns `false` (fail-closed):
  - `state_officer`: requires `assignedScope.state`; rejects mismatches on requested `state`.
  - `district_officer`: requires `assignedScope.district`; rejects mismatches on `state` or `district`.
  - `facility_admin`: requires `assignedScope.district`; rejects mismatches on `state`, `district`, or `facilityId` (when both user and target specify `facilityId`).
  - `asha_worker`: requires both `assignedScope.district` and `assignedScope.pincode`; rejects mismatches on `state`, `district`, or `pincode`.
  - `user` (without secondary elevated roles): unconditionally returns `false`.
