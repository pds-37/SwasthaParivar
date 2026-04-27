import { GoogleGenerativeAI } from "@google/generative-ai";

import { logger } from "../../utils/logger.js";

const DEFAULT_MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-2.5-pro",
  "gemini-1.5-pro",
];

const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

const normalizeParts = (parts) => (typeof parts === "string" ? [{ text: parts }] : parts);

const getErrorStatus = (error) => error?.status || error?.httpStatusCode || null;

const isMissingModelError = (error) => {
  const status = getErrorStatus(error);
  return status === 404 || /not found|not supported for generatecontent/i.test(error?.message || "");
};

export const isGeminiQuotaError = (error) => {
  const status = getErrorStatus(error);
  return status === 429 || /quota|rate.limit|too many requests|resource exhausted/i.test(error?.message || "");
};

const getRetryDelayMs = (error) => {
  const retryAfterHeader = Number(error?.headers?.["retry-after"]);
  if (Number.isFinite(retryAfterHeader) && retryAfterHeader > 0) {
    return Math.min(retryAfterHeader * 1000, 15000);
  }

  const retryMatch = String(error?.message || "").match(/retry (?:in|after)\s+(\d+(?:\.\d+)?)/i);
  if (retryMatch) {
    return Math.min(Number(retryMatch[1]) * 1000, 15000);
  }

  return 5000;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getGeminiCandidateModels = (extraModels = []) =>
  [process.env.GEMINI_MODEL, ...extraModels, ...DEFAULT_MODEL_CANDIDATES].filter(
    (value, index, array) => value && array.indexOf(value) === index
  );

const runAcrossModels = async (executor, { mode = "text", modelCandidates = [] } = {}) => {
  const models = getGeminiCandidateModels(modelCandidates);
  let lastError = null;
  let isQuotaExhausted = false;

  const apiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (apiKeys.length === 0) {
    throw new Error("No Gemini API key configured.");
  }

  logger.info({
    route: "gemini",
    mode,
    attemptingModels: models,
  });

  for (const apiKey of apiKeys) {
    const genAI = new GoogleGenerativeAI(apiKey);
    let keyExhausted = false;

    for (const modelName of models) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await executor(model, modelName);

          logger.info({
            route: "gemini",
            mode,
            model: modelName,
            attempt,
            success: true,
          });

          return result;
        } catch (error) {
          lastError = error;
          const status = getErrorStatus(error);
          const quotaError = isGeminiQuotaError(error);

          logger.warn({
            route: "gemini",
            mode,
            model: modelName,
            attempt,
            error: {
              message: error?.message || "Gemini request failed",
              status,
            },
          });

          if (isMissingModelError(error)) {
            break;
          }

          if (quotaError) {
            keyExhausted = true;
            break; // Break the attempt loop
          }

          if (attempt === 0) {
            const waitMs = getRetryDelayMs(error);
            logger.info({ route: "gemini", mode, model: modelName, waitMs }, "Waiting before Gemini retry");
            await sleep(waitMs);
            continue;
          }

          break; // Break attempt loop on other errors
        }
      }

      if (keyExhausted) {
        break; // Break the model loop for this key
      }
    }

    if (keyExhausted) {
      isQuotaExhausted = true;
      continue; // Try the next API key
    }
    
    // If it reached here without returning and wasn't quota exhausted, it means all models failed (e.g. 503).
    // Usually no point trying another key for 503s, but we will loop anyway just in case.
  }

  logger.error({
    route: "gemini",
    mode,
    allModelsFailed: true,
    isQuotaExhausted,
    lastErrorMessage: lastError?.message || null,
  });

  const finalError = lastError || new Error("No Gemini model succeeded");
  finalError.isQuotaExhausted = isQuotaExhausted;
  throw finalError;
};

export const generateGeminiText = async (parts, options = {}) => {
  const formattedParts = normalizeParts(parts);

  return runAcrossModels(
    async (model, modelName) => {
      const result = await model.generateContent(formattedParts);
      const text = result?.response?.text?.()?.trim();

      if (!text) {
        throw new Error(`Empty AI response from ${modelName}`);
      }

      return {
        text,
        model: modelName,
      };
    },
    options
  );
};

export const startGeminiTextStream = async (parts, options = {}) => {
  const formattedParts = normalizeParts(parts);

  return runAcrossModels(
    async (model, modelName) => {
      const result = await model.generateContentStream(formattedParts);
      return {
        stream: result.stream,
        model: modelName,
      };
    },
    options
  );
};
