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

const LANGUAGE_INSTRUCTIONS = {
  hi: "Respond in simple Hindi using Devanagari. Avoid medical jargon.",
  mr: "Respond in Marathi.",
  ta: "Respond in Tamil.",
  te: "Respond in Telugu.",
  bn: "Respond in Bengali.",
  en: "Respond in English.",
};

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

  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(text))) {
    matchedRisks.push("high-risk symptom pattern");
  }

  if (MODERATE_RISK_PATTERNS.some((pattern) => pattern.test(text))) {
    matchedRisks.push("moderate symptom pattern");
  }

  if (Array.isArray(member?.conditions) && member.conditions.length > 0) {
    matchedRisks.push("existing medical conditions");
  }

  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(text))) {
    return { level: "HIGH", risks: matchedRisks };
  }

  if (matchedRisks.length > 0) {
    return { level: "MODERATE", risks: matchedRisks };
  }

  return { level: "LOW", risks: [] };
}

export function buildPrompt(
  member,
  intent = "symptom_check",
  profileData = {},
  collectedData = {},
  risk = { level: "LOW", risks: [] },
  chatHistory = [],
  language = "en"
) {
  return `You are SwasthaParivar AI, a careful family health guide.

INTENT: ${intent}
RISK LEVEL: ${risk.level}
RISK FACTORS: ${risk.risks?.length ? risk.risks.join(", ") : "none recorded"}
LANGUAGE: ${LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.en}

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
- Be calm, clear, and practical.
- Use this structure: Summary, What to do now, Watch-outs, When to contact a doctor.
- Mention safety warnings early when risk is high.
- Keep the answer concise but useful.
`;
}

export function buildFallbackResponse(message, member, risk) {
  const focus = member?.name || "this person";
  return [
    "Summary:",
    `Here is careful guidance for ${focus}.`,
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
  ].join("\n");
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
