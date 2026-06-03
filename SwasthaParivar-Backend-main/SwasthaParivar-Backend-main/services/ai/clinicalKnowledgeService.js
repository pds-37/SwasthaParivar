const KNOWLEDGE_ENTRIES = [
  {
    id: "emergency_red_flags",
    title: "Emergency red flags",
    source: "General emergency care guidance aligned with WHO/NHS/CDC public health advice",
    url: "https://www.who.int/health-topics/emergency-care",
    keywords: [
      "chest pain",
      "breathing",
      "shortness of breath",
      "stroke",
      "seizure",
      "unconscious",
      "bleeding",
      "confusion",
      "fainting",
    ],
    summary:
      "Chest pain, severe breathing difficulty, stroke-like symptoms, seizure, unconsciousness, severe bleeding, or new confusion should be treated as urgent warning signs requiring emergency care.",
  },
  {
    id: "fever_child",
    title: "Fever in children",
    source: "Public pediatric safety guidance aligned with NHS/CDC advice",
    url: "https://www.nhs.uk/conditions/fever-in-children/",
    keywords: ["fever", "temperature", "child", "infant", "baby", "newborn", "toddler"],
    requiredAny: ["child", "infant", "baby", "newborn", "toddler"],
    summary:
      "Fever risk depends on age, hydration, alertness, breathing, duration, and associated symptoms. Infants and children with breathing trouble, dehydration, unusual drowsiness, seizures, or persistent high fever need medical review.",
  },
  {
    id: "blood_pressure_warning",
    title: "Blood pressure warning signs",
    source: "Public hypertension safety guidance aligned with American Heart Association advice",
    url: "https://www.heart.org/en/health-topics/high-blood-pressure",
    keywords: ["blood pressure", "bp", "hypertension", "headache", "dizziness"],
    summary:
      "Very high blood pressure with chest pain, breathlessness, neurological symptoms, vision changes, or severe headache can be dangerous and should be escalated urgently.",
  },
  {
    id: "diabetes_sick_day",
    title: "Diabetes sick-day safety",
    source: "Public diabetes safety guidance aligned with CDC/NHS advice",
    url: "https://www.cdc.gov/diabetes/",
    keywords: ["diabetes", "blood sugar", "glucose", "insulin", "metformin", "vomiting", "dizziness"],
    requiredAny: ["diabetes", "diabetic", "blood sugar", "glucose", "insulin", "metformin"],
    summary:
      "People with diabetes need extra caution during illness, vomiting, poor intake, dizziness, or abnormal glucose readings. Very low or very high readings, confusion, dehydration, or persistent vomiting need clinician advice.",
  },
  {
    id: "pregnancy_warning",
    title: "Pregnancy warning signs",
    source: "Public pregnancy safety guidance aligned with WHO/NHS advice",
    url: "https://www.who.int/health-topics/maternal-health",
    keywords: ["pregnant", "pregnancy", "postpartum", "bleeding", "headache", "swelling", "fever"],
    requiredAny: ["pregnant", "pregnancy", "postpartum"],
    summary:
      "Pregnancy and postpartum symptoms need a lower threshold for clinician review, especially bleeding, severe abdominal pain, severe headache, vision changes, swelling, fever, fainting, or reduced fetal movement.",
  },
  {
    id: "medicine_safety",
    title: "Medicine safety",
    source: "General medicine safety principles aligned with public pharmacy guidance",
    url: "https://www.nhs.uk/medicines/",
    keywords: ["medicine", "medication", "tablet", "dose", "dosage", "allergy", "side effect"],
    summary:
      "Medicine advice should account for age, allergies, pregnancy, current medicines, dose, timing, and kidney/liver or chronic conditions. Unclear doses or reactions should be checked with a clinician or pharmacist.",
  },
];

const normalize = (value = "") => String(value || "").toLowerCase();

export function retrieveClinicalKnowledge(message = "", context = {}) {
  const haystack = [
    message,
    ...(context.conditions || []),
    ...(context.medications || []),
    ...(context.allergies || []),
    context.pregnancyStatus || "",
    context.childSensitive ? "child" : "",
  ]
    .map(normalize)
    .join(" ");

  return KNOWLEDGE_ENTRIES.map((entry) => {
    if (
      Array.isArray(entry.requiredAny) &&
      !entry.requiredAny.some((keyword) => haystack.includes(normalize(keyword)))
    ) {
      return { ...entry, score: 0 };
    }

    const score = entry.keywords.reduce(
      (total, keyword) => total + (haystack.includes(normalize(keyword)) ? 1 : 0),
      0
    );

    return { ...entry, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ score, ...entry }) => entry);
}

export function formatKnowledgeForPrompt(entries = []) {
  if (!entries.length) {
    return "No specific trusted-source snippets matched. Stay cautious and ask for missing context.";
  }

  return entries
    .map(
      (entry) =>
        `- ${entry.title}: ${entry.summary} Source: ${entry.source} (${entry.url})`
    )
    .join("\n");
}

export default {
  retrieveClinicalKnowledge,
  formatKnowledgeForPrompt,
};
