import express from "express";
import auth from "../middleware/auth.js";
import AIMemory from "../models/aimemorymodel.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { validate } from "../middleware/validate.js";
import { aiMemoryBodySchema, aiMemoryQuerySchema } from "../validations/aiSchemas.js";

const router = express.Router();

router.get("/", auth, validate(aiMemoryQuerySchema, "query"), async (req, res) => {
  try {
    const member = req.query.member || "Self";
    const memory = await AIMemory.findOne({ ownerId: req.userId, member });

    return sendSuccess(res, {
      data: {
        messages: memory?.messages || [],
      },
    });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "AI_MEMORY_LOAD_FAILED",
      message: "Failed to load memory",
      details: error.message,
    });
  }
});

router.post("/", auth, validate(aiMemoryBodySchema), async (req, res) => {
  try {
    const { member, messages } = req.body;
    const memory = await AIMemory.findOneAndUpdate(
      { ownerId: req.userId, member },
      { $set: { messages } },
      { new: true, upsert: true, runValidators: true }
    );

    return sendSuccess(res, {
      data: {
        messages: memory.messages,
      },
    });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "AI_MEMORY_SAVE_FAILED",
      message: "Failed to save memory",
      details: error.message,
    });
  }
});

export default router;
