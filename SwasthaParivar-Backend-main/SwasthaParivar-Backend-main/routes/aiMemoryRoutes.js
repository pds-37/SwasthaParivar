import express from "express";
import auth from "../middleware/auth.js";
import AIMemory from "../models/aimemorymodel.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { validate } from "../middleware/validate.js";
import { aiMemoryBodySchema, aiMemoryQuerySchema } from "../validations/aiSchemas.js";

const router = express.Router();
const MEMORY_MESSAGE_LIMIT = 40;
const MEMORY_ATTACHMENT_PREVIEW_MAX = 250000;

const normalizeTriageSummary = (triageSummary) => {
  if (!triageSummary || typeof triageSummary !== "object") {
    return null;
  }

  return {
    tier: String(triageSummary.tier || "").trim().slice(0, 32),
    label: String(triageSummary.label || "").trim().slice(0, 120),
    action: String(triageSummary.action || "").trim().slice(0, 240),
    contextSignals: Array.isArray(triageSummary.contextSignals)
      ? triageSummary.contextSignals.map((item) => String(item).trim().slice(0, 160)).filter(Boolean).slice(0, 6)
      : [],
    profileGaps: Array.isArray(triageSummary.profileGaps)
      ? triageSummary.profileGaps.map((item) => String(item).trim().slice(0, 120)).filter(Boolean).slice(0, 5)
      : [],
    doctorPacket: Array.isArray(triageSummary.doctorPacket)
      ? triageSummary.doctorPacket.map((item) => String(item).trim().slice(0, 220)).filter(Boolean).slice(0, 6)
      : [],
    trendFlags: Array.isArray(triageSummary.trendFlags)
      ? triageSummary.trendFlags.map((item) => String(item).trim().slice(0, 220)).filter(Boolean).slice(0, 6)
      : [],
    sourceReferences: Array.isArray(triageSummary.sourceReferences)
      ? triageSummary.sourceReferences.slice(0, 6).map((ref) => ({
          title: String(ref?.title || "").trim().slice(0, 160),
          source: String(ref?.source || "").trim().slice(0, 220),
          url: String(ref?.url || "").trim().slice(0, 500),
        }))
      : [],
  };
};

const normalizeIntakeQuestions = (intakeQuestions = []) =>
  Array.isArray(intakeQuestions)
    ? intakeQuestions
        .map((question) => {
          const prompt = String(question?.prompt || "").trim().slice(0, 300);

          if (!prompt) {
            return null;
          }

          return {
            id: String(question?.id || prompt).trim().slice(0, 60),
            label: String(question?.label || "Add context").trim().slice(0, 80),
            prompt,
          };
        })
        .filter(Boolean)
        .slice(0, 4)
    : [];

const normalizeStoredMessages = (messages = []) =>
  Array.isArray(messages)
    ? messages
        .map((message) => {
          const text = String(message?.text || "").trim().slice(0, 12000);

          if (!text) {
            return null;
          }

          return {
            sender: message?.sender === "user" ? "user" : "ai",
            text,
            ts: Number.isFinite(message?.ts) ? message.ts : Date.now(),
            attachment:
              typeof message?.attachment === "string" &&
              message.attachment.length <= MEMORY_ATTACHMENT_PREVIEW_MAX
                ? message.attachment
                : null,
            riskLevel: message?.riskLevel ? String(message.riskLevel).trim().slice(0, 32) : null,
            triageSummary: normalizeTriageSummary(message?.triageSummary),
            intakeQuestions: normalizeIntakeQuestions(message?.intakeQuestions),
            followUpPrompt: message?.followUpPrompt
              ? String(message.followUpPrompt).trim().slice(0, 400)
              : null,
            suggestedReminder: message?.suggestedReminder?.title
              ? {
                  title: String(message.suggestedReminder.title).trim().slice(0, 160),
                  type: message.suggestedReminder.type
                    ? String(message.suggestedReminder.type).trim().slice(0, 60)
                    : "",
                }
              : null,
          };
        })
        .filter(Boolean)
        .slice(-MEMORY_MESSAGE_LIMIT)
    : [];

const serializeThread = (thread) => {
  const normalizedThread = typeof thread?.toObject === "function" ? thread.toObject() : thread;

  return {
    _id: normalizedThread?._id,
    member: normalizedThread?.member || "All family",
    contextKey: normalizedThread?.contextKey || normalizedThread?.member || "family",
    title: normalizedThread?.title || "New chat",
    messages: normalizeStoredMessages(normalizedThread?.messages),
    createdAt: normalizedThread?.createdAt || null,
    updatedAt: normalizedThread?.updatedAt || null,
  };
};

router.get("/", auth, validate(aiMemoryQuerySchema, "query"), async (req, res) => {
  try {
    const { contextKey, member } = req.query || {};
    const filter = { ownerId: req.userId };

    if (contextKey && member) {
      filter.$or = [{ contextKey }, { member }];
    } else if (contextKey) {
      filter.$or = [{ contextKey }, { member: contextKey }];
    } else if (member) {
      filter.$or = [{ contextKey: member }, { member }];
    }

    const threads = await AIMemory.find(filter)
      .sort({ updatedAt: -1 })
      .select("_id member contextKey title messages createdAt updatedAt")
      .lean();

    return sendSuccess(res, {
      data: {
        threads: threads.map(serializeThread),
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
    const { threadId, member, contextKey, title, messages } = req.body;
    const safeMessages = normalizeStoredMessages(messages);
    const safeContextKey = String(contextKey || member || "family").trim();
    const safeMember = String(member || "All family").trim();
    const safeTitle = String(title || "").trim() || "New chat";
    let memory;

    if (threadId) {
      memory = await AIMemory.findOneAndUpdate(
        { _id: threadId, ownerId: req.userId },
        {
          $set: {
            member: safeMember,
            contextKey: safeContextKey,
            title: safeTitle,
            messages: safeMessages,
          },
        },
        { new: true, runValidators: true }
      );
    }

    if (!memory) {
      memory = await AIMemory.create({
        ownerId: req.userId,
        member: safeMember,
        contextKey: safeContextKey,
        title: safeTitle,
        messages: safeMessages,
      });
    }

    const serializedThread = serializeThread(memory);

    return sendSuccess(res, {
      data: {
        threadId: serializedThread._id,
        member: serializedThread.member,
        contextKey: serializedThread.contextKey,
        title: serializedThread.title,
        messages: serializedThread.messages,
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
