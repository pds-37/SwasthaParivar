import express from "express";
import healthRecordController from "../controllers/HealthRecordController.js";
import { validate } from "../middleware/validate.js";
import {
  healthListQuerySchema,
  healthParamsSchema,
  healthRecordSchema,
} from "../validations/healthSchemas.js";

const router = express.Router();

router.post(
  "/:memberId",
  validate(healthParamsSchema, "params"),
  validate(healthRecordSchema),
  (req, res) => healthRecordController.create(req, res)
);
router.get(
  "/:memberId",
  validate(healthParamsSchema, "params"),
  validate(healthListQuerySchema, "query"),
  (req, res) => healthRecordController.list(req, res)
);

export default router;
