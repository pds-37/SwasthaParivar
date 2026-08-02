"""
SwasthaParivar ML Engine - Pydantic Inference Schemas
=====================================================
Architectural Rationale:
------------------------
This file defines the immutable JSON type contracts between our Node.js Express API gateway
and this Python FastAPI inference microservice. 

By enforcing rigorous Pydantic Field validation boundaries at the ingestion edge:
1. We eliminate silent TypeError corruption during Scikit-Learn matrix transformations.
2. We prevent outlier typographical injection attacks (e.g., Systolic BP > 500 mmHg) before execution.
3. We provide exhaustive runtime self-documentation for clinical consulting review teams.

Security & Privacy Implications:
--------------------------------
Notice that zero personal demographic identifiers (patient name, email, addresses, SSN/Aadhaar)
are accepted or modeled here. All features represent de-identified numerical clinical telemetry.
"""

from pydantic import BaseModel, Field, conint, confloat
from typing import List, Optional, Dict, Any
from datetime import datetime

class PatientFeatures(BaseModel):
    """
    Exhaustive feature vector representing a household member's physiological condition,
    historical medication therapy compliance, and chronic morbidity profile.
    """
    age_years: float = Field(
        ..., 
        ge=0.0, 
        le=120.0, 
        description="Chronological age of patient in years. Primary driver of arterial aging and metabolic vulnerability."
    )
    bmi_score: float = Field(
        ..., 
        ge=10.0, 
        le=70.0, 
        description="Body Mass Index computed from height and weight. Direct marker for diabetes and cardiovascular stress."
    )
    bp_systolic_mean_14d: float = Field(
        ..., 
        ge=60.0, 
        le=260.0, 
        description="14-day rolling arithmetic mean of systolic blood pressure (mmHg). High values (>140) indicate severe vascular resistance."
    )
    bp_diastolic_mean_14d: float = Field(
        ..., 
        ge=30.0, 
        le=160.0, 
        description="14-day rolling arithmetic mean of diastolic blood pressure (mmHg). Measures baseline resting arterial tone."
    )
    bp_pulse_pressure: float = Field(
        ..., 
        ge=10.0, 
        le=150.0, 
        description="Derived differential (Systolic minus Diastolic). Values >=60 signal arterial stiffness and cardiac strain."
    )
    glucose_fasting_last: float = Field(
        ..., 
        ge=30.0, 
        le=600.0, 
        description="Most recent verified fasting blood glucose observation (mg/dL). Primary marker for hyperglycemic crises."
    )
    heart_rate_resting_mean_14d: float = Field(
        ..., 
        ge=30.0, 
        le=220.0, 
        description="14-day rolling mean of resting heart rate (bpm). Chronic elevation (>85 bpm) indicates autonomic stress."
    )
    sleep_hours_mean_7d: float = Field(
        ..., 
        ge=0.0, 
        le=24.0, 
        description="7-day rolling mean of nightly sleep hours. Deprivation (<5.5 hrs) inflames cortisol and insulin resistance."
    )
    chronic_disease_count: int = Field(
        0, 
        ge=0, 
        le=20, 
        description="Count of active diagnosed conditions (diabetes, hypertension, asthma, ckd). Measures baseline morbidity."
    )
    medication_active_count: int = Field(
        0, 
        ge=0, 
        le=30, 
        description="Count of active medication regimens. Polypharmacy (>=5) elevates adverse interaction and drop-off risks."
    )
    medication_adherence_rate_30d: float = Field(
        0.85, 
        ge=0.0, 
        le=1.0, 
        description="Ratio of medication reminder doses completed on time over the past 30 days (0.0 = total default, 1.0 = perfect)."
    )
    previous_alerts_90d_count: int = Field(
        0, 
        ge=0, 
        le=100, 
        description="Count of previous AI analytical anomaly alerts generated over the preceding 90-day monitoring window."
    )
    emergency_episode_count_180d: int = Field(
        0, 
        ge=0, 
        le=50, 
        description="Count of severe symptom episodes or emergency rule overrides documented over the preceding 180 days."
    )
    activity_level_idx: int = Field(
        1, 
        ge=0, 
        le=3, 
        description="Ordinal physical activity category (0=sedentary, 1=light, 2=moderate, 3=vigorous)."
    )
    smoking_status_flag: int = Field(
        0, 
        ge=0, 
        le=1, 
        description="Binary smoking indicator (0=non-smoker/former, 1=active smoker). Key causal vector for arterial thrombosis."
    )
    alcohol_consumption_idx: int = Field(
        0, 
        ge=0, 
        le=2, 
        description="Ordinal alcohol ingestion index (0=none, 1=moderate, 2=heavy chronic ingestion)."
    )
    has_cardiac_family_history: int = Field(
        0, 
        ge=0, 
        le=1, 
        description="Binary cardiac family history flag (1=positive parental heart attack/stroke history, 0=none/unknown)."
    )

    class Config:
        json_schema_extra = {
            "example": {
                "age_years": 62.0,
                "bmi_score": 28.5,
                "bp_systolic_mean_14d": 146.0,
                "bp_diastolic_mean_14d": 92.0,
                "bp_pulse_pressure": 54.0,
                "glucose_fasting_last": 184.0,
                "heart_rate_resting_mean_14d": 80.0,
                "sleep_hours_mean_7d": 5.0,
                "chronic_disease_count": 2,
                "medication_active_count": 4,
                "medication_adherence_rate_30d": 0.55,
                "previous_alerts_90d_count": 3,
                "emergency_episode_count_180d": 1,
                "activity_level_idx": 0,
                "smoking_status_flag": 0,
                "alcohol_consumption_idx": 0,
                "has_cardiac_family_history": 1
            }
        }


class PredictionRequest(BaseModel):
    """
    Inbound request schema received from Node.js Express Backend.
    """
    memberId: str = Field(..., description="Mongoose ObjectId representing the target family member.")
    features: PatientFeatures = Field(..., description="Numerical feature matrix payload to be processed independently by all 3 models.")


class RandomForestPrediction(BaseModel):
    """
    Output model for Random Forest primary classification decision.
    """
    riskLevel: str = Field(..., description="Classification String (LOW_RISK, MEDIUM_RISK, HIGH_RISK). Primary prediction engine output.")
    riskClassCode: int = Field(..., ge=0, le=2, description="Ordinal class code: 0=Low, 1=Medium, 2=High.")
    classProbabilities: Dict[str, float] = Field(..., description="Voting consensus proportion across Random Forest ensemble trees.")
    modelName: str = Field("RandomForestClassifier_Primary", description="Model architecture descriptor.")


class LogisticRegressionBenchmark(BaseModel):
    """
    Output model for Logistic Regression benchmark probabilistic validator.
    """
    calibratedProbability: float = Field(..., ge=0.0, le=1.0, description="Continuous log-odds probability of clinical deterioration.")
    modelName: str = Field("LogisticRegression_CalibratedBenchmark", description="Benchmark engine descriptor.")
    isConcordantWithPrimary: bool = Field(..., description="True if benchmark probability alignment agrees with Random Forest classification.")


class DecisionTreeExplanation(BaseModel):
    """
    Output model for Decision Tree structural rule extraction.
    """
    decisionPath: List[str] = Field(..., description="Sequential Boolean logic splits extracted directly from Decision Tree node traversal.")
    modelName: str = Field("DecisionTreeClassifier_Explainer", description="Explainability engine descriptor.")
    summaryRule: str = Field(..., description="Combined Boolean human-readable explanation rule for physician review and Gemini narration.")


class UnifiedInferenceResponse(BaseModel):
    """
    Complete, backward-compatible response returned by FastAPI to Node.js.
    Unifies primary classification, calibrated probability, and explainable pathing.
    """
    status: str = Field("SUCCESS", description="Execution status.")
    memberId: str = Field(..., description="Target patient identifier echoed back for async tracking.")
    inferenceTimeMs: float = Field(..., description="Milliseconds required to compute transformations and evaluate all three models.")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z", description="ISO-8601 execution time.")
    primaryPrediction: RandomForestPrediction
    benchmarkValidation: LogisticRegressionBenchmark
    explainableDecision: DecisionTreeExplanation
    clinicalDisclaimer: str = Field(
        "Notice: Predictive machine learning scores are additive analytical indicators. The deterministic Symbolic Clinical Rules Engine retains final triage authority.",
        description="Mandatory legal and clinical safety disclaimer."
    )
