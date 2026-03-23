import express from "express";
import { generateRemedy } from "../controllers/remedyController.js";
import { validate } from "../middleware/validate.js";
import { remedyGenerateSchema } from "../validations/remedySchemas.js";

const router = express.Router();

router.post("/generate", validate(remedyGenerateSchema), generateRemedy);

export default router;
