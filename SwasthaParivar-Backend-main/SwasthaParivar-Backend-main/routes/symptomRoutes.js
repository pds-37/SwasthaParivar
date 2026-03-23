import express from "express";
import auth from "../middleware/auth.js";
import { createSymptomEpisode, listSymptomEpisodes } from "../controllers/symptomController.js";
import { validate } from "../middleware/validate.js";
import {
  symptomEpisodeBodySchema,
  symptomEpisodeQuerySchema,
} from "../validations/symptomSchemas.js";

const router = express.Router();

router.get("/episodes", auth, validate(symptomEpisodeQuerySchema, "query"), listSymptomEpisodes);
router.post("/episodes", auth, validate(symptomEpisodeBodySchema), createSymptomEpisode);

export default router;
