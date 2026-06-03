import {
  assessContextualTriage,
  assessRisk,
  buildContextualCollectedData,
  buildFallbackResponse,
  buildIntakePrompt,
  buildIntakeQuestions,
  buildPrompt,
  buildSuggestedReminder,
  mergeRisk,
  shouldAskIntakeBeforeAnswer,
  triageCheck,
} from "../aiOrchestrator.js";
import {
  formatKnowledgeForPrompt,
  retrieveClinicalKnowledge,
} from "../services/ai/clinicalKnowledgeService.js";
import { evaluateClinicalRules } from "../services/ai/clinicalRulesEngine.js";
import { isGeminiQuotaError, startGeminiTextStream } from "../services/ai/geminiService.js";
import { buildHealthTrends } from "../services/health/healthTrendService.js";
import householdService from "../services/household/HouseholdService.js";
import { logger } from "../utils/logger.js";

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
    const contextualCollectedData = buildContextualCollectedData(member, collectedData || {});
    const healthTrends = buildHealthTrends(member || {});
    const knowledgeEntries = retrieveClinicalKnowledge(message, {
      conditions: member?.conditions || [],
      allergies: member?.allergies || [],
      medications: member?.medications || [],
      pregnancyStatus: member?.pregnancyStatus || "",
      childSensitive: Boolean(member?.childSensitive),
    });
    const clinicalRules = evaluateClinicalRules({ message, member, trends: healthTrends });
    const clinicalContext = {
      clinicalRules,
      healthTrends,
      knowledgeEntries,
      knowledgeBlock: formatKnowledgeForPrompt(knowledgeEntries),
    };
    const triage = triageCheck(message, member?.age);

    if (triage.stopProcessing || clinicalRules.level === "EMERGENCY") {
      const emergencyRisk = mergeRisk(
        { level: "EMERGENCY", risks: ["emergency symptom pattern"] },
        clinicalRules
      );
      const emergencyResponse =
        triage.response ||
        clinicalRules.actions?.[0] ||
        "Emergency warning signs are present. Call 112 immediately or go to the nearest emergency department now.";
      const triageSummary = assessContextualTriage({
        message,
        member,
        collectedData: contextualCollectedData,
        risk: emergencyRisk,
        clinicalRules,
        healthTrends,
        knowledgeEntries,
        emergency: true,
      });
      writeEvent(res, {
        token: emergencyResponse,
        done: true,
        riskLevel: "EMERGENCY",
        triageSummary,
        intakeQuestions: [],
        followUpPrompt: null,
        suggestedReminder: buildSuggestedReminder(message, member),
        reply: emergencyResponse,
      });
      return res.end();
    }

    const risk = mergeRisk(assessRisk(message, member), clinicalRules);
    const triageSummary = assessContextualTriage({
      message,
      member,
      collectedData: contextualCollectedData,
      risk,
      clinicalRules,
      healthTrends,
      knowledgeEntries,
    });
    const intakeQuestions = buildIntakeQuestions(message, member, triageSummary, risk);
    const suggestedReminder = buildSuggestedReminder(message, member);

    if (shouldAskIntakeBeforeAnswer(intakeQuestions, chatHistory || [], risk)) {
      const intakePrompt = buildIntakePrompt(intakeQuestions, risk, member);

      writeEvent(res, {
        token: intakePrompt,
        done: true,
        riskLevel: risk.level,
        triageSummary: null,
        intakeQuestions: [],
        followUpPrompt: null,
        suggestedReminder: null,
        reply: intakePrompt,
        waitingForInput: true,
      });
      return res.end();
    }

    const prompt = buildPrompt(
      member,
      "symptom_check",
      {},
      contextualCollectedData,
      risk,
      chatHistory || [],
      language || "en",
      clinicalContext
    );

    let fullResponse = "";
    let usedFallback = false;
    let quotaExceeded = false;

    try {
      const streamResult = await startGeminiTextStream(prompt, { mode: "chat-stream" });

      logger.info({
        route: "ai-chat-stream",
        userId: req.userId,
        model: streamResult.model,
      });

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
      quotaExceeded = Boolean(error?.isQuotaExhausted || isGeminiQuotaError(error));
      fullResponse = buildFallbackResponse(message, member, risk, clinicalContext);

      logger.warn({
        route: "ai-chat-stream",
        userId: req.userId,
        quotaExceeded,
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
      triageSummary,
      intakeQuestions: [],
      followUpPrompt: null,
      suggestedReminder,
      reply: fullResponse,
      fallback: usedFallback,
      quotaExceeded,
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
