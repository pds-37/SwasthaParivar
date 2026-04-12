import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../../utils/logger.js";

const SUPPORTED_REVIEW_MIME_TYPES = ["application/pdf"];
const MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-1.5-flash"];
const JSON_FENCE_PATTERN = /```json|```/gi;
const ATTACHMENT_TYPES = ["report", "medicine", "other"];

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

const buildMedicineFallbackSummary = (medicineName = "") =>
  [
    "## Likely medicine",
    medicineName
      ? `- The image appears to show **${medicineName}**.`
      : "- This looks like a medicine pack or strip, but the exact name is not fully readable.",
    "- Image-based identification can be wrong, so confirm the exact name, strength, expiry date, and instructions printed on the pack or prescription.",
    "",
    "## What it may be used for",
    "- Only trust this if the label or prescription clearly matches what you plan to take.",
    "- If the use is unclear, do not guess from the photo alone.",
    "",
    "## Common cautions",
    "- Do not take it if it belongs to someone else or if the strip is unlabelled.",
    "- Check allergies, pregnancy status, age restrictions, kidney or liver conditions, and other medicines before taking it.",
    "",
    "## Before taking it",
    "- Match the brand name, active ingredient, strength, and expiry on the package.",
    "- Follow the dosing advice on the prescription or from a pharmacist or doctor.",
    "",
    "## When to get professional advice",
    "- If this is for a child, an older adult, pregnancy, long-term illness, or symptoms that are severe or worsening, get a pharmacist or doctor to confirm it first.",
  ].join("\n");

const normalizeAttachmentInsight = (value = {}) => {
  const attachmentType = ATTACHMENT_TYPES.includes(String(value.attachmentType || "").toLowerCase())
    ? String(value.attachmentType).toLowerCase()
    : "other";
  const confidence = ["high", "medium", "low"].includes(String(value.confidence || "").toLowerCase())
    ? String(value.confidence).toLowerCase()
    : "medium";
  const documentType = String(value.documentType || "").trim().slice(0, 120);
  const medicineName = String(value.medicineName || "").trim().slice(0, 120);
  const reason = String(value.reason || "").trim().slice(0, 320);
  const summary = String(value.summary || "").trim().slice(0, 2400);
  const isHealthReport = attachmentType === "report";
  const isMedicineImage = attachmentType === "medicine";

  return {
    attachmentType,
    confidence,
    documentType: isHealthReport ? documentType || "Health report" : "",
    medicineName: isMedicineImage ? medicineName : "",
    reason:
      reason ||
      (isHealthReport
        ? "The uploaded file appears to contain medical report or prescription content."
        : isMedicineImage
          ? "The uploaded file appears to show a medicine package or label."
          : "The uploaded file does not appear to be a medicine image or a genuine health report."),
    summary:
      summary ||
      (isMedicineImage ? buildMedicineFallbackSummary(medicineName) : ""),
    isHealthReport,
    isMedicineImage,
  };
};

const buildAttachmentInsightPrompt = ({ mimeType, fileName, memberLabel }) =>
  [
    "You are reviewing an uploaded file inside a family health app.",
    'Classify it into exactly one attachmentType: "report", "medicine", or "other".',
    'Use "report" for lab reports, prescriptions, discharge summaries, scan reports, vaccination cards, doctor notes, or hospital paperwork with clear medical content.',
    'Use "medicine" for a visible medicine box, strip, bottle, blister pack, sachet, label, or over-the-counter / prescription medicine packaging.',
    'Use "other" for selfies, random objects, scenery, social screenshots, handwritten notes, or anything not clearly medical.',
    "If the image looks like medicine, extract only what is reasonably visible. Never invent the active ingredient, strength, or use if it is not readable.",
    "Respond ONLY as JSON with this exact shape:",
    '{"attachmentType":"medicine","confidence":"high","documentType":"","medicineName":"Crocin 650","reason":"short reason","summary":"markdown summary for the app"}',
    "For medicine images, summary must be concise markdown using these exact headings: ## Likely medicine, ## What it may be used for, ## Common cautions, ## Before taking it, ## When to get professional advice.",
    "For report images, summary should be a short markdown summary of the report in under 140 words.",
    "For other files, keep summary empty.",
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

export const triageHealthAttachment = async ({ base64Data, mimeType, fileName, memberLabel }) => {
  if (!base64Data || !mimeType) {
    throw new Error("Attachment data and mime type are required");
  }

  if (!isSupportedHealthAttachment(mimeType)) {
    return normalizeAttachmentInsight({
      attachmentType: "other",
      confidence: "high",
      reason: "Only image and PDF files can be reviewed.",
      summary: "",
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    logger.warn({
      route: "attachment-triage",
      msg: "GEMINI_API_KEY missing; skipping attachment triage",
    });

    return normalizeAttachmentInsight({
      attachmentType: "other",
      confidence: "low",
      reason: "Automatic attachment review is currently unavailable.",
      summary: "",
    });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const prompt = buildAttachmentInsightPrompt({ mimeType, fileName, memberLabel });
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
        throw new Error(`Empty attachment triage response from ${modelName}`);
      }

      return normalizeAttachmentInsight(parseJsonPayload(text));
    } catch (error) {
      lastError = error;
      logger.warn({
        route: "attachment-triage",
        model: modelName,
        error: {
          message: error?.message || "Gemini attachment triage failed",
        },
      });
    }
  }

  throw lastError || new Error("No Gemini model succeeded for attachment triage");
};

export default reviewHealthAttachment;
