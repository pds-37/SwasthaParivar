"""
SwasthaParivar ML Engine - REST API Prediction Routers
======================================================
Architectural Rationale:
------------------------
Routes incoming REST calls directly into our Singleton ModelManager engine.
Ensures zero duplicate disk loading, fast RAM evaluations, and strict HTTP 503 errors
if classification models have not yet been built and verified by Phase 4.
"""

from fastapi import APIRouter, status, HTTPException
from typing import Dict, Any
from datetime import datetime

from app.schemas.prediction_schema import PredictionRequest, UnifiedInferenceResponse
from app.services.model_service import model_manager

router = APIRouter(tags=["Health Inference & ML Analytics"])

@router.get(
    "/health", 
    status_code=status.HTTP_200_OK,
    summary="Health check & artifact readiness probe"
)
async def check_service_health() -> Dict[str, Any]:
    """
    Returns live health state, checking if Scikit-Learn .joblib artifacts are loaded into RAM.
    """
    health_status = model_manager.get_health_status()
    health_status["timestamp"] = datetime.utcnow().isoformat() + "Z"
    return health_status

@router.post(
    "/api/v1/predict", 
    response_model=UnifiedInferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute multi-model predictive clinical evaluation"
)
async def compute_health_prediction(payload: PredictionRequest) -> UnifiedInferenceResponse:
    """
    Ingests an individual household member's clinical telemetry and executes triple-model evaluation
    via the singleton ModelManager:
    1. **Random Forest Classifier**: Computes primary healthcare risk category (Low, Medium, High).
    2. **Logistic Regression**: Calculates continuous calibrated disease progression probability (P).
    3. **Decision Tree Explainer**: Extracts step-by-step logic nodes explaining why the alert fired.
    
    If models are not loaded, returns HTTP 503 (MODEL_NOT_READY).
    """
    return model_manager.predict(payload)
