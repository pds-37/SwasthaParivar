import math
from fastapi.testclient import TestClient

from app.main import app
from app.services.model_service import CANONICAL_FEATURE_NAMES, model_manager


client = TestClient(app)

VALID_FEATURES = {
    "age_years": 62.0,
    "bmi_score": 28.5,
    "bp_systolic_mean_14d": 152.0,
    "bp_diastolic_mean_14d": 94.0,
    "bp_pulse_pressure": 58.0,
    "glucose_fasting_last": 190.0,
    "heart_rate_resting_mean_14d": 84.0,
    "sleep_hours_mean_7d": 5.2,
    "chronic_disease_count": 2,
    "medication_active_count": 4,
    "medication_adherence_rate_30d": 0.6,
    "previous_alerts_90d_count": 2,
    "emergency_episode_count_180d": 1,
    "activity_level_idx": 0,
    "smoking_status_flag": 0,
    "alcohol_consumption_idx": 0,
    "has_cardiac_family_history": 1,
}


def test_health_endpoint_reports_loaded_artifacts():
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "UP"
    assert body["modelsLoaded"] is True
    assert body["modelVersion"] == "v2.6.0-production-leak-free-audited"


def test_valid_feature_prediction_and_schema():
    res = client.post(
        "/api/v1/predict",
        json={"memberId": "507f1f77bcf86cd799439011", "features": VALID_FEATURES},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["modelVersion"] == "v2.6.0-production-leak-free-audited"
    assert data["featureSchema"] == "uci-17-v1"
    assert data["primaryPrediction"]["riskLevel"] in {"LOW_RISK", "MEDIUM_RISK", "HIGH_RISK"}
    assert 0.0 <= data["benchmarkValidation"]["calibratedProbability"] <= 1.0
    assert len(data["explainableDecision"]["decisionPath"]) >= 2
    assert "NOT a clinical diagnosis" in data["clinicalDisclaimer"]


def test_feature_ordering_matches_trained_preprocessor():
    assert hasattr(model_manager.preprocessor, "feature_names_in_")
    trained_order = list(model_manager.preprocessor.feature_names_in_)
    assert trained_order == CANONICAL_FEATURE_NAMES
    assert len(CANONICAL_FEATURE_NAMES) == 17


def test_missing_or_invalid_or_extra_features_rejected():
    # Missing required systolic BP
    incomplete = dict(VALID_FEATURES)
    incomplete.pop("bp_systolic_mean_14d")
    res_missing = client.post(
        "/api/v1/predict",
        json={"memberId": "m1", "features": incomplete},
    )
    assert res_missing.status_code == 422

    # Out-of-range blood pressure
    bad_range = dict(VALID_FEATURES)
    bad_range["bp_systolic_mean_14d"] = 999.0
    res_range = client.post(
        "/api/v1/predict",
        json={"memberId": "m1", "features": bad_range},
    )
    assert res_range.status_code == 422

    # Extra unmodeled feature such as spO2 is explicitly rejected rather than silently ignored
    extra_field = dict(VALID_FEATURES)
    extra_field["spO2"] = 95.0
    res_extra = client.post(
        "/api/v1/predict",
        json={"memberId": "m1", "features": extra_field},
    )
    assert res_extra.status_code == 422


def test_nan_or_infinity_rejected():
    payload = '{"memberId": "m1", "features": ' + str(
        {**VALID_FEATURES, "age_years": 45.0}
    ).replace("'", '"') + "}"
    # Direct schema check via PatientFeatures
    from pydantic import ValidationError
    from app.schemas.prediction_schema import PatientFeatures

    try:
        PatientFeatures(**{**VALID_FEATURES, "age_years": math.nan})
        assert False, "Expected NaN validation failure"
    except ValidationError:
        pass


def test_model_not_ready_returns_strict_503():
    original_ready = model_manager.models_ready
    model_manager.models_ready = False
    try:
        res = client.post(
            "/api/v1/predict",
            json={"memberId": "m1", "features": VALID_FEATURES},
        )
        assert res.status_code == 503
        assert res.json()["detail"]["status"] == "MODEL_NOT_READY"
    finally:
        model_manager.models_ready = original_ready
