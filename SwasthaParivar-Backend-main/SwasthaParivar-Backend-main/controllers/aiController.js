import mongoose from "mongoose";
import Reminder from "../models/remindermodel.js";
import FamilyMember from "../models/familymembermodel.js";
import AIInsight from "../models/aiinsightmodel.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { triageHealthAttachment } from "../services/ai/reportReviewService.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";
import { logger } from "../utils/logger.js";

const SYMPTOM_KEYWORDS = [
  "fever",
  "cough",
  "cold",
  "sore throat",
  "headache",
  "body ache",
  "nausea",
  "vomiting",
  "diarrhea",
  "acidity",
  "bloating",
  "fatigue",
  "rash",
  "congestion",
  "dizziness",
  "wheezing",
  "breathlessness",
];

const REMEDY_KEYWORDS = [
  "tulsi",
  "ginger",
  "turmeric",
  "steam inhalation",
  "ORS",
  "rest",
  "hydration",
  "honey",
  "salt water gargle",
  "cumin",
  "fennel",
  "cardamom",
  "mint",
  "black pepper",
];

const HEALTH_SCOPE_KEYWORDS = [
  "health",
  "family health",
  "symptom",
  "symptoms",
  "fever",
  "cough",
  "cold",
  "flu",
  "viral",
  "infection",
  "pain",
  "ache",
  "headache",
  "migraine",
  "sore throat",
  "diarrhea",
  "vomiting",
  "nausea",
  "rash",
  "allergy",
  "allergies",
  "medicine",
  "medicines",
  "medication",
  "medications",
  "tablet",
  "capsule",
  "syrup",
  "dose",
  "dosage",
  "prescription",
  "side effect",
  "side effects",
  "doctor",
  "clinic",
  "hospital",
  "nurse",
  "report",
  "reports",
  "lab",
  "blood test",
  "scan",
  "x-ray",
  "mri",
  "ct scan",
  "health record",
  "medical record",
  "bp",
  "blood pressure",
  "blood sugar",
  "heart rate",
  "sleep",
  "weight",
  "steps",
  "hydration",
  "water intake",
  "nutrition",
  "diet",
  "exercise",
  "wellness",
  "mental health",
  "stress",
  "anxiety",
  "pregnancy",
  "pregnant",
  "child",
  "children",
  "baby",
  "vaccination",
  "vaccine",
  "checkup",
  "follow up",
  "follow-up",
  "remedy",
  "remedies",
  "reminder",
];

const HEALTH_SCOPE_PATTERNS = [
  /\b(can i take|should i take|is it safe to take)\b/i,
  /\b(what should we do|what should i do)\b.*\b(fever|cough|pain|rash|vomit|diarrhea|cold|injury|report|medicine|health)\b/i,
  /\b(remind|schedule|reschedule|update|delete|cancel)\b.*\b(medicine|medication|tablet|dose|doctor|checkup|vaccine|vaccination|report|health|follow[- ]?up|water|hydration|sleep)\b/i,
  /\b(upload|review|summari[sz]e|analy[sz]e)\b.*\b(report|scan|prescription|lab|document)\b/i,
  /\b(acidity|digestion|bloating|fatigue|wheezing|breathlessness|period cramps|menstrual|pcos|diabetes|hypertension|asthma)\b/i,
];

function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

function getCandidateModels() {
  return [
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-1.5-flash",
  ].filter((value, index, array) => value && array.indexOf(value) === index);
}

async function generateWithGemini(parts, { mode = "text" } = {}) {
  const genAI = getModel();
  const models = getCandidateModels();
  let lastError = null;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(parts);
      const text = result?.response?.text?.()?.trim();

      if (!text) {
        throw new Error(`Empty AI response from ${modelName}`);
      }

      return text;
    } catch (error) {
      lastError = error;
      logger.warn({
        route: "ai",
        mode,
        model: modelName,
        error: {
          message: error?.message || "Gemini generation failed",
        },
      });
    }
  }

  throw lastError || new Error("No Gemini model succeeded");
}

function parseJsonResponse(rawText) {
  return JSON.parse(String(rawText || "").replace(/```json|```/g, "").trim());
}

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isReminderQuery(text) {
  const lower = text.toLowerCase();
  const keywords = ["remind", "reminder", "schedule", "appointment", "vaccination", "follow up"];

  if (keywords.some((keyword) => lower.includes(keyword))) {
    return true;
  }

  return [
    /set .*checkup/,
    /schedule .*checkup/,
    /remind .*checkup/,
    /checkup reminder/,
    /checkup on/,
    /checkup at/,
  ].some((pattern) => pattern.test(lower));
}

function isDeleteQuery(text) {
  return ["delete", "remove", "cancel", "clear", "stop reminder"].some((keyword) =>
    text.toLowerCase().includes(keyword)
  );
}

function isUpdateQuery(text) {
  return ["update", "change", "modify", "reschedule", "edit", "shift"].some((keyword) =>
    text.toLowerCase().includes(keyword)
  );
}

function isHealthScopeQuery(text) {
  const normalized = String(text || "").trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  if (HEALTH_SCOPE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return true;
  }

  if (HEALTH_SCOPE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  if (isDeleteQuery(normalized) || isUpdateQuery(normalized)) {
    return normalized.includes("reminder");
  }

  return false;
}

function buildOutOfScopeReply() {
  return "I can only help with family health topics such as symptoms, medicines, reports, reminders, vitals, remedies, and doctor follow-up. Please ask a health-related question and mention the family member or health issue you need help with.";
}

function getLatestEntry(entries = []) {
  return entries
    .slice()
    .sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0))[0] || null;
}

function parseBloodPressure(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;

  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
}

function numberValue(entry) {
  const numeric = Number(entry?.value);
  return Number.isFinite(numeric) ? numeric : null;
}

function summarizeMember(member) {
  const latestBp = parseBloodPressure(getLatestEntry(member?.health?.bloodPressure)?.value);
  const latestSugar = numberValue(getLatestEntry(member?.health?.bloodSugar));
  const latestHeartRate = numberValue(getLatestEntry(member?.health?.heartRate));
  const latestSleep = numberValue(getLatestEntry(member?.health?.sleep));
  const latestSteps = numberValue(getLatestEntry(member?.health?.steps));
  const latestWeight = numberValue(getLatestEntry(member?.health?.weight));
  const descriptor = [];
  const details = [];

  if (member.age) descriptor.push(`${member.age}`);
  if (member.gender) descriptor.push(member.gender);
  if (member.relation) descriptor.push(member.relation);
  if (Array.isArray(member.conditions) && member.conditions.length > 0) {
    details.push(`conditions: ${member.conditions.join(", ")}`);
  }
  if (Array.isArray(member.allergies) && member.allergies.length > 0) {
    details.push(`allergies: ${member.allergies.join(", ")}`);
  }
  if (Array.isArray(member.medications) && member.medications.length > 0) {
    details.push(`medications: ${member.medications.join(", ")}`);
  }
  if (member.pregnancyStatus && member.pregnancyStatus !== "not_applicable") {
    details.push(`pregnancy status: ${member.pregnancyStatus}`);
  }
  if (member.childSensitive) {
    details.push("child-sensitive profile");
  }
  if (latestBp) {
    details.push(`latest blood pressure ${latestBp.systolic}/${latestBp.diastolic}`);
  }
  if (latestSugar !== null) {
    details.push(`latest blood sugar ${latestSugar}`);
  }
  if (latestHeartRate !== null) {
    details.push(`latest heart rate ${latestHeartRate}`);
  }
  if (latestSleep !== null) {
    details.push(`latest sleep ${latestSleep} hours`);
  }
  if (latestSteps !== null) {
    details.push(`latest steps ${latestSteps}`);
  }
  if (latestWeight !== null) {
    details.push(`latest weight ${latestWeight}`);
  }
  if (member?.baselinePreferences?.notes) {
    details.push(`care notes: ${member.baselinePreferences.notes}`);
  }
  if (Array.isArray(member?.baselinePreferences?.avoidedIngredients) && member.baselinePreferences.avoidedIngredients.length > 0) {
    details.push(`avoided ingredients: ${member.baselinePreferences.avoidedIngredients.join(", ")}`);
  }

  const headline = `- ${member.name}${descriptor.length ? ` (${descriptor.join(", ")})` : ""}`;
  return [headline, ...details.map((item) => `  ${item}`)].join("\n");
}

async function buildConversationContext(userId, selectedMember) {
  const normalized = String(selectedMember || "").trim();
  const lowered = normalized.toLowerCase();

  if (!normalized || lowered === "self") {
      return {
        focusLabel: normalized || "Self",
        memberId: null,
        summary:
          "No saved family-member profile is selected. Give general guidance, stay cautious, and ask for age, conditions, allergies, medications, or vitals if they are needed to personalize advice.",
      };
  }

  if (["family", "whole family", "all", "household"].includes(lowered)) {
    const members = await FamilyMember.find({ user: userId }).lean();

    if (!members.length) {
      return {
        focusLabel: "Whole Family",
        memberId: null,
        summary:
          "No saved family-member records were found. Give general household guidance and invite the user to add family profiles for safer personalization.",
      };
    }

    return {
      focusLabel: "Whole Family",
      memberId: null,
      summary: members.map(summarizeMember).join("\n"),
    };
  }

  const member = await FamilyMember.findOne({
    user: userId,
    name: mongoose.trusted({ $regex: `^${escapeRegex(normalized)}$`, $options: "i" }),
  }).lean();

  if (!member) {
    return {
      focusLabel: normalized,
      memberId: null,
      summary:
        "The selected member name does not match a saved profile. Give general guidance and mention that a saved member profile would improve personalization and safety checks.",
    };
  }

  return {
    focusLabel: member.name,
    memberId: member._id,
    summary: summarizeMember(member),
  };
}

function extractKeywordMatches(text, keywords) {
  const normalized = String(text || "").toLowerCase();
  return keywords.filter((keyword) => normalized.includes(keyword.toLowerCase()));
}

async function storeAIInsight({ userId, context, message, reply }) {
  const symptoms = extractKeywordMatches(`${message} ${reply}`, SYMPTOM_KEYWORDS).slice(0, 6);
  const remedies = extractKeywordMatches(reply, REMEDY_KEYWORDS).slice(0, 6);

  if (!symptoms.length && !remedies.length) {
    return null;
  }

  return AIInsight.create({
    ownerId: userId,
    memberId: context.memberId || null,
    memberLabel: context.focusLabel,
    sourceMessage: message,
    adviceSummary: String(reply || "").slice(0, 500),
    symptoms,
    remedies,
  });
}

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((entry) => entry && typeof entry.text === "string")
    .slice(-8)
    .map((entry) => {
      const sender = entry.sender === "user" ? "User" : "Assistant";
      const text = entry.text.replace(/\s+/g, " ").trim().slice(0, 600);
      return `${sender}: ${text}`;
    });
}

function buildAdvisorPrompt({ message, member, history, context }) {
  const historyBlock = normalizeHistory(history);

  return `
You are SwasthaParivar AI, a careful family health advisor inside a household care app.

Your job is to connect symptoms, reminders, uploaded reports, remedy ideas, and family context without sounding robotic.

Rules:
- Safety comes before creativity.
- Never pretend to diagnose with certainty.
- Never invent patient details that are not provided in the saved context below.
- Only answer family-health, wellness-tracking, medical-report, reminder, or care-planning questions.
- If the user asks about anything outside health or family care, politely refuse and ask for a health-related question instead.
- When giving home-care suggestions, be conservative around children, pregnancy, allergies, medications, high blood pressure, and high blood sugar.
- If the user asks about danger signs or the symptoms sound urgent, clearly advise in-person medical care or emergency help.
- If the request needs missing information, ask at most 2 short follow-up questions.
- Keep the answer practical and easy to scan.

Preferred response shape:
Summary:
What to do now:
Watch-outs:
When to contact a doctor:
Question:

Only include Question if you truly need more detail.

Selected conversation context: ${member || "Self"}
Resolved profile focus: ${context.focusLabel}
Saved family context:
${context.summary}

Recent conversation:
${historyBlock.length ? historyBlock.join("\n") : "No recent conversation available."}

Latest user message:
${message}
`;
}

export const chatWithAI = async (req, res) => {
  try {
    const { message, member, history } = req.body;

    if (!message) {
      return sendError(res, {
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Message is required",
      });
    }

    if (!isHealthScopeQuery(message)) {
      return sendSuccess(res, {
        data: {
          reply: buildOutOfScopeReply(),
          outOfScope: true,
        },
      });
    }

    if (isUpdateQuery(message)) {
      return handleUpdateReminder(message, req.userId, res);
    }

    if (isDeleteQuery(message)) {
      return handleDeleteReminder(message, req.userId, res);
    }

    if (isReminderQuery(message)) {
      return handleCreateReminder(message, req.userId, res, member);
    }

    const context = await buildConversationContext(req.userId, member);
    const prompt = buildAdvisorPrompt({ message, member, history, context });
    const reply = await generateWithGemini(prompt, { mode: "chat" });
    await storeAIInsight({
      userId: req.userId,
      context,
      message,
      reply,
    });

    return sendSuccess(res, {
      data: { reply },
    });
  } catch (err) {
    logger.error({
      route: "ai-chat",
      userId: req.userId || null,
      error: {
        message: err?.message || "AI chat failed",
        stack: err?.stack || null,
      },
    });
    return sendError(res, {
      status: 500,
      code: "AI_CHAT_FAILED",
      message: "Internal Server Error",
      details: err.message,
    });
  }
};

export const listAIInsights = async (req, res) => {
  try {
    const pagination = parsePagination(req.query);
    const filter = {
      ownerId: req.userId,
      ...(req.query.memberId ? { memberId: req.query.memberId } : {}),
    };

    const [insights, total] = await Promise.all([
      AIInsight.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      AIInsight.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      data: insights,
      meta: buildPaginationMeta({ ...pagination, total }),
    });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "AI_INSIGHT_LIST_FAILED",
      message: "Failed to load AI insights",
      details: error.message,
    });
  }
};

export const analyzeAttachment = async (req, res) => {
  try {
    const { imageData, mimeType, fileName, member } = req.body;

    if (!imageData || !mimeType) {
      return sendError(res, {
        status: 400,
        code: "VALIDATION_ERROR",
        message: "imageData and mimeType are required",
      });
    }

    if (!(mimeType.startsWith("image/") || mimeType === "application/pdf")) {
      return sendError(res, {
        status: 400,
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Only image and PDF uploads are supported",
      });
    }

    const review = await triageHealthAttachment({
      base64Data: imageData,
      mimeType,
      fileName,
      memberLabel: member,
    });

    return sendSuccess(res, {
      data: {
        reply: review.summary,
        attachmentType: review.attachmentType,
        isHealthReport: review.isHealthReport,
        isMedicineImage: review.isMedicineImage,
        confidence: review.confidence,
        reason: review.reason,
        documentType: review.documentType,
        medicineName: review.medicineName,
      },
    });
  } catch (err) {
    logger.error({
      route: "ai-attachment",
      userId: req.userId || null,
      error: {
        message: err?.message || "AI attachment failed",
        stack: err?.stack || null,
      },
    });
    return sendError(res, {
      status: 500,
      code: "AI_ATTACHMENT_FAILED",
      message: "Failed to analyze attachment",
      details: err.message,
    });
  }
};

async function handleCreateReminder(message, userId, res, selectedMember) {
  const prompt = `
Extract reminder information from the message.
Respond ONLY with this JSON (no explanation):

{
  "title": "",
  "description": "",
  "category": "medicine | vaccination | checkup | custom",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "frequency": "once | daily | weekly | monthly | yearly",
  "memberName": ""
}

All values must be lowercase enums.

User: "${message}"
`;

  let parsed;
  try {
    parsed = parseJsonResponse(await generateWithGemini(prompt, { mode: "create-reminder" }));
  } catch {
    return sendError(res, {
      status: 400,
      code: "AI_PARSE_FAILED",
      message: "Invalid JSON from AI",
    });
  }

  if (!parsed.title || !parsed.date || !parsed.time) {
    return sendError(res, {
      status: 400,
      code: "AI_PARSE_FAILED",
      message: "Missing required fields",
      details: parsed,
    });
  }

  const allowedCategories = ["medicine", "vaccination", "checkup", "custom"];
  const category = allowedCategories.includes(parsed.category) ? parsed.category : "custom";

  let memberId = null;
  const resolvedMemberName =
    parsed.memberName || (selectedMember && selectedMember !== "Self" ? selectedMember : "");

  if (resolvedMemberName) {
    const member = await FamilyMember.findOne({
      user: userId,
      name: mongoose.trusted({ $regex: `^${escapeRegex(resolvedMemberName)}$`, $options: "i" }),
    });

    if (member) {
      memberId = member._id;
    }
  }

  const nextRunAt = new Date(`${parsed.date}T${parsed.time}:00`);

  const reminder = await Reminder.create({
    ownerId: userId,
    memberId,
    title: parsed.title,
    description: parsed.description || "",
    category,
    frequency: parsed.frequency || "once",
    nextRunAt,
    options: { time: parsed.time },
    meta: parsed,
  });

  return sendSuccess(res, {
    data: {
      reply: `Reminder created for ${parsed.title} on ${parsed.date} at ${parsed.time}.`,
      reminder,
    },
  });
}

async function handleDeleteReminder(message, userId, res) {
  const prompt = `
Extract ONLY the main reminder title the user wants to delete.
Return JSON ONLY:

{ "title": "" }

User: "${message}"
`;

  let parsed;
  try {
    parsed = parseJsonResponse(await generateWithGemini(prompt, { mode: "delete-reminder" }));
  } catch {
    return sendError(res, {
      status: 400,
      code: "AI_PARSE_FAILED",
      message: "Invalid JSON from AI",
    });
  }

  if (!parsed.title) {
    return sendError(res, {
      status: 400,
      code: "AI_PARSE_FAILED",
      message: "Title missing for deletion",
      details: parsed,
    });
  }

  const cleanTitle = parsed.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const keyword = cleanTitle.split(" ").slice(-1)[0];

  const reminder = await Reminder.findOne({
    ownerId: userId,
    deletedAt: null,
    $or: mongoose.trusted([
      { title: { $regex: cleanTitle, $options: "i" } },
      { title: { $regex: keyword, $options: "i" } },
      ...cleanTitle.split(" ").filter(Boolean).map((word) => ({
        title: { $regex: word, $options: "i" },
      })),
    ]),
  });

  if (!reminder) {
    return sendError(res, {
      status: 404,
      code: "REMINDER_NOT_FOUND",
      message: "No matching reminder found",
    });
  }

  reminder.deletedAt = new Date();
  await reminder.save();

  return sendSuccess(res, {
    data: {
      reply: `Reminder ${reminder.title} deleted successfully.`,
      deletedId: reminder._id,
    },
  });
}

async function handleUpdateReminder(message, userId, res) {
  const prompt = `
Extract update instruction for a reminder.
Return ONLY JSON:

{
  "title": "",
  "newTitle": "",
  "newDate": "",
  "newTime": "",
  "newFrequency": "",
  "newCategory": ""
}

User: "${message}"
`;

  let parsed;
  try {
    parsed = parseJsonResponse(await generateWithGemini(prompt, { mode: "update-reminder" }));
  } catch {
    return sendError(res, {
      status: 400,
      code: "AI_PARSE_FAILED",
      message: "Invalid JSON for update",
    });
  }

  if (!parsed.title) {
    return sendError(res, {
      status: 400,
      code: "AI_PARSE_FAILED",
      message: "Title missing for update",
    });
  }

  const reminder = await Reminder.findOne({
    ownerId: userId,
    deletedAt: null,
    title: mongoose.trusted({ $regex: parsed.title, $options: "i" }),
  });

  if (!reminder) {
    return sendError(res, {
      status: 404,
      code: "REMINDER_NOT_FOUND",
      message: "No matching reminder found to update",
    });
  }

  if (parsed.newTitle) reminder.title = parsed.newTitle;
  if (parsed.newDate && parsed.newTime) {
    reminder.nextRunAt = new Date(`${parsed.newDate}T${parsed.newTime}:00`);
    reminder.options = { ...(reminder.options || {}), time: parsed.newTime };
  }
  if (parsed.newFrequency) reminder.frequency = parsed.newFrequency;
  if (parsed.newCategory) reminder.category = parsed.newCategory;

  await reminder.save();

  return sendSuccess(res, {
    data: {
      reply: "Reminder updated successfully.",
      updatedReminder: reminder,
    },
  });
}
