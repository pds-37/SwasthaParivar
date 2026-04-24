import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  assessRisk,
  buildFallbackResponse,
  buildFollowUpPrompt,
  buildPrompt,
  buildSuggestedReminder,
  triageCheck,
} from "../aiOrchestrator.js";
import householdService from "../services/household/HouseholdService.js";
import { logger } from "../utils/logger.js";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const chunkText = (text, size = 28) => {
  const normalized = String(text || "");
  const chunks = [];

  for (let index = 0; index < normalized.length; index += size) {
    chunks.push(normalized.slice(index, index + size));
  }

  return chunks;
};

const writeEvent = (res, payload) => {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loadMember = async (userId, memberId) => {
  if (!memberId) {
    return null;
  }

  const result = await householdService.findAccessibleMember(userId, memberId);
  if (!result?.member) {
    return null;
  }

  return typeof result.member.toObject === "function"
    ? result.member.toObject()
    : result.member;
};

export const streamChatWithAI = async (req, res) => {
  const { message, memberId, collectedData, chatHistory, language } = req.body || {};

  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Message is required",
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 15000);

  try {
    const member = await loadMember(req.userId, memberId);
    const triage = triageCheck(message, member?.age);

    if (triage.stopProcessing) {
      writeEvent(res, {
        token: triage.response,
        done: true,
        riskLevel: "EMERGENCY",
        followUpPrompt: buildFollowUpPrompt(message, { level: "EMERGENCY" }),
        suggestedReminder: buildSuggestedReminder(message, member),
        reply: triage.response,
      });
      return res.end();
    }

    const risk = assessRisk(message, member);
    const followUpPrompt = buildFollowUpPrompt(message, risk);
    const suggestedReminder = buildSuggestedReminder(message, member);
    const prompt = buildPrompt(
      member,
      "symptom_check",
      {},
      collectedData || {},
      risk,
      chatHistory || [],
      language || "en"
    );

    let fullResponse = "";
    let usedFallback = false;

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
      const streamResult = await model.generateContentStream(prompt);

      for await (const chunk of streamResult.stream) {
        const token = chunk.text();
        if (!token) {
          continue;
        }

        fullResponse += token;
        writeEvent(res, {
          token,
          done: false,
          riskLevel: risk.level,
        });
      }
    } catch (error) {
      usedFallback = true;
      fullResponse = buildFallbackResponse(message, member, risk);

      logger.warn({
        route: "ai-chat-stream",
        userId: req.userId,
        error: {
          message: error?.message || "Streaming failed, using fallback",
        },
      });

      for (const token of chunkText(fullResponse)) {
        writeEvent(res, {
          token,
          done: false,
          riskLevel: risk.level,
        });
        await sleep(10);
      }
    }

    writeEvent(res, {
      token: "",
      done: true,
      riskLevel: risk.level,
      followUpPrompt,
      suggestedReminder,
      reply: fullResponse,
      fallback: usedFallback,
    });
    return res.end();
  } catch (error) {
    logger.error({
      route: "ai-chat-stream",
      userId: req.userId || null,
      error: {
        message: error?.message || "AI streaming failed",
        stack: error?.stack || null,
      },
    });

    writeEvent(res, {
      token: "Sorry, I'm having trouble right now. Please try again.",
      done: true,
      riskLevel: "UNKNOWN",
      reply: "Sorry, I'm having trouble right now. Please try again.",
    });
    return res.end();
  } finally {
    clearInterval(keepAlive);
  }
};
