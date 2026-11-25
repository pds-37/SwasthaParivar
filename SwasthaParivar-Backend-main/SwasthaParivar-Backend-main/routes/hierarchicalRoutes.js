import express from "express";
import {
  listHealthStates,
  getHealthStateById,
  transformRawSignal,
  ingestMultiSourceEvidence,
  evaluateConvergence,
  triggerStateTransition,
  getDistrictOverview,
  getStateOverview,
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
import auth from "../middleware/auth.js";
import { PERMISSIONS, requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.js";
import {
  ashaSurveySchema,
  capacityIdParamSchema,
  convergenceEvaluateSchema,
  createFacilitySchema,
  dispatchInterventionSchema,
  healthStateIdParamSchema,
  healthStateTransitionParamSchema,
  interventionFeedbackSchema,
  updateCapacitySchema,
} from "../validations/hierarchicalSchemas.js";

const router = express.Router();

// Enforce authentication on every hierarchical endpoint
router.use(auth);

// --- Health States & Convergence Routes ---
router.get("/states", requirePermission(PERMISSIONS.STATES_READ), listHealthStates);
router.get(
  "/states/:id",
  requirePermission(PERMISSIONS.STATES_READ),
  validate(healthStateIdParamSchema, "params"),
  getHealthStateById
);
router.post("/transform", requirePermission(PERMISSIONS.SIGNAL_TRANSFORM), transformRawSignal);
router.post("/evidence/ingest", requirePermission(PERMISSIONS.EVIDENCE_INGEST), ingestMultiSourceEvidence);
router.post(
  "/convergence/evaluate",
  requirePermission(PERMISSIONS.CONVERGENCE_EVALUATE),
  validate(convergenceEvaluateSchema),
  evaluateConvergence
);
router.post(
  "/states/:healthStateId/transition",
  requirePermission(PERMISSIONS.STATE_TRANSITION),
  validate(healthStateTransitionParamSchema, "params"),
  triggerStateTransition
);

// --- Public Health Macro Intelligence & Command Center ---
router.get("/district/overview", requirePermission(PERMISSIONS.DISTRICT_OVERVIEW), getDistrictOverview);
router.get("/state/overview", requirePermission(PERMISSIONS.STATE_OVERVIEW), getStateOverview);

// --- ASHA Worker Field Portal Routes ---
router.get("/asha/tasks", requirePermission(PERMISSIONS.ASHA_TASKS_VIEW), getAshaTasks);
router.post(
  "/asha/survey",
  requirePermission(PERMISSIONS.SURVEY_SUBMIT),
  validate(ashaSurveySchema),
  submitAshaSurvey
);

// --- Capacity & Facility Routes ---
router.get("/capacity", requirePermission(PERMISSIONS.CAPACITY_READ), getCapacity);
router.put(
  "/capacity/:id",
  requirePermission(PERMISSIONS.CAPACITY_WRITE),
  validate(capacityIdParamSchema, "params"),
  validate(updateCapacitySchema),
  updateCapacityMetrics
);
router.get("/facilities", requirePermission(PERMISSIONS.FACILITY_READ), listFacilities);
router.post(
  "/facilities",
  requirePermission(PERMISSIONS.FACILITY_CREATE),
  validate(createFacilitySchema),
  createFacility
);

// --- Level-Specific Interventions & Closed-Loop Feedback ---
router.get("/interventions", requirePermission(PERMISSIONS.INTERVENTION_READ), listInterventions);
router.post(
  "/interventions/dispatch",
  requirePermission(PERMISSIONS.INTERVENTION_DISPATCH),
  validate(dispatchInterventionSchema),
  dispatchIntervention
);
router.post(
  "/interventions/:id/feedback",
  requirePermission(PERMISSIONS.INTERVENTION_FEEDBACK),
  validate(capacityIdParamSchema, "params"),
  validate(interventionFeedbackSchema),
  submitPostInterventionFeedback
);

export default router;
