import express from "express";
import multer from "multer";
import auth from "../middleware/auth.js";
import { analyzeReport, downloadReport, listReports, uploadReport } from "../controllers/reportController.js";
import { requireFeature } from "../middleware/planGuard.js";
import { validate } from "../middleware/validate.js";
import {
  reportDownloadQuerySchema,
  reportListQuerySchema,
  reportParamsSchema,
  reportUploadBodySchema,
} from "../validations/reportSchemas.js";
import { MAX_UPLOAD_BYTES } from "../utils/fileUpload.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
});

const router = express.Router();

router.get("/", auth, validate(reportListQuerySchema, "query"), listReports);
router.post("/upload", auth, upload.single("file"), validate(reportUploadBodySchema), uploadReport);
router.post(
  "/:id/analyse",
  auth,
  validate(reportParamsSchema, "params"),
  requireFeature("reportAiAnalysis"),
  analyzeReport
);
router.get(
  "/:id/download",
  auth,
  validate(reportParamsSchema, "params"),
  validate(reportDownloadQuerySchema, "query"),
  downloadReport
);

export default router;
