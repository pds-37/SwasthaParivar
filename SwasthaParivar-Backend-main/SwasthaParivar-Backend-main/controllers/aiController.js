import Reminder from "../models/remindermodel.js";
import FamilyMember from "../models/familymembermodel.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

function parseJsonResponse(rawText) {
  return JSON.parse(String(rawText || "").replace(/```json|```/g, "").trim());
}

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isReminderQuery(text) {
  const lower = text.toLowerCase();
  const keywords = ["remind", "reminder", "medicine", "appointment", "vaccination", "dose"];

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

export const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const model = getModel();

    if (isUpdateQuery(message)) {
      return handleUpdateReminder(message, req.userId, res, model);
    }

    if (isDeleteQuery(message)) {
      return handleDeleteReminder(message, req.userId, res, model);
    }

    if (isReminderQuery(message)) {
      return handleCreateReminder(message, req.userId, res, model);
    }

    const ai = await model.generateContent([{ text: message }]);
    return res.json({ reply: ai.response.text() });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

export const analyzeAttachment = async (req, res) => {
  try {
    const { imageData, mimeType, fileName, member } = req.body;

    if (!imageData || !mimeType) {
      return res.status(400).json({ error: "imageData and mimeType are required" });
    }

    if (!mimeType.startsWith("image/")) {
      return res.status(400).json({ error: "Only image uploads are supported" });
    }

    const model = getModel();
    const prompt = [
      "You are reviewing an uploaded health-related image for a family health tracking app.",
      "Summarize what is visible, mention any clearly readable medical information, and add a short caution that this is not a diagnosis.",
      member ? `The selected family member is: ${member}.` : "",
      fileName ? `The uploaded file name is: ${fileName}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          data: imageData,
          mimeType,
        },
      },
    ]);

    res.json({
      reply: result.response.text() || "Image uploaded successfully.",
    });
  } catch (err) {
    console.error("AI Attachment Error:", err);
    res.status(500).json({ error: "Failed to analyze attachment", details: err.message });
  }
};

async function handleCreateReminder(message, userId, res, model) {
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

  const ai = await model.generateContent([{ text: prompt }]);

  let parsed;
  try {
    parsed = parseJsonResponse(ai.response.text());
  } catch {
    return res.status(400).json({ error: "Invalid JSON from AI" });
  }

  if (!parsed.title || !parsed.date || !parsed.time) {
    return res.status(400).json({ error: "Missing required fields", raw: parsed });
  }

  const allowedCategories = ["medicine", "vaccination", "checkup", "custom"];
  const category = allowedCategories.includes(parsed.category) ? parsed.category : "custom";

  let memberId = null;
  if (parsed.memberName) {
    const member = await FamilyMember.findOne({
      user: userId,
      name: { $regex: `^${escapeRegex(parsed.memberName)}$`, $options: "i" },
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

  return res.json({
    reply: `Reminder created for ${parsed.title} on ${parsed.date} at ${parsed.time}.`,
    reminder,
  });
}

async function handleDeleteReminder(message, userId, res, model) {
  const prompt = `
Extract ONLY the main reminder title the user wants to delete.
Return JSON ONLY:

{ "title": "" }

User: "${message}"
`;

  const ai = await model.generateContent([{ text: prompt }]);

  let parsed;
  try {
    parsed = parseJsonResponse(ai.response.text());
  } catch {
    return res.status(400).json({ error: "Invalid JSON from AI" });
  }

  if (!parsed.title) {
    return res.status(400).json({ error: "Title missing for deletion", raw: parsed });
  }

  const cleanTitle = parsed.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const keyword = cleanTitle.split(" ").slice(-1)[0];

  const reminder = await Reminder.findOne({
    ownerId: userId,
    deletedAt: null,
    $or: [
      { title: { $regex: cleanTitle, $options: "i" } },
      { title: { $regex: keyword, $options: "i" } },
      ...cleanTitle.split(" ").filter(Boolean).map((word) => ({
        title: { $regex: word, $options: "i" },
      })),
    ],
  });

  if (!reminder) {
    return res.status(404).json({ error: "No matching reminder found" });
  }

  reminder.deletedAt = new Date();
  await reminder.save();

  return res.json({
    reply: `Reminder ${reminder.title} deleted successfully.`,
    deletedId: reminder._id,
  });
}

async function handleUpdateReminder(message, userId, res, model) {
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

  const ai = await model.generateContent([{ text: prompt }]);

  let parsed;
  try {
    parsed = parseJsonResponse(ai.response.text());
  } catch {
    return res.status(400).json({ error: "Invalid JSON for update" });
  }

  if (!parsed.title) {
    return res.status(400).json({ error: "Title missing for update" });
  }

  const reminder = await Reminder.findOne({
    ownerId: userId,
    deletedAt: null,
    title: { $regex: parsed.title, $options: "i" },
  });

  if (!reminder) {
    return res.status(404).json({ error: "No matching reminder found to update" });
  }

  if (parsed.newTitle) reminder.title = parsed.newTitle;
  if (parsed.newDate && parsed.newTime) {
    reminder.nextRunAt = new Date(`${parsed.newDate}T${parsed.newTime}:00`);
    reminder.options = { ...(reminder.options || {}), time: parsed.newTime };
  }
  if (parsed.newFrequency) reminder.frequency = parsed.newFrequency;
  if (parsed.newCategory) reminder.category = parsed.newCategory;

  await reminder.save();

  return res.json({
    reply: "Reminder updated successfully.",
    updatedReminder: reminder,
  });
}
