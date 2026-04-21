import mongoose from "mongoose";
import Reminder from "../models/remindermodel.js";
import AIInsight from "../models/aiinsightmodel.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { triageHealthAttachment } from "../services/ai/reportReviewService.js";
import householdService from "../services/household/HouseholdService.js";
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
  "hair loss",
  "hair fall",
  "alopecia",
  "dandruff",
  "scalp",
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
  "hair",
  "hair loss",
  "hair fall",
  "alopecia",
  "dandruff",
  "scalp",
  "itchy scalp",
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
  "hi",
  "hello",
  "hey",
  "thanks",
  "thank you",
  "ok",
  "okay",
  "help",
];

const HEALTH_SCOPE_PATTERNS = [
  /\b(can i take|should i take|is it safe to take)\b/i,
  /\b(what should we do|what should i do)\b.*\b(fever|cough|pain|rash|vomit|diarrhea|cold|injury|report|medicine|health)\b/i,
  /\b(remind|schedule|reschedule|update|delete|cancel)\b.*\b(medicine|medication|tablet|dose|doctor|checkup|vaccine|vaccination|report|health|follow[- ]?up|water|hydration|sleep)\b/i,
  /\b(upload|review|summari[sz]e|analy[sz]e)\b.*\b(report|scan|prescription|lab|document)\b/i,
  /\b(acidity|digestion|bloating|fatigue|wheezing|breathlessness|period cramps|menstrual|pcos|diabetes|hypertension|asthma)\b/i,
  /\b(hair loss|hair fall|alopecia|dandruff|itchy scalp|scalp problem|thinning hair)\b/i,
  /\b(issue|problem|concern|trouble|suffering|dealing)\b.*\b(health|symptom|fever|cough|cold|pain|headache|throat|rash|allergy|medicine|report|sleep|hair|scalp|weight|digestion|bloating|fatigue)\b/i,
  /\b(help|suggest|solution|advice|guidance)\b.*\b(hair|hair loss|hair fall|scalp|fever|cough|cold|pain|medicine|report|sleep|weight)\b/i,
  /\b(losing hair|thinning hair|hair thinning|itchy scalp|scalp itching)\b/i,
  /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|thanks|thank you|ok|okay)$/i,
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
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
  ].filter((value, index, array) => value && array.indexOf(value) === index);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryGenerateOnce(genAI, modelName, formattedParts) {
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(formattedParts);
  const text = result?.response?.text?.()?.trim();
  if (!text) {
    throw new Error(`Empty AI response from ${modelName}`);
  }
  return text;
}

async function generateWithGemini(parts, { mode = "text" } = {}) {
  const genAI = getModel();
  const models = getCandidateModels();
  let lastError = null;
  let isQuotaExhausted = false;

  const formattedParts = typeof parts === "string" ? [{ text: parts }] : parts;

  logger.info({
    route: "ai",
    mode,
    attemptingModels: models,
  });

  for (const modelName of models) {
    // Try up to 2 attempts per model with backoff for 429
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await tryGenerateOnce(genAI, modelName, formattedParts);

        logger.info({
          route: "ai",
          mode,
          model: modelName,
          attempt,
          success: true,
        });

        return text;
      } catch (error) {
        lastError = error;
        const status = error?.status || error?.httpStatusCode;
        const is429 = status === 429 || /quota|rate.limit|too many/i.test(error?.message || "");
        const is404 = status === 404 || /not found/i.test(error?.message || "");

        logger.warn({
          route: "ai",
          mode,
          model: modelName,
          attempt,
          error: {
            message: error?.message || "Gemini generation failed",
            status,
          },
        });

        if (is404) {
          // Model doesn't exist, skip to next model immediately
          break;
        }

        if (is429) {
          isQuotaExhausted = true;
          if (attempt === 0) {
            // Wait before retry — extract delay from error or default to 5s
            const retryMatch = String(error?.message || "").match(/retry in (\d+)/i);
            const waitMs = retryMatch ? Math.min(Number(retryMatch[1]) * 1000, 15000) : 5000;
            logger.info({ route: "ai", model: modelName, waitMs }, "Waiting before retry");
            await sleep(waitMs);
            continue;
          }
          // Second attempt also 429 — move to next model
          break;
        }

        // Other errors — don't retry, move to next model
        break;
      }
    }
  }

  logger.error({
    route: "ai",
    mode,
    allModelsFailed: true,
    isQuotaExhausted,
    lastErrorMessage: lastError?.message,
  });

  const finalError = lastError || new Error("No Gemini model succeeded");
  finalError.isQuotaExhausted = isQuotaExhausted;
  throw finalError;
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

function buildRuleBasedHealthReply(message, context = {}) {
  const normalized = String(message || "").trim().toLowerCase();
  const focusLabel = context?.focusLabel || "your family";

  const response = {
    summary: `Here is general guidance for ${focusLabel}.`,
    doNow: [
      "Rest, hydrate, and keep meals light.",
      "Track symptoms for the next 12 to 24 hours.",
    ],
    watchOuts: [
      "Avoid starting new medicines unless you already know they are safe for the person involved.",
    ],
    doctor: [
      "Get medical help sooner if symptoms become severe, keep worsening, or feel unusual for this person.",
    ],
  };

  const hasAcidity = /(acidity|acid reflux|heartburn|indigestion|gas|bloating)/i.test(normalized);
  const hasFever = /(fever|temperature|viral)/i.test(normalized);
  const hasRespiratory = /(cough|cold|sore throat|congestion)/i.test(normalized);
  const hasDizziness = /(dizz|dazz|vertigo|faint|lightheaded)/i.test(normalized);
  const hasHair = /(hair loss|hair fall|alopecia|dandruff|itchy scalp|thinning hair)/i.test(normalized);
  const hasMedicine = /(paracetamol|ibuprofen|cetirizine|azithromycin|amoxicillin|omeprazole|pantoprazole|metformin|medicine|medication|tablet|capsule|syrup|dose|dosage|safe to take|can i take|should i take)/i.test(normalized);
  const hasChild = /(child|children|baby|infant|toddler|kid|under \d|newborn|pediatric)/i.test(normalized);
  const hasPain = /(pain|ache|cramp|sprain|strain|sore|hurt|injury|back pain|stomach pain|chest pain|joint pain|knee pain|muscle)/i.test(normalized);
  const hasAllergy = /(allergy|allergies|allergic|hives|swelling|itching|itchy|rash|reaction)/i.test(normalized);
  const hasDengue = /(dengue|malaria|typhoid|chikungunya)/i.test(normalized);
  const hasDiabetes = /(diabetes|diabetic|blood sugar|sugar level|insulin|glucose|hba1c)/i.test(normalized);
  const hasBP = /(blood pressure|bp|hypertension|hypotension)/i.test(normalized);
  const hasSleep = /(sleep|insomnia|can't sleep|sleeping|sleepless|restless)/i.test(normalized);
  const hasMental = /(stress|anxiety|anxious|depression|depressed|mental health|panic|overwhelm|worried|burnout)/i.test(normalized);
  const hasPregnancy = /(pregnant|pregnancy|prenatal|expecting|trimester|morning sickness)/i.test(normalized);
  const hasVomit = /(vomit|vomiting|nausea|throwing up)/i.test(normalized);
  const hasDiarrhea = /(diarrhea|diarrhoea|loose motion|loose stool|dehydration)/i.test(normalized);
  const hasHeadache = /(headache|migraine|head pain|head ache)/i.test(normalized);
  const hasDead = /(am i dead|i'm dead|dying|gonna die|going to die)/i.test(normalized);

  // Handle absurd/panic queries gracefully
  if (hasDead) {
    response.summary = `I understand you may be feeling very unwell or anxious, ${focusLabel}. Let me help.`;
    response.doNow = [
      "Take a deep breath. If you are reading this, you are alive and can get help.",
      "If you feel severe symptoms like chest pain, difficulty breathing, or loss of consciousness, call emergency services immediately.",
      "Sit or lie down in a safe, comfortable place and ask someone nearby to stay with you.",
    ];
    response.watchOuts = [
      "Sudden severe symptoms like chest tightness, numbness on one side, or difficulty speaking need immediate emergency care.",
    ];
    response.doctor = [
      "Call emergency services (112 in India) right away if you feel you are in a medical emergency.",
      "If you are feeling emotionally overwhelmed, reach out to a mental health helpline (iCall: 9152987821, Vandrevala Foundation: 1860-2662-345).",
    ];
  } else if (hasMedicine && hasChild) {
    response.summary = `This is a medicine-safety question involving a child for ${focusLabel}. Extra caution is needed.`;
    response.doNow = [
      "Never give adult medicines to children without confirming the pediatric dose with a doctor or pharmacist.",
      "Paracetamol is generally considered safe for children when given in the correct weight-based dose, but always verify.",
      "Avoid aspirin for children unless specifically prescribed by a doctor (risk of Reye's syndrome).",
    ];
    response.watchOuts = [
      "Many common adult medicines are not safe for children under 5, including certain cough syrups and painkillers.",
      "Always check the child's weight, age, allergies, and existing conditions before giving any medicine.",
    ];
    response.doctor = [
      "Consult a pediatrician before starting any new medicine for a child, especially for infants under 1 year.",
      "Seek immediate help if the child shows signs of allergic reaction, difficulty breathing, or unusual drowsiness after taking medicine.",
    ];
  } else if (hasMedicine) {
    response.summary = `This is a medicine-related question for ${focusLabel}. Safety checks are important.`;
    response.doNow = [
      "Always verify the medicine name, correct dose, person's age, allergies, and current medications before taking anything.",
      "Follow the prescription label or pharmacist instructions if available.",
      "Take medicines with water unless the label says otherwise, and note the timing (before/after meals).",
    ];
    response.watchOuts = [
      "Do not combine medicines without checking for interactions, especially blood thinners, diabetes medicines, or BP medicines.",
      "Stop and seek help if you notice side effects like rash, swelling, dizziness, or stomach bleeding.",
    ];
    response.doctor = [
      "Contact a doctor or pharmacist if the medicine, dose, or timing is unclear.",
      "Seek urgent help for signs of allergic reaction: swelling of face/throat, difficulty breathing, or widespread rash.",
    ];
  } else if (hasDengue) {
    response.summary = `This sounds like a question about dengue or a mosquito-borne illness for ${focusLabel}.`;
    response.doNow = [
      "Common dengue symptoms include high fever, severe headache, pain behind the eyes, joint/muscle pain, fatigue, nausea, and skin rash.",
      "Rest, hydrate well with ORS, coconut water, or plain fluids. Eat light, nutritious food.",
      "Use paracetamol for fever if appropriate. Avoid ibuprofen and aspirin as they can increase bleeding risk in dengue.",
    ];
    response.watchOuts = [
      "Watch for warning signs: severe abdominal pain, persistent vomiting, bleeding gums/nose, blood in stool/urine, rapid breathing, or fatigue/restlessness.",
      "Platelet count can drop rapidly — monitor with blood tests as advised by a doctor.",
    ];
    response.doctor = [
      "See a doctor immediately if warning signs appear. Dengue can become life-threatening (dengue hemorrhagic fever).",
      "Get a blood test (CBC with platelet count, NS1 antigen) if dengue is suspected.",
    ];
  } else if (hasPregnancy) {
    response.summary = `This is a pregnancy-related question for ${focusLabel}. Extra caution is essential.`;
    response.doNow = [
      "Many medicines, supplements, and even some home remedies are not safe during pregnancy. Always check with your OB-GYN first.",
      "Stay well-hydrated, eat balanced meals with iron and folic acid, and get adequate rest.",
      "Keep up with scheduled prenatal checkups and ultrasounds.",
    ];
    response.watchOuts = [
      "Avoid self-medicating during pregnancy, even with common medicines like ibuprofen or certain antibiotics.",
      "Watch for warning signs: heavy bleeding, severe abdominal pain, severe headache with vision changes, or sudden swelling.",
    ];
    response.doctor = [
      "Contact your doctor immediately for bleeding, reduced fetal movement, severe pain, or high fever during pregnancy.",
    ];
  } else if (hasAllergy) {
    response.summary = `This sounds like an allergy or allergic reaction concern for ${focusLabel}.`;
    response.doNow = [
      "Identify and avoid the suspected trigger (food, medicine, dust, pollen, etc.).",
      "For mild reactions (itching, mild rash), a known-safe antihistamine like cetirizine may help. Check dose and allergies first.",
      "Apply a cold compress to itchy or swollen areas for relief.",
    ];
    response.watchOuts = [
      "Watch for signs of severe allergic reaction (anaphylaxis): swelling of face/lips/throat, difficulty breathing, rapid heartbeat, or dizziness.",
    ];
    response.doctor = [
      "Seek emergency help immediately if there is throat swelling, difficulty breathing, or the person feels faint — this could be anaphylaxis.",
      "See a doctor if the rash spreads, does not improve in 24-48 hours, or is accompanied by fever.",
    ];
  } else if (hasMental) {
    response.summary = `This sounds like a mental health or emotional wellness concern for ${focusLabel}.`;
    response.doNow = [
      "Acknowledge the feelings — stress and anxiety are real and valid health concerns.",
      "Try grounding techniques: slow deep breathing (4 seconds in, hold 4, out 6), or name 5 things you can see around you.",
      "Take a break from screens, step outside if possible, and drink some water.",
    ];
    response.watchOuts = [
      "Persistent anxiety, sleep disruption, loss of appetite, or feelings of hopelessness lasting more than 2 weeks need professional attention.",
      "Avoid using alcohol, smoking, or excessive caffeine as coping mechanisms.",
    ];
    response.doctor = [
      "Reach out to a mental health professional if symptoms persist or affect daily life.",
      "Helplines: iCall (9152987821), Vandrevala Foundation (1860-2662-345), NIMHANS (080-46110007).",
    ];
  } else if (hasDiabetes) {
    response.summary = `This is a diabetes or blood sugar-related question for ${focusLabel}.`;
    response.doNow = [
      "Monitor blood sugar regularly, especially fasting and post-meal readings.",
      "Maintain a balanced diet with low glycemic index foods, fiber, and adequate protein. Avoid sugary drinks and refined carbs.",
      "Take prescribed diabetes medicines (metformin, insulin, etc.) on time as directed.",
    ];
    response.watchOuts = [
      "Watch for signs of low blood sugar (hypoglycemia): shakiness, sweating, confusion, rapid heartbeat — treat with glucose/sugar immediately.",
      "Watch for signs of high blood sugar: excessive thirst, frequent urination, blurred vision, fatigue.",
    ];
    response.doctor = [
      "See a doctor if blood sugar readings are consistently above 200 mg/dL or below 70 mg/dL.",
      "Get HbA1c tested every 3 months and schedule regular eye, kidney, and foot checkups.",
    ];
  } else if (hasBP) {
    response.summary = `This is a blood pressure-related question for ${focusLabel}.`;
    response.doNow = [
      "Monitor BP regularly at the same time each day, sitting quietly for 5 minutes before measuring.",
      "Reduce salt intake, eat potassium-rich foods (bananas, spinach), stay active, and manage stress.",
      "Take prescribed BP medicines consistently — do not skip doses or stop without consulting a doctor.",
    ];
    response.watchOuts = [
      "Very high BP (above 180/120) is a hypertensive crisis — seek immediate medical help.",
      "Sudden severe headache, vision changes, chest pain, or difficulty breathing with high BP is an emergency.",
    ];
    response.doctor = [
      "See a doctor if BP stays above 140/90 despite lifestyle changes, or if you experience persistent dizziness or headaches.",
    ];
  } else if (hasSleep) {
    response.summary = `This sounds like a sleep-related concern for ${focusLabel}.`;
    response.doNow = [
      "Maintain a consistent sleep schedule — go to bed and wake up at the same time daily.",
      "Avoid screens, caffeine, and heavy meals at least 1-2 hours before bedtime.",
      "Create a dark, cool, quiet sleeping environment. Try relaxation techniques or gentle stretching before bed.",
    ];
    response.watchOuts = [
      "Avoid relying on sleep aids or alcohol for sleep — they reduce sleep quality long-term.",
      "Persistent insomnia lasting more than 3-4 weeks may indicate an underlying condition (anxiety, sleep apnea, etc.).",
    ];
    response.doctor = [
      "See a doctor if sleeplessness persists despite good sleep habits, or if you experience loud snoring, gasping during sleep, or daytime exhaustion.",
    ];
  } else if (hasHeadache) {
    response.summary = `This sounds like a headache or migraine concern for ${focusLabel}.`;
    response.doNow = [
      "Rest in a quiet, dark room and apply a cold or warm compress to the forehead or neck.",
      "Stay hydrated — dehydration is a common headache trigger.",
      "Paracetamol may help if it is safe for this person. Avoid overusing painkillers (more than 2-3 times a week).",
    ];
    response.watchOuts = [
      "Watch for the worst headache of your life, headache with fever and stiff neck, or headache after a head injury.",
    ];
    response.doctor = [
      "Seek urgent care for sudden severe headache, headache with confusion/vision changes/weakness, or headache that worsens over days.",
    ];
  } else if (hasVomit && hasDiarrhea) {
    response.summary = `This sounds like a gastrointestinal issue with vomiting and diarrhea for ${focusLabel}.`;
    response.doNow = [
      "Focus on rehydration with ORS, coconut water, or small sips of clear fluids every few minutes.",
      "Avoid solid food until vomiting stops, then start with bland foods (rice, toast, banana).",
      "Rest and avoid dairy, spicy, or oily food until recovery.",
    ];
    response.watchOuts = [
      "Watch for signs of dehydration: dry mouth, sunken eyes, reduced urination, or lethargy — especially in children and elderly.",
    ];
    response.doctor = [
      "See a doctor urgently if there is blood in vomit or stool, high fever, severe abdominal pain, or inability to keep fluids down for more than 6 hours.",
    ];
  } else if (hasVomit) {
    response.summary = `This sounds like a nausea or vomiting concern for ${focusLabel}.`;
    response.doNow = [
      "Sip clear fluids slowly — small amounts frequently rather than large gulps.",
      "Avoid solid food temporarily. Try bland foods once vomiting settles.",
      "Rest in a propped-up or side-lying position to prevent aspiration.",
    ];
    response.watchOuts = ["Watch for dehydration, blood in vomit, or inability to keep any fluids down."];
    response.doctor = ["See a doctor if vomiting persists beyond 24 hours, or if accompanied by severe pain, high fever, or blood."];
  } else if (hasDiarrhea) {
    response.summary = `This sounds like a diarrhea or loose motion concern for ${focusLabel}.`;
    response.doNow = [
      "Start ORS immediately to prevent dehydration. Coconut water and clear soups also help.",
      "Eat bland, easy-to-digest foods: rice, bananas, toast, boiled potatoes.",
      "Maintain hygiene — wash hands frequently to prevent spread.",
    ];
    response.watchOuts = ["Watch for bloody stool, high fever, severe cramps, or signs of dehydration."];
    response.doctor = ["See a doctor if diarrhea lasts more than 2 days, contains blood, or the person (especially a child) shows signs of dehydration."];
  } else if (hasPain) {
    response.summary = `This sounds like a pain-related concern for ${focusLabel}.`;
    response.doNow = [
      "Rest the affected area and apply a cold compress for acute pain or a warm compress for muscle stiffness.",
      "Paracetamol can help with mild pain if safe for this person. Avoid prolonged painkiller use without medical advice.",
      "Note the location, intensity (1-10), and any triggers to share with a doctor if needed.",
    ];
    response.watchOuts = [
      "Chest pain, sudden severe abdominal pain, or pain with numbness/weakness needs immediate medical attention.",
      "Avoid ignoring pain that wakes you from sleep or progressively worsens over days.",
    ];
    response.doctor = [
      "See a doctor if pain is severe, persistent, or accompanied by fever, swelling, or loss of function.",
    ];
  } else if (hasAcidity && hasDizziness) {
    response.summary = `This sounds like a combination of digestive discomfort and dizziness for ${focusLabel}.`;
    response.doNow = [
      "Sit down or lie down immediately in a safe place to avoid falls.",
      "Sip plain water slowly to ensure hydration.",
      "Stay in a cool, well-ventilated area.",
    ];
    response.watchOuts = ["Watch for signs of dehydration, such as dry mouth or reduced urination."];
    response.doctor = ["Seek medical help if the dizziness is severe, persistent, or accompanied by blurred vision, chest pain, or sudden weakness."];
  } else if (hasDizziness) {
    response.summary = `This sounds like a concern related to dizziness or lightheadedness for ${focusLabel}.`;
    response.doNow = [
      "Sit or lie down safely until the feeling passes.",
      "Hydrate well with plain water or ORS if appropriate.",
      "Avoid sudden movements or standing up too quickly.",
    ];
    response.watchOuts = ["Monitor for any other symptoms like palpitations, headache, or confusion."];
    response.doctor = ["Contact a doctor if the dizziness is recurrent, follows a head injury, or is accompanied by fainting, chest pain, or slurred speech."];
  } else if (hasAcidity) {
    response.summary = `This sounds like mild acidity or post-meal indigestion for ${focusLabel}.`;
    response.doNow = [
      "Sip water slowly and stay upright for 2 to 3 hours after dinner.",
      "Choose a lighter next meal and avoid spicy, oily, or very late-night food.",
      "A short gentle walk after meals can help if the person feels comfortable.",
    ];
    response.watchOuts = [
      "Avoid lying flat right after eating.",
      "Avoid repeated use of painkillers or trigger foods if they usually worsen acidity.",
    ];
    response.doctor = ["Contact a doctor urgently for chest pain, vomiting blood, black stools, trouble swallowing, or severe persistent pain."];
  } else if (hasFever) {
    response.summary = `This sounds like a fever-related concern for ${focusLabel}.`;
    response.doNow = [
      "Encourage fluids, rest, and light food.",
      "Check temperature and note any worsening symptoms.",
      "Use only medicines already known to be safe for that person.",
    ];
    response.watchOuts = ["Watch for dehydration, reduced urination, unusual sleepiness, or confusion."];
    response.doctor = ["Get urgent help for breathing trouble, severe weakness, dehydration, seizures, or fever that is very high or persistent."];
  } else if (hasRespiratory) {
    response.summary = `This sounds like a mild upper-respiratory issue for ${focusLabel}.`;
    response.doNow = [
      "Encourage fluids, warm drinks, and rest.",
      "Steam inhalation can help some adults if done carefully.",
      "Honey can soothe the throat for adults and children over 1 year old.",
    ];
    response.watchOuts = ["Avoid smoke exposure and very cold drinks if they worsen symptoms."];
    response.doctor = ["Get medical help for breathing difficulty, chest pain, blue lips, wheezing, or symptoms that keep worsening."];
  } else if (hasHair) {
    response.summary = `This sounds like a hair or scalp concern for ${focusLabel}.`;
    response.doNow = [
      "Check for recent stress, illness, rapid weight change, poor sleep, or diet changes that may be contributing.",
      "Use gentle hair care, avoid harsh heat or tight hairstyles, and keep the scalp clean.",
      "Support recovery with balanced meals that include enough protein, iron, and overall nutrition.",
    ];
    response.watchOuts = [
      "Avoid starting supplements or medicated products blindly without checking the likely cause first.",
      "Watch for patchy bald spots, scalp redness, severe itching, flakes, or rapid worsening.",
    ];
    response.doctor = ["Arrange a medical review if hair loss is sudden, patchy, persistent, or associated with fatigue, weight change, or menstrual/hormonal issues."];
  }

  return [
    "Summary:",
    response.summary,
    "",
    "What to do now:",
    ...response.doNow.map((item) => `- ${item}`),
    "",
    "Watch-outs:",
    ...response.watchOuts.map((item) => `- ${item}`),
    "",
    "When to contact a doctor:",
    ...response.doctor.map((item) => `- ${item}`),
  ].join("\n");
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
    const householdMembers = await householdService.listHouseholdMembers(userId);
    const members = householdMembers.map((member) =>
      typeof member.toObject === "function" ? member.toObject() : member
    );

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

  const memberDoc = await householdService.findHouseholdMemberByName(userId, normalized);
  const member = memberDoc?.toObject ? memberDoc.toObject() : memberDoc;

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

const buildReminderScope = (householdId, userId) => ({
  deletedAt: null,
  $or: householdId
    ? [{ householdId }, { ownerId: userId, householdId: null }]
    : [{ ownerId: userId }],
});

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

    const hasHistory = Array.isArray(history) && history.length > 0;
    const isHealthQuery = isHealthScopeQuery(message);
    
    // Allow short conversational answers (like "yes", "recurring issue", "3 days") mid-conversation
    // Longer irrelevant queries will still be blocked by the keyword filter.
    const isShortFollowUp = hasHistory && message.split(/\s+/).length <= 8;

    if (!isHealthQuery && !isShortFollowUp) {
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

    let context;
    try {
      context = await buildConversationContext(req.userId, member);
    } catch {
      context = {
        focusLabel: member || "Whole Family",
        memberId: null,
        summary:
          "Saved household context could not be loaded for this account right now. Give careful general guidance and ask short follow-up questions when personalization matters.",
      };
    }
    const prompt = buildAdvisorPrompt({ message, member, history, context });
    let reply;
    let isFallback = false;
    let isQuotaExhausted = false;
    try {
      reply = await generateWithGemini(prompt, { mode: "chat" });
    } catch (geminiError) {
      isFallback = true;
      isQuotaExhausted = Boolean(geminiError?.isQuotaExhausted);
      reply = buildRuleBasedHealthReply(message, context);
      logger.warn({
        route: "ai-chat",
        userId: req.userId,
        isFallback: true,
        isQuotaExhausted,
        error: {
          message: geminiError?.message || "Gemini failed, using fallback",
        },
      });
    }

    try {
      await storeAIInsight({
        userId: req.userId,
        context,
        message,
        reply,
      });
    } catch (error) {
      logger.warn({
        route: "ai-chat-insight",
        userId: req.userId,
        error: {
          message: error?.message || "Could not store AI insight",
        },
      });
    }

    return sendSuccess(res, {
      data: {
        reply,
        ...(isFallback ? { fallback: true } : {}),
        ...(isQuotaExhausted ? { quotaExceeded: true } : {}),
      },
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
    const member = await householdService.findHouseholdMemberByName(userId, resolvedMemberName);

    if (member) {
      memberId = member._id;
    }
  }

  const nextRunAt = new Date(`${parsed.date}T${parsed.time}:00`);
  let householdContext = null;
  try {
    householdContext = await householdService.ensureUserHouseholdContext(userId);
  } catch {
    householdContext = null;
  }

  const reminder = await Reminder.create({
    ownerId: userId,
    householdId: householdContext?.household?._id || null,
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
  let householdContext = null;
  try {
    householdContext = await householdService.ensureUserHouseholdContext(userId);
  } catch {
    householdContext = null;
  }

  const reminder = await Reminder.findOne({
    $and: [
      buildReminderScope(householdContext?.household?._id || null, userId),
      {
        $or: mongoose.trusted([
          { title: { $regex: cleanTitle, $options: "i" } },
          { title: { $regex: keyword, $options: "i" } },
          ...cleanTitle.split(" ").filter(Boolean).map((word) => ({
            title: { $regex: word, $options: "i" },
          })),
        ]),
      },
    ],
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
  let householdContext = null;
  try {
    householdContext = await householdService.ensureUserHouseholdContext(userId);
  } catch {
    householdContext = null;
  }

  const reminder = await Reminder.findOne({
    ...buildReminderScope(householdContext?.household?._id || null, userId),
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
