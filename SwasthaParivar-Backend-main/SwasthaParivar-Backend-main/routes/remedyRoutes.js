import express from "express";
import auth from "../middleware/auth.js";
import { generateRemedy } from "../controllers/remedyController.js";
import { validate } from "../middleware/validate.js";
import { remedyGenerateSchema } from "../validations/remedySchemas.js";

const router = express.Router();

router.post("/generate", auth, validate(remedyGenerateSchema), generateRemedy);

export default router;
