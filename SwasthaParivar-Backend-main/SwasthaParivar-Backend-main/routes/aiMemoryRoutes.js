import express from "express";
import auth from "../middleware/auth.js";
import AIMemory from "../models/aimemorymodel.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { validate } from "../middleware/validate.js";
import { aiMemoryBodySchema, aiMemoryQuerySchema } from "../validations/aiSchemas.js";

const router = express.Router();

router.get("/", auth, validate(aiMemoryQuerySchema, "query"), async (req, res) => {
  try {
    const threads = await AIMemory.find({ ownerId: req.userId }).sort({ updatedAt: -1 });

    return sendSuccess(res, {
      data: {
        threads,
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
    const { threadId, member, title, messages } = req.body;
    let memory;

    if (threadId) {
      memory = await AIMemory.findOneAndUpdate(
        { _id: threadId, ownerId: req.userId },
        { $set: { messages, title: title || "New chat" } },
        { new: true, runValidators: true }
      );
    }

    if (!memory) {
      memory = await AIMemory.create({
        ownerId: req.userId,
        member,
        title: title || "New chat",
        messages,
      });
    }

    return sendSuccess(res, {
      data: {
        threadId: memory._id,
        member: memory.member,
        title: memory.title,
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

router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await AIMemory.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.userId
    });

    if (!result) {
      return sendError(res, { status: 404, message: "Thread not found" });
    }

    return sendSuccess(res, { data: { success: true } });
  } catch (error) {
    return sendError(res, {
      status: 500,
      message: "Failed to delete thread",
      details: error.message,
    });
  }
});

export default router;
