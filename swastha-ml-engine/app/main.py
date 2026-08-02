"""
SwasthaParivar ML Engine - FastAPI Server Bootstrap & Lifecycle Gateway
=====================================================================
Architectural Rationale:
------------------------
This is the application root entry point for our Python FastAPI microservice.
It initializes high-performance ASGI event loops, applies Cross-Origin Resource Sharing (CORS)
rules to authorize requests exclusively from our Node.js API server ports, and mounts our prediction router.

Why FastAPI & Uvicorn:
----------------------
FastAPI paired with Uvicorn provides async execution throughput while supporting automatic concurrency.
By isolating ML dependencies here, our Express servers stay lightweight and immune to matrix memory leaks.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.prediction_router import router as prediction_router

# Configure industrial structured JSON logging matching Pino output syntax
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [SwasthaML-Engine] - %(message)s"
)
logger = logging.getLogger("uvicorn")

app = FastAPI(
    title="SwasthaParivar Machine Learning & Predictive Healthcare Engine",
    version="2.5.0-production",
    description=(
        "Production-grade traditional supervised machine learning inference engine. "
        "Integrates Random Forest, Logistic Regression, and Decision Trees into the SwasthaParivar Neuro-Symbolic architecture."
    ),
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS permissions for interoperability with local and cloud Node/Express backend gateways
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:8080",
        "https://swasthaparivar.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount primary inference routing namespace
app.include_router(prediction_router)

@app.on_event("startup")
async def on_application_startup():
    """
    Lifecycle event logging system readiness upon container boot.
    """
    logger.info("=========================================================================")
    logger.info(" SwasthaParivar Python ML Engine (Phase 3) Online")
    logger.info(" - Primary Engine: Random Forest Classifier (Multi-Variable Risk)")
    logger.info(" - Benchmark Engine: Logistic Regression (Calibrated Probabilities)")
    logger.info(" - Explainer Engine: Decision Tree (Boolean Branch Path Extraction)")
    logger.info(" - Final Triage Authority: External Symbolic Clinical Rules Engine")
    logger.info("=========================================================================")

@app.on_event("shutdown")
async def on_application_shutdown():
    logger.info("SwasthaParivar ML Engine shutting down gracefully. Closing ASGI threads.")
