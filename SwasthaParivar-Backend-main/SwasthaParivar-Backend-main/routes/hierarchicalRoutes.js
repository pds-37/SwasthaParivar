import express from "express";
import {
  listHealthStates,
  getHealthStateById,
  transformRawSignal,
  ingestMultiSourceEvidence,
  evaluateConvergence,
  triggerStateTransition,
  getDistrictOverview,
  getAshaTasks,
  submitAshaSurvey,
} from "../controllers/hierarchicalController.js";
import {
  getCapacity,
  updateCapacityMetrics,
  listFacilities,
  createFacility,
} from "../controllers/capacityController.js";
import {
  listInterventions,
  dispatchIntervention,
  submitPostInterventionFeedback,
} from "../controllers/interventionController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// --- Health States & Convergence Routes ---
router.get("/states", listHealthStates);
router.get("/states/:id", getHealthStateById);
router.post("/transform", authMiddleware, transformRawSignal);
router.post("/evidence/ingest", authMiddleware, ingestMultiSourceEvidence);
router.post("/convergence/evaluate", evaluateConvergence);
router.post("/states/:healthStateId/transition", authMiddleware, triggerStateTransition);

// --- Public Health Macro Intelligence & Command Center ---
router.get("/district/overview", getDistrictOverview);

// --- ASHA Worker Field Portal Routes ---
router.get("/asha/tasks", authMiddleware, getAshaTasks);
router.post("/asha/survey", authMiddleware, submitAshaSurvey);

// --- Capacity & Facility Routes ---
router.get("/capacity", getCapacity);
router.put("/capacity/:id", authMiddleware, updateCapacityMetrics);
router.get("/facilities", listFacilities);
router.post("/facilities", authMiddleware, createFacility);

// --- Level-Specific Interventions & Closed-Loop Feedback ---
router.get("/interventions", listInterventions);
router.post("/interventions/dispatch", authMiddleware, dispatchIntervention);
router.post("/interventions/:id/feedback", authMiddleware, submitPostInterventionFeedback);

export default router;
