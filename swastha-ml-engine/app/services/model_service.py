"""
SwasthaParivar ML Engine - Singleton ModelManager & Inference Service
=====================================================================
Mandatory Architectural Compliance:
-----------------------------------
1. SINGLETON MODEL MANAGER: Loads Scikit-Learn .joblib artifacts and preprocessor exactly once
   during application startup. Prevents duplicate disk I/O and shared memory leaks.
2. ZERO FAKE PREDICTIONS (NO FALLBACK MATH): If model artifacts are unavailable, this engine never
   pretends to be an ML model. It raises an explicit HTTP 503 (MODEL_NOT_READY) error.
   Graceful degradation is handled entirely by the Node.js API client via our Clinical Rules Engine.
3. SINGLE INDEPENDENT PREPROCESSING PIPELINE: Every incoming feature vector undergoes an immutable transformation:
   JSON ➔ Pandas DataFrame ➔ preprocessor.transform() ➔ Fed identically to Random Forest, LogReg, & Decision Tree.
"""

import os
import time
import json
import logging
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import joblib
from fastapi import HTTPException, status

from app.schemas.prediction_schema import (
    PredictionRequest,
    UnifiedInferenceResponse,
    RandomForestPrediction,
    LogisticRegressionBenchmark,
    DecisionTreeExplanation
)
from app.services.explainability_service import DecisionTreeExplainer

logger = logging.getLogger("uvicorn")

# Immutable ordered feature list matching our real public healthcare database mappings
CANONICAL_FEATURE_NAMES: List[str] = [
    "age_years",
    "bmi_score",
    "bp_systolic_mean_14d",
    "bp_diastolic_mean_14d",
    "bp_pulse_pressure",
    "glucose_fasting_last",
    "heart_rate_resting_mean_14d",
    "sleep_hours_mean_7d",
    "chronic_disease_count",
    "medication_active_count",
    "medication_adherence_rate_30d",
    "previous_alerts_90d_count",
    "emergency_episode_count_180d",
    "activity_level_idx",
    "smoking_status_flag",
    "alcohol_consumption_idx",
    "has_cardiac_family_history"
]

class ModelManager:
    """
    Dedicated Singleton ModelManager responsible for artifact lifecycle, preprocessor management,
    version checking, and multi-model prediction evaluation without duplicate disk loading.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance._is_initialized = False
            cls._instance.load_all_artifacts()
        return cls._instance

    def load_all_artifacts(self):
        """
        Loads preprocessor, Random Forest, Logistic Regression, Decision Tree, and metadata exactly once on startup.
        """
        base_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models")
        self.preprocessor_path = os.path.join(base_path, "preprocessor.joblib")
        self.rf_path = os.path.join(base_path, "rf_risk_classifier.joblib")
        self.logreg_path = os.path.join(base_path, "logreg_benchmark.joblib")
        self.dt_path = os.path.join(base_path, "dt_explainer.joblib")
        self.metadata_path = os.path.join(base_path, "metadata.json")

        self.preprocessor = None
        self.rf_model = None
        self.logreg_model = None
        self.dt_model = None
        self.metadata = {}
        self.models_ready = False

        try:
            required_files = [self.preprocessor_path, self.rf_path, self.logreg_path, self.dt_path]
            if all(os.path.exists(p) for p in required_files):
                logger.info("ModelManager: Loading Scikit-Learn .joblib artifacts into memory...")
                self.preprocessor = joblib.load(self.preprocessor_path)
                self.rf_model = joblib.load(self.rf_path)
                self.logreg_model = joblib.load(self.logreg_path)
                self.dt_model = joblib.load(self.dt_path)
                
                if os.path.exists(self.metadata_path):
                    with open(self.metadata_path, "r", encoding="utf-8") as mf:
                        self.metadata = json.load(mf)

                self.models_ready = True
                self._is_initialized = True
                logger.info("ModelManager: All production ML models successfully verified and loaded into RAM.")
            else:
                logger.warning(
                    "ModelManager: Serialized model artifacts (.joblib) are missing from /models. "
                    "Service status set to MODEL_NOT_READY. Predictions will return HTTP 503 until Phase 4 training completes."
                )
                self.models_ready = False
        except Exception as err:
            logger.error(f"ModelManager: Critical artifact boot loading fault: {str(err)}")
            self.models_ready = False

    def get_health_status(self) -> Dict[str, Any]:
        """
        Exposes precise readiness metrics for Kubernetes / Render liveliness and readiness probes.
        """
        return {
            "status": "UP" if self.models_ready else "MODEL_NOT_READY",
            "service": "SwasthaParivar Singleton ModelManager Engine",
            "modelsLoaded": self.models_ready,
            "modelVersion": self.metadata.get("modelVersion", "UNLOADED"),
            "trainingDate": self.metadata.get("trainingDate", "N/A"),
            "datasetSource": self.metadata.get("datasetSource", "UCI_Heart_Disease_Reference")
        }

    def predict(self, request: PredictionRequest) -> UnifiedInferenceResponse:
        """
        Executes multi-model clinical prediction across an independent preprocessed feature vector.
        """
        # MANDATORY RULE: If models are not loaded, immediately abort with HTTP 503. Never pretend or guess.
        if not self.models_ready or self.preprocessor is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "status": "MODEL_NOT_READY",
                    "message": "Serialized Scikit-Learn classification artifacts are not loaded into server memory. Execute Phase 4 training pipeline.",
                    "code": 503
                }
            )

        start_timer = time.perf_counter()

        # 1. Unpack JSON features into a dictionary and enforce canonical column array ordering
        raw_feature_dict = request.features.model_dump()
        ordered_values = [raw_feature_dict.get(name, 0.0) for name in CANONICAL_FEATURE_NAMES]
        
        # 2. Instantiate single-row Pandas DataFrame matching training schema
        feature_df = pd.DataFrame([ordered_values], columns=CANONICAL_FEATURE_NAMES)

        try:
            # 3. INDEPENDENT PREPROCESSING: Scale feature vector once via trained preprocessor
            X_scaled = self.preprocessor.transform(feature_df)

            # A. MODEL 1: RANDOM FOREST CLASSIFIER (Primary Healthcare Risk Production Engine)
            rf_pred_code = int(self.rf_model.predict(X_scaled)[0])
            rf_probs = self.rf_model.predict_proba(X_scaled)[0]
            
            class_map = {0: "LOW_RISK", 1: "MEDIUM_RISK", 2: "HIGH_RISK"}
            rf_label = class_map.get(rf_pred_code, "MEDIUM_RISK")
            
            rf_probs_dict = {
                "low": float(round(rf_probs[0], 4)) if len(rf_probs) > 0 else 0.0,
                "medium": float(round(rf_probs[1], 4)) if len(rf_probs) > 1 else 0.0,
                "high": float(round(rf_probs[2], 4)) if len(rf_probs) > 2 else 0.0
            }

            # B. MODEL 2: LOGISTIC REGRESSION ESTIMATOR (Calibrated Probability Benchmark)
            logreg_probs = self.logreg_model.predict_proba(X_scaled)[0]
            # Calculate deterioration probability P as sum of Medium (1) and High (2) risk probabilities
            if len(logreg_probs) == 3:
                calibrated_prob = float(round(logreg_probs[1] + logreg_probs[2], 4))
            elif len(logreg_probs) == 2:
                calibrated_prob = float(round(logreg_probs[1], 4))
            else:
                calibrated_prob = float(round(logreg_probs[0], 4))

            # Validate model concordance between Random Forest classification and Logistic Regression probability
            is_concordant = True
            if (rf_pred_code == 2 and calibrated_prob < 0.50) or (rf_pred_code == 0 and calibrated_prob > 0.65):
                is_concordant = False

            # C. MODEL 3: DECISION TREE CLASSIFIER (Explainability Decision Path Generator)
            explanation = DecisionTreeExplainer.extract_decision_path(
                dt_model=self.dt_model,
                raw_features_dict=raw_feature_dict,
                scaled_feature_array=X_scaled,
                feature_names=CANONICAL_FEATURE_NAMES,
                scaler=self.preprocessor
            )

        except Exception as exec_err:
            logger.error(f"Inference math fault during matrix transformation: {str(exec_err)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Matrix transformation error during Scikit-Learn inference: {str(exec_err)}"
            )

        elapsed_ms = round((time.perf_counter() - start_timer) * 1000.0, 3)

        return UnifiedInferenceResponse(
            status="SUCCESS",
            memberId=request.memberId,
            inferenceTimeMs=elapsed_ms,
            primaryPrediction=RandomForestPrediction(
                riskLevel=rf_label,
                riskClassCode=rf_pred_code,
                classProbabilities=rf_probs_dict,
                modelName=f"RandomForestClassifier_{self.metadata.get('modelVersion', 'v1')}"
            ),
            benchmarkValidation=LogisticRegressionBenchmark(
                calibratedProbability=calibrated_prob,
                modelName=f"LogisticRegression_{self.metadata.get('modelVersion', 'v1')}",
                isConcordantWithPrimary=is_concordant
            ),
            explainableDecision=DecisionTreeExplanation(
                decisionPath=explanation.get("decisionPath", []),
                modelName=f"DecisionTreeClassifier_{self.metadata.get('modelVersion', 'v1')}",
                summaryRule=explanation.get("summaryRule", "No rule generated.")
            )
        )

# Instantiate singleton ModelManager upon package execution
model_manager = ModelManager()
