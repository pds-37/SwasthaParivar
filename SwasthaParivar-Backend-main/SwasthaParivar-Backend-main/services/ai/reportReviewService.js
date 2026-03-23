import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../../utils/logger.js";

const SUPPORTED_REVIEW_MIME_TYPES = ["application/pdf"];
const MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-1.5-flash"];
const JSON_FENCE_PATTERN = /```json|```/gi;

const normalizeReview = (value = {}) => {
  const confidence = ["high", "medium", "low"].includes(String(value.confidence || "").toLowerCase())
    ? String(value.confidence).toLowerCase()
    : "medium";

  const isHealthReport = typeof value.isHealthReport === "boolean" ? value.isHealthReport : false;
  const reason = String(value.reason || "").trim();
  const summary = String(value.summary || "").trim().slice(0, 1500);
  const documentType = String(value.documentType || "").trim().slice(0, 120);

  return {
    isHealthReport,
    confidence,
    reason:
      reason ||
      (isHealthReport
        ? "The uploaded file appears to contain clear medical or clinical report content."
        : "The uploaded file does not appear to be a genuine medical or health report."),
    summary,
    documentType,
  };
};

const parseJsonPayload = (rawText = "") =>
  JSON.parse(String(rawText).replace(JSON_FENCE_PATTERN, "").trim());

const getCandidateModels = () =>
  [process.env.GEMINI_MODEL, ...MODEL_CANDIDATES].filter(
    (value, index, array) => value && array.indexOf(value) === index
  );

const isSupportedHealthAttachment = (mimeType = "") =>
  String(mimeType).startsWith("image/") || SUPPORTED_REVIEW_MIME_TYPES.includes(String(mimeType));

const buildReviewPrompt = ({ mimeType, fileName, memberLabel }) =>
  [
    "You are validating a file uploaded into a family health application.",
    "Decide whether this file looks like a genuine health or medical report.",
    "A genuine health report can include lab results, prescriptions, discharge summaries, scans, test reports, vaccination cards, doctor notes, or hospital paperwork with clearly medical content.",
    "If the file looks like a selfie, scenery, social media screenshot, random note, meme, unrelated document, or a non-medical image/PDF, mark it as not a health report.",
    "If you are uncertain, return false unless there is clear medical evidence in the file.",
    "Respond ONLY as JSON with this exact shape:",
    '{"isHealthReport": true, "confidence": "high", "documentType": "Lab report", "reason": "Why you decided this.", "summary": "Short medical summary for the app, or empty string if invalid."}',
    "Keep reason concise and keep summary under 120 words.",
    memberLabel ? `Selected family member: ${memberLabel}.` : "",
    fileName ? `Uploaded file name: ${fileName}.` : "",
    mimeType ? `Uploaded mime type: ${mimeType}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

export const reviewHealthAttachment = async ({ base64Data, mimeType, fileName, memberLabel }) => {
  if (!base64Data || !mimeType) {
    throw new Error("Attachment data and mime type are required");
  }

  if (!isSupportedHealthAttachment(mimeType)) {
    return normalizeReview({
      isHealthReport: false,
      confidence: "high",
      reason: "Only image and PDF files can be reviewed as health reports.",
      summary: "",
      documentType: "",
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    logger.warn({
      route: "report-review",
      msg: "GEMINI_API_KEY missing; skipping attachment review",
    });

    return normalizeReview({
      isHealthReport: true,
      confidence: "low",
      reason: "Automatic report review is currently unavailable.",
      summary: "",
      documentType: "",
    });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const prompt = buildReviewPrompt({ mimeType, fileName, memberLabel });
  let lastError = null;

  for (const modelName of getCandidateModels()) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
      ]);

      const text = result?.response?.text?.()?.trim();
      if (!text) {
        throw new Error(`Empty review response from ${modelName}`);
      }

      return normalizeReview(parseJsonPayload(text));
    } catch (error) {
      lastError = error;
      logger.warn({
        route: "report-review",
        model: modelName,
        error: {
          message: error?.message || "Gemini report review failed",
        },
      });
    }
  }

  throw lastError || new Error("No Gemini model succeeded for report review");
};

export default reviewHealthAttachment;
