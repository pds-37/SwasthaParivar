# Swastha Parivar — Remediation Baseline Report (Phase 0)

**Date:** 2026-11-25  
**Git Branch:** `feat-hierarchical-health-intelligence`  
**Baseline Commit:** `4539cca` (`feat: add Web Bluetooth BLE vital sync and SpO2 telemetry support`)  
**Working Tree Status at Inspection:** Clean (`nothing to commit, working tree clean`)

---

## 1. Existing Architecture & Modules

The repository contains three deployable applications:

1. **Frontend PWA (`SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main`)**
   - **Stack:** React 19.2, Vite 7.2, React Router DOM 7.9, Axios 1.13, SWR 2.4, MUI 7.3, Recharts 3.5, FullCalendar 6.1, `jsPDF` 3.0, `lucide-react`.
   - **Entry & Routing:** `src/App.jsx` mounts `AppThemeProvider`, `BrowserRouter`, `UIStoreProvider`, `SWRConfig`, `AuthProvider`, public pages (`/`, `/pricing`, `/privacy`, `/terms`, `/remedy-library`, `/join/:code`, `/auth`), and `ProtectedLayout` routes (`/dashboard`, `/family`, `/health`, `/reports`, `/remedies`, `/ai-chat`, `/reminders`, `/settings`, `/command-center`, `/asha-portal`).
   - **API Client:** `src/lib/api.js` normalizes `VITE_API_URL`, uses `withCredentials: true` + optional Bearer token, deduplicates `/auth/refresh` requests with `refreshPromise`, handles 401/403 `upgradeRequired` events, 429, and 5xx capture via Sentry.
   - **BLE Integration:** `src/lib/bleGatt.js`, `src/hooks/useBleVitals.js`, `src/components/BleDeviceModal.jsx`, and `src/pages/HealthMonitor.jsx`.

2. **Backend API (`SwasthaParivar-Backend-main/SwasthaParivar-Backend-main`)**
   - **Stack:** Node.js ESM (`"type": "module"`), Express 4.18, Mongoose 7.0, Zod 4.4, `jsonwebtoken`, Redis (`ioredis`), `node-cron`, `web-push`, `@google/generative-ai`, `@sendgrid/mail`, `pino`.
   - **Security Pipeline (`server.js`):** `helmet`, dynamic CORS matching in `config/AppConfig.js`, `requestSanitizer`, Redis-backed `apiRateLimiter`, `middleware/auth.js` (JWT + `Session` validation), `middleware/rbac.middleware.js`, `middleware/abac.middleware.js`, `middleware/validate.js`.
   - **Core Domain:** 16 route modules mounted under `/api/*`, 33 Mongoose models, AI triage (`clinicalRulesEngine.js` + `mlInferenceClient.js` + Gemini + `AiOutputSafetyLayer`), encrypted medical reports (`reportmodel.js` with `mongooseEncryptionGcm`), SHA-256 hash-chained `AuditLog` (`services/audit/AuditLoggerService.js`), DPDP endpoints (`routes/account.js`), and cron jobs (`reminderCron.js`, `weeklyDigest.js`, `trendAlerts.js`).
   - **Hierarchical Health Engine (`routes/hierarchicalRoutes.js`):** 7-tier models (`HealthState`, `HealthcareFacility`, `CapacityState`, `EvidenceSignal`, `Intervention`) and services (`healthStateTransformer.js`, `evidenceConvergenceEngine.js`, `capacityDeficitService.js`, `stateTransitionEngine.js`, `interventionEngine.js`, `closedLoopFeedbackService.js`).

3. **ML Inference Engine (`swastha-ml-engine`)**
   - **Stack:** Python 3.14, FastAPI, Uvicorn, Pydantic v2, Scikit-Learn, Pandas, NumPy, Joblib.
   - **Artifacts (`models/`):** `preprocessor.joblib`, `rf_risk_classifier.joblib`, `logreg_benchmark.joblib`, `dt_explainer.joblib`, `metadata.json` (`v2.6.0-production-leak-free-audited`, 17 UCI-derived features).
   - **Endpoints (`app/routers/prediction_router.py`):** `GET /health`, `POST /api/v1/predict`.

---

## 2. Baseline Verification Results (Pre-Remediation)

| Check | Command | Result | Notes |
|---|---|---|---|
| Backend syntax | `npm run check` (`node --check server.js`) | PASS | Exit code 0 |
| Backend unit tests | `npm test` (`node --test tests/*.test.js`) | PASS (47/48, 1 skipped) | 1 pre-existing skip: `ThreatScoreService#applyDecay is private` |
| Frontend BLE unit tests | `node --test src/lib/bleGatt.test.js` | PASS (5/5) | Verified SFLOAT, BP, HR, SpO₂, and Glucose binary parsers |
| Frontend ESLint (targeted) | `eslint src/lib/bleGatt* src/hooks/useBleVitals.js src/components/BleDeviceModal.jsx src/pages/HealthMonitor.jsx ...` | PASS | 0 errors, 0 warnings on BLE files |
| Frontend ESLint (full `src/`) | `node node_modules/eslint/bin/eslint.js src` | FAIL (7 errors, 1 warning) | Pre-existing issues in 5 untouched files |
| Frontend Vite production build | `node node_modules/vite/bin/vite.js build` | BLOCKED in sandbox | `EPERM: operation not permitted, realpath ... src/main.jsx` inside Windows terminal sandbox |
| Python ML dependencies | `python -c "import fastapi, sklearn, joblib, pandas, pydantic"` | PASS | Python 3.14.3, `pytest` and `httpx` installed; no automated ML tests exist yet |

---

## 3. Confirmed Bugs & Engineering Gaps Verified in Source Code

1. **Hierarchical Route Authentication & Authorization Missing (`routes/hierarchicalRoutes.js`, `server.js`):**
   - `/api/hierarchical` is mounted without `auth` in `server.js` line 141.
   - `GET /states`, `GET /states/:id`, `POST /convergence/evaluate`, `GET /district/overview`, `GET /capacity`, `GET /facilities`, `GET /interventions` lack authentication completely.
   - Mutating routes (`POST /transform`, `POST /evidence/ingest`, `POST /states/:healthStateId/transition`, `GET /asha/tasks`, `POST /asha/survey`, `PUT /capacity/:id`, `POST /facilities`, `POST /interventions/dispatch`, `POST /interventions/:id/feedback`) apply `auth` only and **never enforce `rbac` or `assignedScope`**.
   - `controllers/*` in the hierarchical subsystem do not invoke `auditLoggerService.logAction(...)`.

2. **Missing Role/Scope Exposure & Role-Aware Nav (`services/household/HouseholdService.js`, `src/components/Navigation.jsx`, `src/App.jsx`):**
   - `HouseholdService.buildSafeUser()` omits `role` and `assignedScope`, so `useAuth().user` on the frontend never receives role/jurisdiction data.
   - `Navigation.jsx` displays `Command Center` (`/command-center`) and `ASHA Field` (`/asha-portal`) links to every logged-in user; `App.jsx` routes them under ordinary `ProtectedLayout`.

3. **Disconnected Individual-Health & Hierarchical Intelligence Pipelines (`services/health/MemberHealthService.js`, `HealthRecordController.js`):**
   - `POST /api/health/:memberId` saves manual and BLE vitals into `FamilyMember.health` only. It never emits de-identified `EvidenceSignal` or individual/household `HealthState` records for abnormal clinical values (`bloodPressure`, `heartRate`, `bloodSugar`, `spO2`, `weight`), nor does it enforce idempotency/deduplication or transactional isolation.

4. **Frontend Portals Bypass Centralized API Client (`DistrictCommandCenter.jsx`, `AshaWorkerPortal.jsx`):**
   - Both pages call raw `axios` with `import.meta.env.VITE_API_URL || "http://localhost:5000/api"` instead of `src/lib/api.js`, bypassing `/api` URL normalization, `Authorization` headers, cookie+refresh retry (`refreshPromise`), and error handling.

5. **Role Enum Mismatch in Intervention Dispatch (`models/user.js` vs `services/interventions/interventionEngine.js`):**
   - `user.js` allows `["user", "asha_worker", "facility_admin", "district_officer"]`.
   - `interventionEngine.js` assigns `["medical_officer", "district_magistrate", "pharmacist", "caregiver"]` (which do not match `User.role`), `Intervention.js` has a conflicting `assignedRoles` enum, and `dispatchInterventionForState()` ignores geographic `assignedScope` and records no delivery outcomes.

6. **Stale `severity` Labels, Pincode Collisions & Shared UI Slider (`closedLoopFeedbackService.js`, `evidenceConvergenceEngine.js`, `stateTransitionEngine.js`, `DistrictCommandCenter.jsx`):**
   - Updating `severityScore` during feedback recovery/escalation or re-convergence leaves `HealthState.severity` stale.
   - `evidenceConvergenceEngine.js` uses separate threshold math (`>= 0.7` `HIGH`, no `CRITICAL`) and groups signals by `pincode` without scoping by `district` or validating spatial metadata.
   - `DistrictCommandCenter.jsx` binds all intervention cards to a single `feedbackObservedSeverity` state variable.

7. **Broken Push Notification Projections & Duplicate Scheduler (`jobs/trendAlerts.js`, `jobs/weeklyDigest.js`, `utils/reminderCron.js`, `utils/reminderScheduler.js`):**
   - `User` defines `pushSubscriptions` (array), whereas `trendAlerts.js` (line 127) and `weeklyDigest.js` (line 124) query `.select("... pushSubscription ...")` (singular), so `sendPush()` always sees empty subscriptions.
   - `weeklyDigest.js` omits `spO2` from its local `HEALTH_METRICS` array.
   - `server.js` runs `utils/reminderCron.js`, leaving `utils/reminderScheduler.js` as a dead duplicate.

8. **ML Feature Mismatch & Unverified Test Coverage (`swastha-ml-engine`, `services/ml/mlInferenceClient.js`):**
   - Existing `.joblib` models use 17 UCI Heart Disease features derived via deterministic proxies (`train_pipeline.py`), without `spO2` (no suitable labeled SpO₂ dataset exists in `/data`).
   - Zero Python unit tests exist for feature validation, `MODEL_NOT_READY` 503 behavior, explainability, or Node timeout fallback.

9. **Legacy DPDP Export & Account Data Gap (`routes/account.js`):**
   - `GET /api/account/me/export` queries legacy empty `HealthRecord` (`models/healthrecord.js`) instead of building structured active vitals timelines from authorized household `FamilyMember.health` snapshots, and `DELETE /api/account/me` does not call `auditLoggerService.anonymizeUserLogs(userId)` cleanly or clean up sessions/tokens uniformly across household data.

10. **MongoDB-Buffered Report Storage Scalability (`models/reportmodel.js`, `controllers/reportController.js`):**
    - Up to 10 MB PDFs/images are stored inline inside MongoDB `Report.fileBuffer` documents instead of private S3/R2 object storage with storage abstraction and fallback migration support.

11. **Pre-Existing Frontend Lint Failures (`eslint src`):**
    - `FollowUpChips.jsx` (unused `Icon`)
    - `InstallPrompt.jsx` (`react-hooks/set-state-in-effect`)
    - `SelfDashboard.jsx` (3 unused variables)
    - `useVoiceInput.js` (hook dependency warning)
    - `remedies.jsx` (2 unused variables)

12. **Potential Issues Requiring Careful Handling During Remediation:**
    - Frontend test runner: no `vitest` dependency is currently installed in `SwasthaParivar-Frontend-main/package.json`; component/hook tests must run cleanly via Node / available test utilities or lightweight non-disruptive tooling without destabilizing `package.json`.
    - Production `vite build`: blocked inside standard Windows sandbox (`EPERM realpath`); will evaluate out-of-sandbox execution or bundler verification explicitly and report honestly.
