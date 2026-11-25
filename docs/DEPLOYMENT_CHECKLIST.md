# Production Deployment Checklist

---

## 1. Environment Configuration

### Backend (`SwasthaParivar-Backend-main`)

| Variable | Required | Default / Notes |
|---|---|---|
| `NODE_ENV` | Yes | `"development"`, `"test"`, or `"production"` |
| `PORT` | Recommended | `5000` |
| `MONGO_URI` | Yes | MongoDB connection URI (fails fast on boot if unset) |
| `JWT_SECRET` | Yes | Strong random secret for access/refresh signing |
| `ENCRYPTION_KEYS` | Recommended (Prod) | Comma-separated versioned keys (`V1:<64 hex chars>`). Avoid ephemeral runtime fallback in production. |
| `HEALTH_SIGNAL_SALT` | Recommended (Prod) | Dedicated secret key for HMAC pseudonymous node tokens (`HH-*`); falls back to `JWT_SECRET` if unset |
| `CORS_ORIGINS` / `CLIENT_URLS` | Yes | Comma-separated allowed origins (e.g., `https://swastha-parivar-ten.vercel.app`) |
| `COOKIE_SAME_SITE` | Conditional | `"none"` in cross-origin prod HTTPS, `"strict"` locally |
| `REDIS_URL` | Recommended | Redis instance for distributed state / rate limiting |
| `GEMINI_API_KEY` / `GEMINI_API_KEYS` / `GEMINI_MODEL` | Optional | Enables AI insights/chat & report summarization |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Optional | Enables Web Push alerts (`trendAlerts`, `weeklyDigest`, interventions) |
| `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` | Optional | Email notifications & digest delivery |
| `ML_SERVICE_URL` / `ML_INFERENCE_TIMEOUT_MS` | Optional | `http://localhost:8000`, timeout clamped `50–2000` ms (`120` default) |
| `OBJECT_STORAGE_ENDPOINT` (`S3_ENDPOINT`) | Recommended (Prod) | Private S3 / Cloudflare R2 endpoint for medical report binaries |
| `OBJECT_STORAGE_BUCKET` (`S3_BUCKET`) | Conditional | Bucket name (enables `s3_r2` when all 4 object storage vars are set; otherwise falls back to `mongodb_buffer`) |
| `OBJECT_STORAGE_ACCESS_KEY_ID` (`S3_ACCESS_KEY_ID`) | Conditional | Access key ID with scoped bucket read/put/delete permissions |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` (`S3_SECRET_ACCESS_KEY`) | Conditional | Secret key for SigV4 signing |
| `OBJECT_STORAGE_REGION` (`S3_REGION`) / `OBJECT_STORAGE_SSE` | Optional | Defaults: `"auto"`, `"AES256"` |
| `SENTRY_DSN` / `SENTRY_ENVIRONMENT` / `APP_VERSION` | Optional | Error telemetry & release correlation |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Optional | OAuth sign-in |
| `PRIVACY_POLICY_VERSION` | Optional | Defaults to `"v1.0"` |

### Frontend (`SwasthaParivar-Frontend-main`)

| Variable | Notes |
|---|---|
| `VITE_API_URL` | Normalized by `sanitizeBaseUrl()` in [apiHelpers.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main/src/lib/apiHelpers.js); defaults to `/api` |
| `VITE_VAPID_PUBLIC_KEY` | Public Web Push key matching backend `VAPID_PUBLIC_KEY` |
| `VITE_SENTRY_DSN` / `VITE_APP_VERSION` | Optional frontend error tracking |

### ML Engine (`swastha-ml-engine`)

- Verify `models/preprocessor.joblib`, `models/rf_risk_classifier.joblib`, `models/logreg_benchmark.joblib`, `models/dt_explainer.joblib`, and `models/metadata.json` are bundled in the image/deploy target (`GET /health` must return `"status": "UP"` and `"modelsLoaded": true`).
- Confirm `allow_origins` in [app/main.py](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/swastha-ml-engine/app/main.py) includes your deployed Node backend origin.

---

## 2. Database & Role Migration Notes

1. **Legacy User Role Audit:** Before deploying strict RBAC, inspect existing `User` documents for non-canonical roles (e.g., `medical_officer`, `district_magistrate`, `pharmacist`) and map them to canonical values (`ROLES` in `config/roles.js`), ensuring elevated operators have valid `assignedScope` fields (`state`, `district`, `pincode`, `facilityId`). Fail-closed scope rules deny access if `assignedScope` is incomplete.
2. **Legacy Reports Migration:** Existing reports stored with `fileBuffer` (`storageProvider: "mongodb_buffer"` or unset) continue to read seamlessly via `readReportBuffer()`. Any new uploads after configuring `OBJECT_STORAGE_*` automatically store in `s3_r2` with SHA-256 checksums and AES-256 SSE headers.
3. **Sparse `dedupKey` Index on `EvidenceSignal`:** Allow Mongoose index synchronization (`EvidenceSignal.dedupKey` unique sparse index) during deployment.

---

## 3. Pre-Release Verification Commands

```powershell
# Backend syntax + full automated suite
cd SwasthaParivar-Backend-main/SwasthaParivar-Backend-main
npm run check
npm test

# Frontend lint, unit helpers, and production bundle
cd ../../SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main
node node_modules/eslint/bin/eslint.js src
node --test src/lib/bleGatt.test.js src/lib/permissions.test.js src/lib/api.test.js
node node_modules/vite/bin/vite.js build

# ML Engine tests
cd ../../swastha-ml-engine
python -m pytest -v
```
