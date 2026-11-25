# Security Architecture

> **Status:** Remediated and verified against branch `feat-hierarchical-health-intelligence` (base commit `4539cca`).

---

## 1. Defense-in-Depth Security Layers

Swastha Parivar enforces layered security controls across the React PWA frontend, Node.js/Express backend, and isolated Python FastAPI ML microservice:

1. **Transport & Session Layer**
   - HTTP-only JWT cookies and short-lived access tokens (`15m`, `accessTokenMaxAgeMs = 900000`) paired with rotating refresh tokens (`21d`, `refreshTokenMaxAgeMs`) configured in [AppConfig.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/config/AppConfig.js).
   - Strict origin allow-list validation in `AppConfig.matchesAllowedOrigin()`, restricting production CORS traffic to configured `CORS_ORIGINS` / `CLIENT_URLS` and matched Vercel project preview domains.
   - Frontend refresh-loop protection via `shouldAttemptTokenRefresh()` and `shouldRedirectToAuth()` in [apiHelpers.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main/src/lib/apiHelpers.js) and [api.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main/src/lib/api.js), clearing in-flight `refreshPromise` inside `.finally()`.
   - PWA service worker ([sw.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main/public/sw.js)) explicitly excludes `/api/ai/`, `/auth/refresh`, `/api/account/`, and `/api/hierarchical/` from browser cache storage.

2. **Authentication & Hierarchical Route Isolation**
   - `server.js` mounts `/api/hierarchical` behind the `auth` middleware, and [hierarchicalRoutes.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/routes/hierarchicalRoutes.js) enforces `router.use(auth)` as a second router-level invariant.
   - Every hierarchical endpoint binds `requirePermission(...)` from [rbac.middleware.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/middleware/rbac.middleware.js) backed by [config/roles.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/config/roles.js).
   - Unauthenticated requests fail with HTTP `401`; insufficient role or cross-jurisdiction scope requests fail closed with HTTP `403` (`SCOPE_FORBIDDEN` for scope violations).

3. **Geographic Jurisdiction (Fail-Closed Scope Enforcement)**
   - Every operator (`asha_worker`, `facility_admin`, `district_officer`, `state_officer`, `national_admin`) has an `assignedScope` subdocument on [user.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/models/user.js) (`state`, `district`, `pincode`, `facilityId`).
   - `isScopeAuthorized()` in [config/roles.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/config/roles.js) denies household-only `user` accounts outright and fails closed when a scoped operator lacks required geographic scope fields (`district` for `facility_admin`/`district_officer`; `district` + `pincode` for `asha_worker`; `state` for `state_officer`).
   - Controllers ([hierarchicalController.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/controllers/hierarchicalController.js), [capacityController.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/controllers/capacityController.js), [interventionController.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/controllers/interventionController.js)) apply `resolveScopedQuery()` / `isScopeAuthorized()` before reading or mutating resources.

4. **Input Validation & Safe Error Handling**
   - Path parameters (`:id`, `:healthStateId`) and mutation bodies (ASHA surveys, convergence evaluation, facility creation, capacity updates, intervention dispatch/feedback) are validated via Zod schemas in [validations/hierarchicalSchemas.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/validations/hierarchicalSchemas.js).
   - Server `500` error responses omit raw internal error strings (`error.message` / stack traces) to avoid leaking MongoDB schema or geographic details.
   - Python ML endpoint `POST /api/v1/predict` validates 17 strict float features using Pydantic v2 `ConfigDict(extra="forbid")` and `allow_inf_nan=False` in [prediction_schema.py](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/swastha-ml-engine/app/schemas/prediction_schema.py).

5. **Audit Trail & Tamper Evidence**
   - Privileged actions (state transforms, evidence ingestion, convergence runs, FSM transitions, ASHA surveys, facility creation, capacity updates, intervention dispatch, and feedback evaluations) call `auditLoggerService.logAction(...)`.
   - `AuditLog` entries maintain hash-chained sequence verification, while account deletion calls `auditLoggerService.anonymizeUserLogs(userId)` alongside explicit redaction across `SecurityEvent`, `PromptLog`, and `MLPredictionAudit`.

6. **Frontend Navigation & Route Guards (UX Complement, Not Security Boundary)**
   - [permissions.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main/src/lib/permissions.js) mirrors canonical permission checks in [Navigation.jsx](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main/src/components/Navigation.jsx) and [App.jsx](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main/src/App.jsx) (`RoleProtectedRoute`), hiding portal links and blocking client-side navigation for unpermitted users while backend middleware remains the authoritative enforcement boundary.

7. **Report Binary Storage Isolation**
   - Medical report binaries support private S3/Cloudflare R2 storage signed with pure Node `crypto` AWS Signature Version 4 in [reportStorageService.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/services/storage/reportStorageService.js) using server-side encryption (`x-amz-server-side-encryption: AES256`) and presigned GET TTLs clamped between `30` and `900` seconds, falling back cleanly to `mongodb_buffer` when S3/R2 env vars are absent.

---

## 2. Clarification of Legacy Documentation Claims

The root [README.md](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/README.md) contains aspirational architectural concepts (Federated Learning / Flower clients, PCA telemetry reconstruction, SQLCipher offline storage, MQTT broker on port 8883, and Socket.IO push streams). **Those mechanisms are not implemented in the active repository.** Security and compliance reviews must evaluate only the active codebase controls documented above: REST/HTTPS with JWT + RBAC/ABAC, Web Bluetooth GATT direct ingestion, keyed HMAC pseudonymization, k-anonymized hierarchical convergence, AES-256-GCM field encryption, and S3/R2 SigV4 private report storage.
