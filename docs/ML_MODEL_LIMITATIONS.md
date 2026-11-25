# ML Engine Architecture, Integration & Limitations

> **Component:** `swastha-ml-engine` (Python + FastAPI + Scikit-Learn `2.6.0-production`) & Node integration [mlInferenceClient.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/services/ml/mlInferenceClient.js).

---

## 1. Implemented Model Suite & Verified Artifacts

`swastha-ml-engine/app/services/model_service.py` loads four frozen Scikit-Learn artifacts from `swastha-ml-engine/models/` once per worker process via singleton `ModelManager`:

1. `preprocessor.joblib` — Standard preprocessing pipeline shared identically across all three estimators.
2. `rf_risk_classifier.joblib` — Primary Random Forest risk classifier (`LOW_RISK`, `MEDIUM_RISK`, `HIGH_RISK`).
3. `logreg_benchmark.joblib` — Logistic Regression benchmark providing calibrated progression probability `P`.
4. `dt_explainer.joblib` — Shallow Decision Tree used by [explainability_service.py](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/swastha-ml-engine/app/services/explainability_service.py) (`DecisionTreeExplainer.extract_decision_path()`) to emit human-readable boolean decision paths.

### Offline Evaluation Metrics (`models/metadata.json`)

Trained via [train_pipeline.py](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/swastha-ml-engine/scripts/train_pipeline.py) on **920 records** derived from the UCI Heart Disease dataset:

| Model | Test Accuracy | ROC-AUC | Role in Architecture |
|---|---|---|---|
| Random Forest (`rf_risk_classifier.joblib`) | `0.663` | `0.8209` | Primary multiclass risk classification |
| Logistic Regression (`logreg_benchmark.joblib`) | `0.6304` | `0.7894` | Calibrated probability benchmark |
| Decision Tree (`dt_explainer.joblib`) | `0.538` | `0.7138` | Transparent rule-path explainer |

---

## 2. Canonical 17-Feature Schema & Exclusions

Both `ModelManager.CANONICAL_FEATURE_NAMES` and `PatientFeatures` in [prediction_schema.py](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/swastha-ml-engine/app/schemas/prediction_schema.py) enforce an immutable **17-feature numeric vector** with `ConfigDict(extra="forbid")` and `allow_inf_nan=False`:

`age_years`, `bmi_score`, `bp_systolic_mean_14d`, `bp_diastolic_mean_14d`, `bp_pulse_pressure`, `glucose_fasting_last`, `heart_rate_resting_mean_14d`, `sleep_hours_mean_7d`, `chronic_disease_count`, `medication_active_count`, `medication_adherence_rate_30d`, `previous_alerts_90d_count`, `emergency_episode_count_180d`, `activity_level_idx`, `smoking_status_flag`, `alcohol_consumption_idx`, `has_cardiac_family_history`.

### Explicit Technical Limitations

1. **No `spO2` Support in ML Inference:** Oxygen saturation (`spO2`) is absent from the UCI dataset and excluded from the 17-feature `.joblib` schema (`extractFeatures()` intentionally omits it). Hypoxia (`spO2 < 94%` / `<= 90%`) is instead handled deterministically by `healthTrendService.js` and `healthStateTransformer.js`.
2. **UCI Proxy Mappings:** Behavioral and longitudinal features such as `sleep_hours_mean_7d`, `medication_adherence_rate_30d`, `previous_alerts_90d_count`, and `emergency_episode_count_180d` are proxy-mapped during offline training in `train_pipeline.py` rather than learned from prospective Swastha Parivar longitudinal patient telemetry.
3. **Not a Standalone Diagnostic Classifier:** Accuracy (`0.538`–`0.663`) reflects moderate multi-class discrimination on a compact clinical proxy dataset. Outputs are strictly **decision-support signals** subordinate to deterministic clinical safety rules (`healthTrendService.js`, Neuro-Symbolic red-flag screening) and licensed clinician review.
4. **No On-Device Federated Learning / PCA Active:** Despite historical references in `README.md`, federated learning (`Flower`/`TFLite`) and edge PCA reconstruction are not implemented; inference executes centrally over HTTPS/JSON between Node and FastAPI.

---

## 3. Production Hardening Applied

- **BP String Parsing in Node Client:** `extractFeatures()` in [mlInferenceClient.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/services/ml/mlInferenceClient.js) now uses `parseBloodPressureReading()` so `"sys/dia"` strings from `FamilyMember.health.bloodPressure` no longer fall back to `128/82` defaults.
- **Fail-Closed Validation & Strict 503:** FastAPI uses Pydantic v2 strict `extra="forbid"`, `allow_inf_nan=False`, timezone-aware UTC timestamps, `@asynccontextmanager lifespan` in [main.py](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/swastha-ml-engine/app/main.py), and raises `HTTP 503 MODEL_NOT_READY` if artifacts fail to load rather than fabricating scores.
- **Fault-Tolerant Degraded Mode:** Node configures timeout via `ML_INFERENCE_TIMEOUT_MS` (`50–2000`ms, default `120`ms), retries once on transient network errors, permits nullable `userId` in [mlpredictionaudit.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/models/mlpredictionaudit.js), and falls back cleanly (`mlAvailable: false`, `prediction: "MODEL_NOT_READY"`) without blocking patient workflows.
