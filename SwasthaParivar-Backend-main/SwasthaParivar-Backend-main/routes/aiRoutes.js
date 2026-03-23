import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import auth from "../middleware/auth.js";
import { analyzeAttachment, chatWithAI, listAIInsights } from "../controllers/aiController.js";
import appConfig from "../config/AppConfig.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { validate } from "../middleware/validate.js";
import { aiAttachmentSchema, aiChatSchema, aiInsightQuerySchema } from "../validations/aiSchemas.js";

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

    const genAI = new GoogleGenerativeAI(appConfig.geminiApiKey);
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
router.post("/", auth, aiRateLimiter.middleware(), validate(aiChatSchema), chatWithAI);
router.post("/chat", auth, aiRateLimiter.middleware(), validate(aiChatSchema), chatWithAI);
router.post("/attachments", auth, aiRateLimiter.middleware(), validate(aiAttachmentSchema), analyzeAttachment);

export default router;
