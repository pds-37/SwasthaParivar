import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKeys } from "../services/ai/geminiService.js";
import auth from "../middleware/auth.js";
import {
  analyzeAttachment,
  chatWithAI,
  listAIInsights,
  transcribeVoiceInput,
} from "../controllers/aiController.js";
import {
  createDoctorPacket,
  exportDoctorPacket,
  getDoctorPacket,
  listDoctorPackets,
} from "../controllers/doctorPacketController.js";
import { streamChatWithAI } from "../controllers/aiStreamController.js";
import appConfig from "../config/AppConfig.js";
import { requireFeature } from "../middleware/planGuard.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { validate } from "../middleware/validate.js";
import {
  aiAttachmentSchema,
  aiChatSchema,
  doctorPacketCreateSchema,
  doctorPacketParamsSchema,
  doctorPacketQuerySchema,
  aiInsightQuerySchema,
  aiStreamingChatSchema,
  aiVoiceTranscriptionSchema,
} from "../validations/aiSchemas.js";

const router = express.Router();

router.get("/models", auth, async (req, res) => {
  try {
    if (appConfig.isProduction) {
      return sendError(res, {
        status: 404,
        code: "ROUTE_NOT_FOUND",
        message: "Not found",
      });
    }

    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) throw new Error("No Gemini API key");
    const genAI = new GoogleGenerativeAI(apiKeys[0]);
    const models = await genAI.listModels();
    return sendSuccess(res, { data: models });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "MODEL_LIST_FAILED",
      message: "Failed to fetch models",
      details: error.message,
    });
  }
});

router.get("/insights", auth, validate(aiInsightQuerySchema, "query"), listAIInsights);
router.get("/doctor-packets", validate(doctorPacketQuerySchema, "query"), listDoctorPackets);
router.post("/doctor-packets", validate(doctorPacketCreateSchema), createDoctorPacket);
router.get(
  "/doctor-packets/:id",
  validate(doctorPacketParamsSchema, "params"),
  getDoctorPacket
);
router.get(
  "/doctor-packets/:id/export",
  validate(doctorPacketParamsSchema, "params"),
  exportDoctorPacket
);
router.post(
  "/",
  auth,
  aiRateLimiter.middleware(),
  validate(aiChatSchema),
  requireFeature("aiChat"),
  chatWithAI
);
router.post(
  "/chat",
  auth,
  aiRateLimiter.middleware(),
  validate(aiChatSchema),
  requireFeature("aiChat"),
  chatWithAI
);
router.post(
  "/chat/stream",
  auth,
  aiRateLimiter.middleware(),
  validate(aiStreamingChatSchema),
  requireFeature("aiChat"),
  streamChatWithAI
);
router.post(
  "/voice/transcribe",
  auth,
  aiRateLimiter.middleware(),
  validate(aiVoiceTranscriptionSchema),
  transcribeVoiceInput
);
router.post("/attachments", auth, aiRateLimiter.middleware(), validate(aiAttachmentSchema), analyzeAttachment);

export default router;
