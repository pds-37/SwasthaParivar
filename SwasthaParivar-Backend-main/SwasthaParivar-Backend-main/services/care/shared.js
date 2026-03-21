export const SYMPTOM_LIBRARY = [
  { tag: "cough", aliases: ["cough", "coughing", "dry cough", "wet cough"] },
  { tag: "cold", aliases: ["cold", "runny nose", "common cold"] },
  { tag: "sore throat", aliases: ["sore throat", "throat pain", "throat irritation"] },
  { tag: "congestion", aliases: ["congestion", "blocked nose", "stuffy nose", "phlegm"] },
  { tag: "fever", aliases: ["fever", "high temperature", "temperature"] },
  { tag: "headache", aliases: ["headache", "migraine", "head pain"] },
  { tag: "fatigue", aliases: ["fatigue", "tired", "weakness", "low energy"] },
  { tag: "bloating", aliases: ["bloating", "bloated", "gas", "stomach heaviness"] },
  { tag: "acidity", aliases: ["acidity", "acid reflux", "heartburn"] },
  { tag: "indigestion", aliases: ["indigestion", "upset stomach", "digestion issue"] },
  { tag: "nausea", aliases: ["nausea", "vomiting", "queasy"] },
  { tag: "joint pain", aliases: ["joint pain", "body ache", "stiffness", "pain"] },
  { tag: "sleep trouble", aliases: ["insomnia", "sleep", "sleep trouble", "restless"] },
  { tag: "stress", aliases: ["stress", "anxious", "anxiety", "tense"] },
];

const RED_FLAG_PATTERNS = [
  { label: "Breathing difficulty reported", regex: /(breathless|shortness of breath|cannot breathe|can't breathe|wheezing)/i },
  { label: "Chest pain reported", regex: /(chest pain|tight chest)/i },
  { label: "High fever concern", regex: /(104|105|very high fever|persistent fever|burning fever)/i },
  { label: "Possible dehydration", regex: /(dehydrated|not drinking|very dry|sunken eyes)/i },
  { label: "Bleeding or blood mentioned", regex: /(bleeding|blood in)/i },
  { label: "Confusion or fainting reported", regex: /(confused|confusion|fainted|fainting|unconscious)/i },
];

export function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase();
}

export function uniqueStrings(values = []) {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  ));
}

export function normalizeListInput(value) {
  if (Array.isArray(value)) {
    return uniqueStrings(value);
  }

  if (typeof value === "string") {
    return uniqueStrings(value.split(/[,\n]/));
  }

  return [];
}

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function safeAverage(numbers = []) {
  const valid = numbers.filter((value) => Number.isFinite(value));
  if (valid.length === 0) {
    return 0;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function getLatestMetricEntry(entries = []) {
  return entries
    .slice()
    .sort((left, right) => new Date(right?.date || 0) - new Date(left?.date || 0))[0] || null;
}

export function numberValue(entry) {
  const numeric = Number(entry?.value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function parseBloodPressure(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) {
    return null;
  }

  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
}

export function getLatestVitals(member) {
  const health = member?.health || {};
  const bloodPressure = getLatestMetricEntry(health.bloodPressure)?.value || null;
  const parsedBloodPressure = parseBloodPressure(bloodPressure);

  return {
    bloodPressure,
    parsedBloodPressure,
    heartRate: numberValue(getLatestMetricEntry(health.heartRate)),
    bloodSugar: numberValue(getLatestMetricEntry(health.bloodSugar)),
    weight: numberValue(getLatestMetricEntry(health.weight)),
    sleep: numberValue(getLatestMetricEntry(health.sleep)),
    steps: numberValue(getLatestMetricEntry(health.steps)),
  };
}

export function extractSymptomsFromText(message = "", explicitSymptoms = []) {
  const text = normalizeText(message);
  const found = new Set(normalizeListInput(explicitSymptoms).map(normalizeText));

  SYMPTOM_LIBRARY.forEach((entry) => {
    if (entry.aliases.some((alias) => text.includes(alias))) {
      found.add(entry.tag);
    }
  });

  return Array.from(found);
}

export function detectRedFlagsFromText(message = "", memberContext = {}) {
  const text = normalizeText(message);
  const flags = RED_FLAG_PATTERNS
    .filter((entry) => entry.regex.test(text))
    .map((entry) => entry.label);

  if (memberContext.flags?.pregnant && /(bleeding|severe pain|high fever)/i.test(text)) {
    flags.push("Pregnancy-related escalation risk");
  }

  if (memberContext.flags?.childSensitive && /(refusing food|refusing water|continuous crying)/i.test(text)) {
    flags.push("Child profile with worsening intake or distress");
  }

  return uniqueStrings(flags);
}

export function inferSymptomSeverityScore(message = "", explicitScore = null) {
  if (Number.isFinite(explicitScore)) {
    return explicitScore;
  }

  const text = normalizeText(message);

  if (/(severe|worse|worsening|can't sleep|cannot sleep|very high|unbearable|persistent)/i.test(text)) {
    return 4;
  }

  if (/(again|moderate|since yesterday|two days|2 days|still there)/i.test(text)) {
    return 3;
  }

  return 2;
}

export function severityLabelFromScore(score = 2) {
  if (score >= 4) {
    return "severe";
  }

  if (score >= 3) {
    return "moderate";
  }

  return "mild";
}

export function getSeason(date = new Date()) {
  const month = new Date(date).getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export function symptomOverlap(left = [], right = []) {
  const a = new Set(left.map(normalizeText));
  const b = new Set(right.map(normalizeText));
  let count = 0;

  a.forEach((item) => {
    if (b.has(item)) {
      count += 1;
    }
  });

  return count;
}

export function buildMemberRiskProfile(member, medicationProfile, allergyProfile) {
  const latestVitals = getLatestVitals(member);
  const conditions = normalizeListInput(member?.conditions).map(normalizeText);
  const activeMedications = [
    ...normalizeListInput(member?.medications),
    ...((medicationProfile?.activeMedications || []).map((entry) => entry.name)),
  ].map(normalizeText);
  const allergies = [
    ...normalizeListInput(member?.allergies),
    ...((allergyProfile?.allergens || []).map((entry) => entry.name)),
  ].map(normalizeText);
  const avoidedIngredients = normalizeListInput(member?.baselinePreferences?.avoidedIngredients).map(normalizeText);
  const age = Number(member?.age || 0);
  const parsedBloodPressure = latestVitals.parsedBloodPressure;

  const flags = {
    childSensitive: Boolean(member?.childSensitive) || (age > 0 && age < 12),
    pregnant: member?.pregnancyStatus === "pregnant",
    highBp:
      Boolean(parsedBloodPressure && (parsedBloodPressure.systolic >= 140 || parsedBloodPressure.diastolic >= 90)) ||
      conditions.some((entry) => entry.includes("hypertension") || entry.includes("blood pressure")),
    highSugar:
      Boolean(latestVitals.bloodSugar !== null && latestVitals.bloodSugar >= 140) ||
      conditions.some((entry) => entry.includes("diabet") || entry.includes("sugar")),
    poorSleep: Boolean(latestVitals.sleep !== null && latestVitals.sleep < 6),
    highHeartRate: Boolean(latestVitals.heartRate !== null && latestVitals.heartRate > 100),
    lowActivity: Boolean(latestVitals.steps !== null && latestVitals.steps < 4000),
    bloodThinner:
      activeMedications.some((entry) => /(warfarin|apixaban|rivaroxaban|blood thinner|aspirin|clopidogrel)/i.test(entry)),
    elderly: age >= 60,
  };

  return {
    member,
    age,
    conditions,
    allergies,
    activeMedications,
    avoidedIngredients,
    latestVitals,
    flags,
  };
}

export function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleString();
}
