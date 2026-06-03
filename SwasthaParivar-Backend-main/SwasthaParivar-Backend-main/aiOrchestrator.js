const EMERGENCY_PATTERNS = [
  /\b(chest pain|severe chest pain|heart attack)\b/i,
  /\b(can't breathe|cannot breathe|difficulty breathing|shortness of breath)\b/i,
  /\b(unconscious|not responding|passed out|fainted and not waking)\b/i,
  /\b(seizure|fits|convulsion)\b/i,
  /\b(stroke|face drooping|slurred speech|one-sided weakness)\b/i,
  /\b(severe bleeding|bleeding heavily|vomiting blood|blood in vomit)\b/i,
  /\b(suicidal|suicide|self-harm)\b/i,
];

const HIGH_RISK_PATTERNS = [
  /\b(high fever|persistent fever|fever for \d+ days)\b/i,
  /\b(oxygen|breathlessness|wheezing)\b/i,
  /\b(severe abdominal pain|black stool|blood in stool)\b/i,
  /\b(dehydration|not drinking|reduced urination)\b/i,
  /\b(allergic reaction|swelling of face|swelling of throat)\b/i,
];

const MODERATE_RISK_PATTERNS = [
  /\b(cough|cold|sore throat|headache|acidity|bloating)\b/i,
  /\b(diarrhea|vomiting|nausea|fatigue|rash)\b/i,
  /\b(hair loss|hair fall|dandruff|scalp)\b/i,
  /\b(medicine|medication|tablet|dose|dosage)\b/i,
];

const RED_FLAG_SCREENING_PATTERNS = [
  /\b(what|which)\s+(are|is)\s+.*\b(red flags?|warning signs?)\b/i,
  /\b(are there|any)\s+.*\b(red flags?|warning signs?)\b/i,
  /\b(help me|can you|please)\s+.*\b(check|screen|look)\s+.*\b(red flags?|warning signs?)\b/i,
];

const ACTIVE_SYMPTOM_PATTERNS = [
  /\b(i|we)\s+(have|has|am|are|feel|feeling|experiencing|suffering)\b/i,
  /\b(he|she|they|my\s+\w+|patient|person|child|baby|father|mother)\s+(has|have|is|are|feels|feeling|experiencing|suffering)\b/i,
  /\bwith\s+(chest pain|difficulty breathing|shortness of breath|one-sided weakness|severe weakness|confusion|fainting|seizure)\b/i,
];

function isRedFlagScreeningQuestion(text = "") {
  const normalized = String(text || "").trim();

  if (!normalized || !RED_FLAG_SCREENING_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  return !ACTIVE_SYMPTOM_PATTERNS.some((pattern) => pattern.test(normalized));
}

const LANGUAGE_INSTRUCTIONS = {
  hi: "Respond in simple Hindi using Devanagari. Avoid medical jargon.",
  mr: "Respond in Marathi.",
  ta: "Respond in Tamil.",
  te: "Respond in Telugu.",
  bn: "Respond in Bengali.",
  en: "Respond in English.",
};

const TRIAGE_TIERS = {
  HOME_CARE: {
    id: "HOME_CARE",
    label: "Tier 1: Reassurance & Home Care",
    action: "Use home care, monitor trends, and ask follow-up questions if context is missing.",
  },
  DOCTOR: {
    id: "DOCTOR",
    label: "Tier 2: Consult the Doctor",
    action: "Create a concise doctor summary and arrange a non-emergency medical review.",
  },
  EMERGENCY: {
    id: "EMERGENCY",
    label: "Tier 3: Red Flag / Escalation",
    action: "Stop routine advice and seek emergency care now.",
  },
};

export const INTAKE_PROMPT_MARKER = "To guide you safely, please answer these first:";

export function hasRecentIntakePrompt(chatHistory = []) {
  if (!Array.isArray(chatHistory)) {
    return false;
  }

  return chatHistory
    .slice(-4)
    .some(
      (entry) =>
        entry?.sender === "ai" &&
        String(entry?.text || "").includes(INTAKE_PROMPT_MARKER)
    );
}

export function shouldAskIntakeBeforeAnswer(intakeQuestions = [], chatHistory = [], risk = { level: "LOW" }) {
  if (!Array.isArray(intakeQuestions) || intakeQuestions.length === 0) {
    return false;
  }

  if (risk?.level === "EMERGENCY") {
    return false;
  }

  return !hasRecentIntakePrompt(chatHistory);
}

export function buildIntakePrompt(intakeQuestions = [], risk = { level: "LOW" }, member = null) {
  const questions = Array.isArray(intakeQuestions) ? intakeQuestions.slice(0, 4) : [];
  const focus = member?.name ? ` for ${member.name}` : "";
  const urgentLine =
    risk?.level === "HIGH"
      ? "\n\nIf there is trouble breathing, chest pain, fainting, confusion, one-sided weakness, or severe worsening, do not wait here. Call 112 or go to emergency care now."
      : "";

  return [
    `${INTAKE_PROMPT_MARKER}${focus}`,
    "",
    ...questions.map((question, index) => `${index + 1}. ${question.prompt}`),
    "",
    "Reply with whatever you know. If one answer is not available, say unknown and I will continue safely.",
    urgentLine,
  ]
    .filter(Boolean)
    .join("\n");
}

const summarizeMember = (member) => {
  if (!member) {
    return "No saved member profile is selected. Give careful general guidance and mention when more details would improve safety.";
  }

  const facts = [
    member.name ? `Name: ${member.name}` : null,
    member.age ? `Age: ${member.age}` : null,
    member.gender ? `Gender: ${member.gender}` : null,
    member.relation ? `Relation: ${member.relation}` : null,
    Array.isArray(member.conditions) && member.conditions.length
      ? `Conditions: ${member.conditions.join(", ")}`
      : null,
    Array.isArray(member.allergies) && member.allergies.length
      ? `Allergies: ${member.allergies.join(", ")}`
      : null,
    Array.isArray(member.medications) && member.medications.length
      ? `Medications: ${member.medications.join(", ")}`
      : null,
  ].filter(Boolean);

  return facts.join("\n") || "No additional member history is available.";
};

const normalizeHistory = (history = []) =>
  Array.isArray(history)
    ? history
        .slice(-12)
        .map((entry) => {
          const sender = entry?.sender === "user" ? "User" : "Assistant";
          const text = String(entry?.text || entry?.content || "").trim();
          return text ? `${sender}: ${text}` : null;
        })
        .filter(Boolean)
        .join("\n")
    : "";

export function triageCheck(message, age) {
  const text = String(message || "").trim();

  if (!text) {
    return { stopProcessing: false, response: "" };
  }

  if (isRedFlagScreeningQuestion(text)) {
    return { stopProcessing: false, response: "" };
  }

  if (EMERGENCY_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      stopProcessing: true,
      response:
        "Emergency warning signs are present. Call 112 immediately or go to the nearest emergency department now.",
    };
  }

  if (
    age !== null &&
    age !== undefined &&
    Number(age) < 1 &&
    /\b(high fever|trouble breathing|not feeding)\b/i.test(text)
  ) {
    return {
      stopProcessing: true,
      response:
        "This may be urgent for an infant. Please seek immediate medical care or call 112 right now.",
    };
  }

  return { stopProcessing: false, response: "" };
}

export function assessRisk(message, member) {
  const text = String(message || "");
  const matchedRisks = [];
  const screeningForRedFlags = isRedFlagScreeningQuestion(text);

  if (!screeningForRedFlags && HIGH_RISK_PATTERNS.some((pattern) => pattern.test(text))) {
    matchedRisks.push("high-risk symptom pattern");
  }

  if (MODERATE_RISK_PATTERNS.some((pattern) => pattern.test(text))) {
    matchedRisks.push("moderate symptom pattern");
  }

  if (Array.isArray(member?.conditions) && member.conditions.length > 0) {
    matchedRisks.push("existing medical conditions");
  }

  if (!screeningForRedFlags && HIGH_RISK_PATTERNS.some((pattern) => pattern.test(text))) {
    return { level: "HIGH", risks: matchedRisks };
  }

  if (matchedRisks.length > 0) {
    return { level: "MODERATE", risks: matchedRisks };
  }

  return { level: "LOW", risks: [] };
}

const RISK_RANK = {
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  EMERGENCY: 4,
};

export function mergeRisk(baseRisk = { level: "LOW", risks: [] }, clinicalRules = {}) {
  const baseLevel = baseRisk.level || "LOW";
  const ruleLevel = clinicalRules.level || "LOW";
  const level = RISK_RANK[ruleLevel] > RISK_RANK[baseLevel] ? ruleLevel : baseLevel;
  const ruleRisks = Array.isArray(clinicalRules.warnings) ? clinicalRules.warnings : [];

  return {
    level,
    risks: Array.from(new Set([...(baseRisk.risks || []), ...ruleRisks])).slice(0, 8),
    clinicalRules,
  };
}

function latestEntry(entries = []) {
  if (!Array.isArray(entries) || !entries.length) return null;

  return entries
    .slice()
    .sort((a, b) => new Date(b?.date || b?.createdAt || 0) - new Date(a?.date || a?.createdAt || 0))[0];
}

function parseNumericValue(entry) {
  const numericValue = Number(entry?.value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function parseBloodPressureValue(entry) {
  const match = String(entry?.value || "").match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;

  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
}

function summarizeVitals(member) {
  const health = member?.health || {};
  const signals = [];
  const latestBp = parseBloodPressureValue(latestEntry(health.bloodPressure));
  const latestHeartRate = parseNumericValue(latestEntry(health.heartRate));
  const latestSleep = parseNumericValue(latestEntry(health.sleep));
  const latestSugar = parseNumericValue(latestEntry(health.bloodSugar));

  if (latestBp) {
    signals.push(`latest BP ${latestBp.systolic}/${latestBp.diastolic}`);
  }
  if (latestHeartRate !== null) {
    signals.push(`latest heart rate ${latestHeartRate}`);
  }
  if (latestSleep !== null) {
    signals.push(`latest sleep ${latestSleep}h`);
  }
  if (latestSugar !== null) {
    signals.push(`latest blood sugar ${latestSugar}`);
  }

  return signals;
}

function summarizeCollectedData(collectedData = {}) {
  const signals = [];
  const vitals = collectedData.vitals || collectedData.wearables || {};
  const environment = collectedData.environment || {};

  if (vitals.sleepHours) signals.push(`sleep ${vitals.sleepHours}h`);
  if (vitals.heartRate) signals.push(`heart rate ${vitals.heartRate}`);
  if (vitals.spo2) signals.push(`SpO2 ${vitals.spo2}%`);
  if (environment.aqi) signals.push(`AQI ${environment.aqi}`);
  if (environment.pollen) signals.push(`pollen ${environment.pollen}`);
  if (environment.heatIndex) signals.push(`heat index ${environment.heatIndex}`);
  if (environment.outbreak) signals.push(`local outbreak: ${environment.outbreak}`);

  return signals;
}

function buildLatestVitals(member) {
  const health = member?.health || {};
  const latestBp = parseBloodPressureValue(latestEntry(health.bloodPressure));
  const latestHeartRate = parseNumericValue(latestEntry(health.heartRate));
  const latestSleep = parseNumericValue(latestEntry(health.sleep));
  const latestSugar = parseNumericValue(latestEntry(health.bloodSugar));
  const latestWeight = parseNumericValue(latestEntry(health.weight));
  const latestSteps = parseNumericValue(latestEntry(health.steps));

  return {
    ...(latestBp ? { bloodPressure: `${latestBp.systolic}/${latestBp.diastolic}` } : {}),
    ...(latestHeartRate !== null ? { heartRate: latestHeartRate } : {}),
    ...(latestSleep !== null ? { sleepHours: latestSleep } : {}),
    ...(latestSugar !== null ? { bloodSugar: latestSugar } : {}),
    ...(latestWeight !== null ? { weight: latestWeight } : {}),
    ...(latestSteps !== null ? { steps: latestSteps } : {}),
  };
}

export function buildContextualCollectedData(member, collectedData = {}) {
  const latestVitals = buildLatestVitals(member);
  const suppliedVitals = collectedData.vitals || collectedData.wearables || {};

  return {
    ...collectedData,
    vitals: {
      ...latestVitals,
      ...suppliedVitals,
    },
    profileContext: {
      ...(collectedData.profileContext || {}),
      hasSavedProfile: Boolean(member),
      memberName: member?.name || "",
      age: member?.age ?? null,
      conditions: member?.conditions || [],
      allergies: member?.allergies || [],
      medications: member?.medications || [],
      pregnancyStatus: member?.pregnancyStatus || "not_applicable",
      childSensitive: Boolean(member?.childSensitive),
    },
  };
}

export function assessContextualTriage({
  message,
  member,
  collectedData = {},
  risk = { level: "LOW", risks: [] },
  clinicalRules = {},
  healthTrends = {},
  knowledgeEntries = [],
  emergency = false,
}) {
  const text = String(message || "");
  const contextSignals = [];
  const profileGaps = [];
  const doctorPacket = [];
  let tier = TRIAGE_TIERS.HOME_CARE;

  if (emergency || risk.level === "EMERGENCY") {
    tier = TRIAGE_TIERS.EMERGENCY;
  } else if (risk.level === "HIGH") {
    tier = TRIAGE_TIERS.DOCTOR;
  }

  if (clinicalRules.tier === "EMERGENCY") {
    tier = TRIAGE_TIERS.EMERGENCY;
  } else if (clinicalRules.tier === "DOCTOR" && tier.id !== "EMERGENCY") {
    tier = TRIAGE_TIERS.DOCTOR;
  }

  if (!member) {
    profileGaps.push("saved member profile");
  } else {
    contextSignals.push(`profile for ${member.name || "selected member"}`);

    if (Array.isArray(member.conditions) && member.conditions.length) {
      contextSignals.push(`conditions: ${member.conditions.slice(0, 3).join(", ")}`);
    } else {
      profileGaps.push("known conditions");
    }

    if (Array.isArray(member.allergies) && member.allergies.length) {
      contextSignals.push(`allergies: ${member.allergies.slice(0, 3).join(", ")}`);
    } else {
      profileGaps.push("allergies");
    }

    if (Array.isArray(member.medications) && member.medications.length) {
      contextSignals.push(`medications: ${member.medications.slice(0, 3).join(", ")}`);
    } else {
      profileGaps.push("current medicines");
    }

    contextSignals.push(...summarizeVitals(member));
  }

  const collectedSignals = summarizeCollectedData(collectedData);
  contextSignals.push(...collectedSignals);

  if (!collectedSignals.length) {
    profileGaps.push("today's vitals or environment");
  }

  if (risk.risks?.length) {
    contextSignals.push(...risk.risks.slice(0, 3));
  }

  if (healthTrends?.summary) {
    contextSignals.push(
      ...String(healthTrends.summary)
        .split("\n")
        .filter(Boolean)
        .slice(0, 3)
    );
  }

  if (clinicalRules.warnings?.length) {
    doctorPacket.push(`clinical rules: ${clinicalRules.warnings.slice(0, 3).join("; ")}`);
  }

  if (healthTrends?.flags?.length) {
    doctorPacket.push(`trend flags: ${healthTrends.flags.map((flag) => flag.message).join("; ")}`);
  }

  if (knowledgeEntries.length) {
    doctorPacket.push(`reference snippets: ${knowledgeEntries.map((entry) => entry.title).join(", ")}`);
  }

  if (/(\b\d+\s*(day|days|week|weeks)\b|persistent|recurring|keeps coming back)/i.test(text)) {
    tier = tier.id === "EMERGENCY" ? tier : TRIAGE_TIERS.DOCTOR;
    doctorPacket.push("duration or recurrence mentioned");
  }

  doctorPacket.push(`main concern: ${text.slice(0, 160)}`);
  if (contextSignals.length) {
    doctorPacket.push(`context checked: ${contextSignals.slice(0, 5).join("; ")}`);
  }

  return {
    tier: tier.id,
    label: tier.label,
    action: tier.action,
    contextSignals: contextSignals.slice(0, 6),
    profileGaps: Array.from(new Set(profileGaps)).slice(0, 5),
    doctorPacket: doctorPacket.slice(0, 5),
    trendFlags: Array.isArray(healthTrends?.flags)
      ? healthTrends.flags.map((flag) => flag.message).filter(Boolean).slice(0, 6)
      : [],
    sourceReferences: knowledgeEntries
      .map((entry) => ({
        title: entry.title || "",
        source: entry.source || "",
        url: entry.url || "",
      }))
      .slice(0, 6),
  };
}

export function buildIntakeQuestions(message, member, triageSummary = {}, risk = { level: "LOW" }) {
  const text = String(message || "").toLowerCase();
  const questions = [];
  const hasDuration = /\b(\d+\s*(hour|hours|day|days|week|weeks)|since|today|yesterday|persistent|recurring)\b/i.test(text);
  const hasSeverity = /\b(mild|moderate|severe|very bad|\d+\s*\/\s*10)\b/i.test(text);
  const hasMedicine = /\b(took|taken|medicine|tablet|syrup|dose|paracetamol|ibuprofen|cetirizine)\b/i.test(text);
  const hasFever = /\b(fever|temperature|viral|chills)\b/i.test(text);
  const hasBreathing = /\b(cough|cold|breath|wheezing|oxygen|spo2|congestion)\b/i.test(text);
  const hasDizziness = /\b(dizz|faint|lightheaded|vertigo)\b/i.test(text);
  const hasPain = /\b(pain|ache|headache|cramp|hurt)\b/i.test(text);
  const hasProfileGap = Array.isArray(triageSummary.profileGaps) && triageSummary.profileGaps.length > 0;

  const addQuestion = (id, label, prompt, priority = 5) => {
    if (questions.some((item) => item.id === id)) return;
    questions.push({ id, label, prompt, priority });
  };

  if (!member) {
    addQuestion(
      "profile",
      "Add profile context",
      "Who is this about, and what are their age, known conditions, allergies, and current medicines?",
      1
    );
  }

  if (!hasDuration) {
    addQuestion("duration", "Add duration", "How long has this been happening, and did it start suddenly or gradually?", 2);
  }

  if ((hasPain || risk.level !== "LOW") && !hasSeverity) {
    addQuestion("severity", "Add severity", "On a scale of 1 to 10, how severe is it right now?", 3);
  }

  if (hasFever) {
    addQuestion("temperature", "Add temperature", "What is the latest temperature reading, and when was it checked?", 2);
  }

  if (hasBreathing) {
    addQuestion("oxygen", "Add SpO2", "Do you have the latest oxygen level, heart rate, or breathing rate reading?", 2);
  }

  if (hasDizziness) {
    addQuestion("bp_sugar", "Add BP/sugar", "Can you share the latest BP and blood sugar reading, and whether any medicine dose was missed?", 2);
  }

  if (!hasMedicine && (risk.level !== "LOW" || hasProfileGap)) {
    addQuestion("medicine_taken", "Medicine taken", "Has anything already been taken for this, including home remedies or prescribed medicine?", 4);
  }

  addQuestion(
    "red_flags",
    "Check red flags",
    "Help me check for red flags. Ask if there is trouble breathing, chest pain, confusion, fainting, severe weakness, or one-sided numbness.",
    risk.level === "HIGH" ? 1 : risk.level === "MODERATE" ? 3 : 6
  );

  return questions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 4)
    .map(({ priority, ...question }) => question);
}

export function buildPrompt(
  member,
  intent = "symptom_check",
  profileData = {},
  collectedData = {},
  risk = { level: "LOW", risks: [] },
  chatHistory = [],
  language = "en",
  clinicalContext = {}
) {
  return `You are SwasthaParivar AI, a careful family health guide.

INTENT: ${intent}
RISK LEVEL: ${risk.level}
RISK FACTORS: ${risk.risks?.length ? risk.risks.join(", ") : "none recorded"}
LANGUAGE: ${LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.en}

CLINICAL RULES:
${clinicalContext.clinicalRules?.matchedRules?.length ? JSON.stringify(clinicalContext.clinicalRules.matchedRules, null, 2) : "No deterministic clinical rules matched."}

HEALTH TRENDS:
${clinicalContext.healthTrends?.summary || "No saved health trend summary is available."}

TRUSTED SOURCE SNIPPETS:
${clinicalContext.knowledgeBlock || "No trusted-source snippets matched. Be conservative and ask for missing context."}

MEMBER PROFILE:
${summarizeMember(member)}

PROFILE DATA:
${JSON.stringify(profileData || {}, null, 2)}

COLLECTED DATA:
${JSON.stringify(collectedData || {}, null, 2)}

RECENT CHAT:
${normalizeHistory(chatHistory) || "No recent chat history."}

INSTRUCTIONS:
- Give medical guidance, not diagnosis.
- First route the concern through patient history, latest vitals, health trends, recent chat, clinical rules, and trusted-source snippets before answering.
- Prefer deterministic clinical rule warnings over model intuition if they conflict.
- Use trusted-source snippets only as grounding context; do not claim a diagnosis.
- If a doctor visit is appropriate, include a short doctor-ready summary of symptoms, context, and vitals.
- If red flags are present, stop routine advice and emphasize immediate emergency care.
- If important context is missing, ask short follow-up questions before sounding certain.
- Be calm, clear, and practical.
- Use this structure: Summary, What to do now, Watch-outs, When to contact a doctor.
- Mention safety warnings early when risk is high.
- Avoid generic lists. Personalize to saved conditions, allergies, medicines, vitals, and trend flags.
- Keep the answer concise but useful.
`;
}

export function buildFallbackResponse(message, member, risk, clinicalContext = {}) {
  const focus = member?.name || "this person";
  const ruleWarnings = clinicalContext.clinicalRules?.warnings || [];
  const trendFlags = clinicalContext.healthTrends?.flags || [];

  return [
    "Summary:",
    `Here is careful guidance for ${focus}.`,
    ruleWarnings.length ? `Safety note: ${ruleWarnings.slice(0, 2).join(" ")}` : null,
    trendFlags.length ? `Trend note: ${trendFlags.slice(0, 2).map((flag) => flag.message).join(" ")}` : null,
    "",
    "What to do now:",
    `- Monitor the main symptoms described: ${String(message || "current symptoms").trim()}.`,
    "- Encourage rest, hydration, and simple meals if tolerated.",
    "- Use only medicines already known to be safe for this person.",
    "",
    "Watch-outs:",
    risk?.level === "HIGH"
      ? "- Because this may be higher risk, worsening symptoms should be assessed urgently."
      : "- Watch for worsening pain, breathing trouble, dehydration, confusion, or unusual weakness.",
    "",
    "When to contact a doctor:",
    risk?.level === "HIGH"
      ? "- Please contact a doctor today, or seek urgent care if the person worsens."
      : "- Contact a doctor if symptoms persist, worsen, or new red flags appear.",
  ].filter((line) => line !== null).join("\n");
}

export function buildSuggestedReminder(message, member) {
  const text = String(message || "").toLowerCase();
  const memberName = member?.name || "Family member";

  if (/\b(medicine|medication|tablet|dose|daily|twice)\b/i.test(text)) {
    return {
      title: `${memberName} medicine`,
      type: "medicine",
    };
  }

  if (/\b(checkup|follow up|follow-up|doctor visit)\b/i.test(text)) {
    return {
      title: `${memberName} checkup`,
      type: "checkup",
    };
  }

  return null;
}

export function buildFollowUpPrompt(message, risk) {
  if (risk?.level === "HIGH") {
    return "What warning signs should I watch for over the next few hours?";
  }

  if (/\b(fever|temperature)\b/i.test(String(message || ""))) {
    return "How should I track fever, hydration, and medicines for the next 24 hours?";
  }

  if (/\b(cough|cold|sore throat)\b/i.test(String(message || ""))) {
    return "What symptoms should I track to know if this is getting worse?";
  }

  return "What should I monitor next, and when should I get medical help?";
}
