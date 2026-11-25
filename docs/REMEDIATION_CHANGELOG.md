# Remediation Changelog

Summary of all verified engineering changes implemented on branch `feat-hierarchical-health-intelligence` atop base commit `4539cca`.

---

## Phase 0 — Discovery & Baseline
- **Added** [docs/REMEDIATION_BASELINE.md](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/docs/REMEDIATION_BASELINE.md) recording baseline architecture, test counts, and confirmed security/functional defects.

## Phase 1 — Hierarchical RBAC, Scope Enforcement & UI Route Protection
- **Created** `SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/config/roles.js` — Canonical `ROLES`, `PERMISSIONS`, `ROLE_PERMISSIONS`, `isScopeAuthorized()`, and `resolveScopedQuery()`.
- **Created** `SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/validations/hierarchicalSchemas.js` — Zod ObjectId and payload validation schemas matching `HealthcareFacility` enums.
- **Updated** `models/user.js` (`role` enum, `secondaryRoles`, `assignedScope.state`), `middleware/rbac.middleware.js` (`requirePermission`, `requireScope`), `services/household/HouseholdService.js` (`buildSafeUser()`), `server.js` (mount `auth` on `/api/hierarchical`), and `routes/hierarchicalRoutes.js` (router `auth`, permissions, Zod validators, `GET /state/overview`).
- **Updated** `controllers/hierarchicalController.js`, `controllers/capacityController.js`, and `controllers/interventionController.js` to enforce `SCOPE_FORBIDDEN` checks, redact internal `500` error details, strip household PII tokens, and emit `auditLoggerService.logAction(...)` on mutations.
- **Created** `SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main/src/lib/permissions.js` & `permissions.test.js`; updated `src/components/Navigation.jsx` and `src/App.jsx` (`RoleProtectedRoute`) for permission-aware navigation and routes.

## Phase 2, 4 & 5 — Individual-to-Hierarchical Pipeline, Roles, Severity & Spatial Convergence
- **Updated** `models/EvidenceSignal.js` (unique sparse `dedupKey` + `provenance`), `models/CapacityState.js`, and `models/Intervention.js` (`INTERVENTION_ASSIGNABLE_ROLES`, `dispatchAudit`).
- **Updated** `services/hierarchical/healthStateTransformer.js` (`parseBloodPressureReading`, `normalizeVitalMetrics`, keyed HMAC `createPseudonymousNodeId`, authoritative `getSeverityBand()`), `services/hierarchical/evidenceConvergenceEngine.js` (district+pincode convergence, k-anonymity guard `>=2` source types & identifiers, idempotent retry bridge `processHouseholdVitalTelemetry()`), `services/health/MemberHealthService.js` (fault-isolated telemetry hook), `services/health/healthTrendService.js` (weight shifts), and `utils/badgeChecker.js` (`spO2`).
- **Updated** `services/interventions/interventionEngine.js` (canonical role mapping & `selectAuthorizedRecipients()`), `services/interventions/closedLoopFeedbackService.js`, and `services/hierarchical/stateTransitionEngine.js` (consistent `getSeverityBand()` updates + timestamped `transitionHistory`).

## Phase 3 — Frontend API Client, Command Center & ASHA Portal
- **Created** `src/lib/apiHelpers.js` & `api.test.js`; refactored `src/lib/api.js` (`.finally()` refresh cleanup, URL normalization).
- **Updated** `src/pages/DistrictCommandCenter.jsx` (+ `.css`) and `src/pages/AshaWorkerPortal.jsx` (+ `.css`) to migrate off hardcoded localhost/raw `axios` onto centralized `api.js`, respect assigned geo defaults, and isolate feedback slider state per intervention (`feedbackSeverities[inv._id]`).

## Phase 6 — Push Notifications & Consolidated Reminder Scheduler
- **Updated** `controllers/notificationController.js` (subscription validation, atomic endpoint deduplication, opt-out check, 410/404 cleanup), `jobs/trendAlerts.js` (fixed `pushSubscriptions` plural field, 24h alert cooldown, overlap lock), and `jobs/weeklyDigest.js` (plural field + `spO2` metric summary).
- **Consolidated** `utils/reminderCron.js` (overlap guard, bounded retry, `NODE_TEST_CONTEXT` test isolation, `stopReminderScheduler()`) and converted `utils/reminderScheduler.js` to a single re-export shim.

## Phase 7 — ML Microservice & Node Client Hardening
- **Updated** `models/mlpredictionaudit.js` (nullable `userId`), `services/ml/mlInferenceClient.js` (BP string parsing, configurable `ML_INFERENCE_TIMEOUT_MS`, DI hooks).
- **Updated** `swastha-ml-engine/app/schemas/prediction_schema.py` (`extra="forbid"`, `allow_inf_nan=False`, UTC timestamps, `modelVersion`), `app/services/model_service.py`, `app/routers/prediction_router.py`, and `app/main.py` (`lifespan`).
- **Added** `swastha-ml-engine/tests/test_ml_engine.py` and `SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/tests/mlClient.test.js`.

## Phase 8 & 9 — DPDP Privacy Export/Erasure & Report Object Storage
- **Created** `services/account/accountPrivacyService.js` and updated `routes/account.js` (`GET /api/account/me/export` including `FamilyMember.health` snapshots & secret redaction; `DELETE /api/account/me` erasing objects, clearing auth sessions/logs, anonymizing audit trails, promoting next household owner).
- **Created** `services/storage/reportStorageService.js` (zero-dependency `node:crypto` SigV4 client for private S3/R2 with `SSE-AES256`, presigned URL TTL clamp, and transparent `mongodb_buffer` fallback); updated `models/reportmodel.js` and `controllers/reportController.js`.
- **Added** `tests/accountAndStorage.test.js`.

## Phase 10, 11 & 12 — Frontend Lint, PWA Security & Documentation
- **Updated** `FollowUpChips.jsx`, `InstallPrompt.jsx`, `SelfDashboard.jsx`, `useVoiceInput.js`, and `remedies.jsx` resolving all ESLint issues (`eslint src`: 0 errors, 0 warnings); updated `public/sw.js` to bypass cache storage on `/api/account/` and `/api/hierarchical/`.
- **Verified** `vite build` cleanly outside Windows sandbox restrictions (`4572` modules bundled in `9.92s`).
- **Added** [SECURITY_ARCHITECTURE.md](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/docs/SECURITY_ARCHITECTURE.md), [RBAC_PERMISSION_MATRIX.md](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/docs/RBAC_PERMISSION_MATRIX.md), [HEALTH_DATA_PIPELINE.md](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/docs/HEALTH_DATA_PIPELINE.md), [DATA_PRIVACY_AND_AGGREGATION.md](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/docs/DATA_PRIVACY_AND_AGGREGATION.md), [ML_MODEL_LIMITATIONS.md](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/docs/ML_MODEL_LIMITATIONS.md), [DEPLOYMENT_CHECKLIST.md](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/docs/DEPLOYMENT_CHECKLIST.md), and `REMEDIATION_CHANGELOG.md`.
