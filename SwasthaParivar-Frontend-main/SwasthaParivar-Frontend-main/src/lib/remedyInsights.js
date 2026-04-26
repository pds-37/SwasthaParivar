const CONDITION_TAG_MAP = {
  acidity: ["Digestion", "Hydration", "Nausea"],
  anxiety: ["Relaxation", "Sleep"],
  asthma: ["Respiratory", "Cold"],
  bloating: ["Digestion", "Detox"],
  cold: ["Cold", "Cough", "Immunity", "Respiratory", "Throat"],
  constipation: ["Digestion", "Detox"],
  cough: ["Cough", "Throat", "Respiratory"],
  diabetes: ["Metabolic", "Digestion", "Hydration"],
  digestion: ["Digestion", "Detox", "Metabolic"],
  fatigue: ["Hydration", "Immunity", "Metabolic"],
  hair: ["Hair", "Immunity", "Skin"],
  headache: ["Hydration", "Relaxation"],
  hypertension: ["Relaxation", "Sleep", "Hydration", "Inflammation"],
  indigestion: ["Digestion", "Detox", "Nausea"],
  insomnia: ["Sleep", "Relaxation"],
  nausea: ["Nausea", "Digestion", "Hydration"],
  pain: ["Pain", "Inflammation", "Relaxation"],
  pcos: ["Metabolic", "Digestion", "Skin"],
  pregnancy: ["Digestion", "Hydration", "Sleep"],
  pregnant: ["Digestion", "Hydration", "Sleep"],
  skin: ["Skin", "Hydration", "Detox"],
  sleep: ["Sleep", "Relaxation"],
  sore: ["Throat", "Cold"],
  stress: ["Relaxation", "Sleep"],
  throat: ["Throat", "Cough", "Respiratory"],
  weight: ["Metabolic", "Digestion", "Hydration"],
};

const TAG_FAMILY_MAP = {
  All: [],
  Cold: ["Cold", "Cough", "Respiratory", "Throat", "Immunity"],
  Cough: ["Cough", "Cold", "Respiratory", "Throat"],
  Detox: ["Detox", "Digestion", "Hydration", "Metabolic", "Skin"],
  Digestion: ["Digestion", "Detox", "Metabolic", "Nausea"],
  Hair: ["Hair", "Skin", "Immunity", "Metabolic"],
  Hydration: ["Hydration", "Skin", "Metabolic", "Digestion"],
  Immunity: ["Immunity", "Cold", "Cough", "Hair", "Skin"],
  Inflammation: ["Inflammation", "Pain", "Relaxation"],
  Metabolic: ["Metabolic", "Digestion", "Hydration", "Detox"],
  Nasal: ["Nasal", "Respiratory", "Cold", "Cough"],
  Nausea: ["Nausea", "Digestion", "Hydration"],
  Oral: ["Oral"],
  Pain: ["Pain", "Inflammation", "Relaxation"],
  Relaxation: ["Relaxation", "Sleep", "Pain"],
  Respiratory: ["Respiratory", "Cold", "Cough", "Throat", "Nasal"],
  Skin: ["Skin", "Hydration", "Detox", "Hair"],
  Sleep: ["Sleep", "Relaxation"],
  Stress: ["Stress", "Relaxation", "Sleep"],
  Throat: ["Throat", "Cough", "Cold", "Respiratory"],
  Vata: ["Vata", "Sleep", "Relaxation", "Nasal"],
  Women: ["Women", "Digestion", "Relaxation"],
};

const QUERY_STOP_WORDS = new Set([
  "and",
  "for",
  "the",
  "with",
  "from",
  "into",
  "your",
  "home",
  "best",
  "good",
  "mild",
  "daily",
  "care",
  "support",
  "issue",
  "problem",
  "remedy",
  "remedies",
]);

const QUERY_INTENT_RULES = [
  {
    pattern: /\b(acidity|acid reflux|heartburn|burning stomach|gastric|gastritis)\b/i,
    priorityTags: ["Digestion"],
    tags: ["Digestion", "Nausea", "Hydration"],
    keywords: ["indigestion", "bloating", "gas", "digestion", "fennel", "cumin", "ajwain"],
    reason: "Targets acidity and upper-digestion discomfort",
  },
  {
    pattern: /\b(gas|bloating|bloated|indigestion|stomach pain|stomach upset|heavy stomach)\b/i,
    priorityTags: ["Digestion"],
    tags: ["Digestion", "Detox", "Nausea"],
    keywords: ["bloating", "gas", "indigestion", "digestion", "cumin", "fennel", "ajwain"],
    reason: "Targets gas, bloating, and indigestion",
  },
  {
    pattern: /\b(constipation|constipated|bowel|hard stool|motion problem)\b/i,
    priorityTags: ["Digestion", "Detox"],
    tags: ["Digestion", "Detox"],
    keywords: ["constipation", "triphala", "bowel", "digestion"],
    reason: "Targets constipation and bowel regularity",
  },
  {
    pattern: /\b(cough|dry cough|wet cough|khansi)\b/i,
    priorityTags: ["Cough", "Throat"],
    tags: ["Cough", "Throat", "Cold", "Respiratory"],
    keywords: ["cough", "throat", "licorice", "mulethi", "ginger", "honey"],
    reason: "Targets cough and throat irritation",
  },
  {
    pattern: /\b(runny nose|blocked nose|stuffy nose|nasal|congestion|sinus)\b/i,
    priorityTags: ["Nasal", "Respiratory"],
    tags: ["Nasal", "Respiratory", "Cold"],
    keywords: ["congestion", "sinus", "steam", "nasal"],
    reason: "Targets nasal congestion and sinus discomfort",
  },
  {
    pattern: /\b(cold|flu|sardi)\b/i,
    priorityTags: ["Cold", "Respiratory"],
    tags: ["Cold", "Cough", "Respiratory", "Throat", "Nasal"],
    keywords: ["cold", "tulsi", "ginger"],
    reason: "Targets cold, congestion, and sinus discomfort",
  },
  {
    pattern: /\b(sore throat|throat pain|throat irritation|tonsil|mouth ulcer|mouth ulcers)\b/i,
    priorityTags: ["Throat", "Oral"],
    tags: ["Throat", "Cough", "Cold", "Oral"],
    keywords: ["throat", "gargle", "licorice", "mulethi", "salt", "turmeric"],
    reason: "Targets throat and oral irritation",
  },
  {
    pattern: /\b(headache|head ache|migraine|head pain)\b/i,
    priorityTags: ["Hydration", "Relaxation"],
    tags: ["Hydration", "Relaxation", "Sleep"],
    keywords: ["hydration", "cooling", "coconut", "rest"],
    reason: "Supports hydration and relaxation for mild headache patterns",
  },
  {
    pattern: /\b(fever|viral fever|temperature|body heat)\b/i,
    priorityTags: ["Hydration", "Immunity"],
    tags: ["Hydration", "Immunity", "Cold"],
    keywords: ["hydration", "coconut", "immunity", "cold"],
    reason: "Supports hydration and comfort during mild fever patterns",
  },
  {
    pattern: /\b(joint pain|body pain|body ache|muscle pain|stiffness|knee pain|back pain)\b/i,
    priorityTags: ["Pain", "Inflammation"],
    tags: ["Pain", "Inflammation", "Relaxation"],
    keywords: ["pain", "stiffness", "massage", "turmeric", "mustard"],
    reason: "Targets mild pain, stiffness, and inflammation",
  },
  {
    pattern: /\b(nausea|vomit|vomiting|motion sickness|queasy)\b/i,
    priorityTags: ["Nausea", "Digestion"],
    tags: ["Nausea", "Digestion", "Hydration"],
    keywords: ["nausea", "ginger", "lemon", "digestion"],
    reason: "Targets nausea and unsettled stomach",
  },
  {
    pattern: /\b(immunity|immune|low immunity|frequent cold|seasonal weakness)\b/i,
    priorityTags: ["Immunity"],
    tags: ["Immunity", "Cold", "Cough"],
    keywords: ["immunity", "cold", "seasonal", "low energy"],
    reason: "Supports everyday immune resilience",
  },
  {
    pattern: /\b(weight loss|lose weight|fat loss|slimming|slow metabolism|belly fat)\b/i,
    priorityTags: ["Metabolic"],
    tags: ["Metabolic", "Hydration", "Digestion"],
    keywords: ["metabolic", "detox", "digestion", "sluggishness"],
    reason: "Supports metabolic balance goals",
  },
  {
    pattern: /\b(weight gain|gain weight|underweight|low weight)\b/i,
    priorityTags: ["Immunity", "Metabolic"],
    tags: ["Immunity", "Digestion", "Metabolic"],
    keywords: ["low energy", "fatigue", "digestion"],
    reason: "Supports nourishment and energy balance",
  },
  {
    pattern: /\b(zinc deficiency|low zinc|zinc deficient)\b/i,
    priorityTags: ["Hair", "Immunity"],
    tags: ["Hair", "Skin", "Immunity"],
    keywords: ["hair", "skin", "weak roots", "glow", "low nourishment"],
    reason: "Supports hair, skin, and immunity nourishment",
  },
  {
    pattern: /\b(iron deficiency|anemi[ae]|low iron)\b/i,
    priorityTags: ["Immunity", "Metabolic"],
    tags: ["Immunity", "Metabolic", "Hair"],
    keywords: ["fatigue", "low energy", "hair"],
    reason: "Supports energy and nourishment recovery",
  },
  {
    pattern: /\b(hair fall|hair loss|hair thinning|weak roots)\b/i,
    priorityTags: ["Hair"],
    tags: ["Hair", "Immunity", "Skin"],
    keywords: ["hair", "weak roots"],
    reason: "Supports hair-strength goals",
  },
  {
    pattern: /\b(skin|glow|dull skin|acne|rash)\b/i,
    priorityTags: ["Skin"],
    tags: ["Skin", "Hydration", "Detox"],
    keywords: ["skin", "glow", "irritation"],
    reason: "Supports skin comfort and glow",
  },
];

const SERIOUS_SYMPTOM_RULES = [
  {
    label: "Chest pain needs medical review",
    regex: /\b(chest pain|tight chest|pressure in chest)\b/i,
    guidance: "Home remedies are not the right first step for chest pain.",
  },
  {
    label: "Breathing difficulty needs urgent help",
    regex: /\b(shortness of breath|breathing issue|cannot breathe|can't breathe|breathless|wheezing)\b/i,
    guidance: "Breathing issues should go to Family AI or medical care, not remedies.",
  },
  {
    label: "High fever needs clinician review",
    regex: /\b(fever\s*>\s*103|fever above 103|103\s*f|104\s*f|105\s*f|very high fever)\b/i,
    guidance: "High fever is outside the safe home-remedy flow.",
  },
  {
    label: "Confusion or fainting needs urgent help",
    regex: /\b(confusion|confused|fainting|fainted|unconscious)\b/i,
    guidance: "This symptom needs urgent assessment instead of a remedy card.",
  },
  {
    label: "Bleeding needs medical review",
    regex: /\b(bleeding|blood in stool|blood in vomit|vomiting blood)\b/i,
    guidance: "Bleeding symptoms should skip remedies and go to medical guidance.",
  },
];

const ACTIVE_INGREDIENT_EXCLUSIONS = [
  /\bwater\b/i,
  /\bwarm water\b/i,
  /\bhot water\b/i,
  /\bmilk\b/i,
  /\bplant milk\b/i,
  /\bghee\b/i,
];

const NUTRIENT_TERMS = /\b(zinc|iron|vitamin|calcium|protein|fiber)\b/i;
const STRONG_SPICE_PATTERN = /\b(black pepper|long pepper|trikatu|ajwain|clove|cinnamon|red chilli|red chili|green chilli|green chili)\b/i;
const SWEETENER_PATTERN = /\b(honey|jaggery|sugar syrup|sugar)\b/i;
const BLOOD_THINNER_PATTERN = /\b(warfarin|apixaban|rivaroxaban|blood thinner|aspirin|clopidogrel)\b/i;

const unique = (items = []) => Array.from(new Set(items.filter(Boolean)));

const titleCase = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

const normalizeText = (value = "") => String(value || "").trim().toLowerCase();

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return unique(value.map((item) => normalizeText(item)).filter(Boolean));
  }

  if (typeof value === "string") {
    return unique(
      value
        .split(/[,\n]/)
        .map((item) => normalizeText(item))
        .filter(Boolean)
    );
  }

  return [];
};

const tokenizeQuery = (value = "") =>
  unique(
    normalizeText(value)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !QUERY_STOP_WORDS.has(token))
  );

const getLatestEntry = (entries = []) =>
  entries
    .slice()
    .sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0))[0] || null;

const parseBloodPressure = (value) => {
  if (typeof value !== "string") return null;
  const match = value.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;
  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
};

const numberValue = (entry) => {
  const value = Number(entry?.value);
  return Number.isFinite(value) ? value : null;
};

const deriveAgeFromDate = (value) => {
  if (!value) return 0;

  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return 0;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const birthdayPassed =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());

  if (!birthdayPassed) {
    age -= 1;
  }

  return age >= 0 ? age : 0;
};

const resolveMemberAge = (member) => {
  const directAge = Number(member?.age);
  if (Number.isFinite(directAge) && directAge >= 0) {
    return directAge;
  }

  return deriveAgeFromDate(
    member?.dateOfBirth ||
      member?.dob ||
      member?.birthDate ||
      member?.birthday ||
      member?.profile?.dateOfBirth
  );
};

const getTagFamily = (tag = "All") => {
  const normalizedTag = titleCase(tag);
  return unique([normalizedTag, ...(TAG_FAMILY_MAP[normalizedTag] || [])]);
};

const resolveQueryIntent = (query = "") => {
  const normalized = normalizeText(query);
  const tags = [];
  const priorityTags = [];
  const keywords = [];
  const reasons = [];
  const tokens = tokenizeQuery(normalized);

  QUERY_INTENT_RULES.forEach((rule) => {
    if (!rule.pattern.test(normalized)) return;
    tags.push(...rule.tags);
    priorityTags.push(...(rule.priorityTags || rule.tags.slice(0, 1)));
    keywords.push(...(rule.keywords || []));
    reasons.push(rule.reason);
  });

  Object.keys(TAG_FAMILY_MAP)
    .filter((tag) => tag !== "All")
    .forEach((tag) => {
      const normalizedTag = tag.toLowerCase();
      if (normalized.includes(normalizedTag) || tokens.includes(normalizedTag)) {
        tags.push(tag);
        reasons.push(`${tag} support matches the search focus`);
      }
    });

  return {
    query: normalized,
    tokens,
    priorityTags: unique(priorityTags.map(titleCase)),
    tags: unique(tags.map(titleCase)),
    keywords: unique(keywords.map(normalizeText)),
    reasons: unique(reasons),
  };
};

const ageBandFromAge = (age = 0) => {
  if (age > 0 && age < 2) return "under2";
  if (age >= 2 && age <= 5) return "2to5";
  if (age >= 6 && age <= 12) return "6to12";
  if (age >= 60) return "60plus";
  return "adult";
};

const getDosageProfile = (age = 0) => {
  const ageBand = ageBandFromAge(age);

  switch (ageBand) {
    case "under2":
      return {
        ageBand,
        label: "Under 2 years",
        multiplier: 0.1,
        short: "Only very gentle, clinician-approved options.",
        detail: "Avoid honey and strong spices. Use pediatric guidance before trying any ingestible home remedy.",
        serving: "A few safe sips only if already clinician-approved",
      };
    case "2to5":
      return {
        ageBand,
        label: "2-5 years",
        multiplier: 0.25,
        short: "Use 1/4 adult dose.",
        detail: "Keep flavors mild and start with small portions.",
        serving: "About 1/4 cup or 1-2 teaspoons, depending on the remedy",
      };
    case "6to12":
      return {
        ageBand,
        label: "6-12 years",
        multiplier: 0.5,
        short: "Use 1/2 adult dose.",
        detail: "Choose milder preparations and avoid over-spicing.",
        serving: "About 1/2 cup or half an adult portion",
      };
    case "60plus":
      return {
        ageBand,
        label: "60+ years",
        multiplier: 0.75,
        short: "Use 3/4 adult dose with extra caution.",
        detail: "Start smaller if digestion is delicate or medicines are already active.",
        serving: "About 3/4 cup or 3/4 of an adult portion",
      };
    default:
      return {
        ageBand,
        label: "Adult",
        multiplier: 1,
        short: "Use the full adult dose.",
        detail: "Standard adult portion unless a clinician has advised otherwise.",
        serving: "1 cup or 1 adult portion",
      };
  }
};

const getMostConservativeDosage = (signals = []) => {
  const dosageProfiles = signals
    .map((signal) => signal?.dosage)
    .filter((profile) => profile && Number.isFinite(profile.multiplier));

  if (!dosageProfiles.length) return getDosageProfile(0);

  return dosageProfiles.reduce((lowest, profile) =>
    profile.multiplier < lowest.multiplier ? profile : lowest
  );
};

const formatListSummary = (items = [], emptyLabel = "None saved") => {
  if (!items.length) return emptyLabel;
  return items.map(titleCase).join(", ");
};

const splitSymptoms = (value = "") =>
  unique(
    String(value || "")
      .split(/,|\/| and /i)
      .map((part) => titleCase(normalizeText(part)))
      .filter(Boolean)
  );

const hasIngredient = (ingredients = [], pattern) =>
  ingredients.some((ingredient) => pattern.test(normalizeText(ingredient)));

const getRemedyFormat = (remedy) => {
  const haystack = `${remedy?.name || ""} ${(remedy?.steps || []).join(" ")}`.toLowerCase();
  if (/gargle/.test(haystack)) return "gargle";
  if (/massage|oil pulling|topical|rinse/.test(haystack)) return "external";
  if (/shot/.test(haystack)) return "shot";
  if (/snack|eat/.test(haystack)) return "food";
  return "drink";
};

const buildDosageGuidance = (remedy, dosageProfile) => {
  const format = getRemedyFormat(remedy);

  if (format === "gargle") {
    return {
      short: "Use warm, not hot, water for gargling.",
      detail: `${dosageProfile.label}: 1 to 2 gentle gargles at a time. Do not swallow unless the recipe clearly says so.`,
    };
  }

  if (format === "external") {
    return {
      short: "Small external application only.",
      detail: `${dosageProfile.label}: test a small amount first and stop if there is irritation.`,
    };
  }

  if (format === "shot") {
    if (dosageProfile.ageBand === "under2") {
      return {
        short: "Avoid concentrated shots in children under 2.",
        detail: "Use pediatric guidance instead of concentrated remedy shots.",
      };
    }

    if (dosageProfile.ageBand === "2to5") {
      return {
        short: "About 1/4 tablespoon at a time.",
        detail: "Keep it very mild and avoid sharp or spicy shots.",
      };
    }

    if (dosageProfile.ageBand === "6to12") {
      return {
        short: "About 1/2 tablespoon at a time.",
        detail: "Start with a smaller portion if the taste is strong.",
      };
    }

    if (dosageProfile.ageBand === "60plus") {
      return {
        short: "About 3/4 tablespoon at a time.",
        detail: "Start smaller if digestion is sensitive or medicines are active.",
      };
    }

    return {
      short: "About 1 tablespoon at a time.",
      detail: "Use the standard adult portion unless told otherwise.",
    };
  }

  if (format === "food") {
    return {
      short: dosageProfile.short,
      detail: `${dosageProfile.label}: use ${dosageProfile.serving}.`,
    };
  }

  return {
    short: dosageProfile.short,
    detail: `${dosageProfile.label}: use ${dosageProfile.serving}.`,
  };
};

const buildMemberSignal = (member) => {
  const health = member?.health || {};
  const bp = parseBloodPressure(getLatestEntry(health.bloodPressure)?.value);
  const sugar = numberValue(getLatestEntry(health.bloodSugar));
  const sleep = numberValue(getLatestEntry(health.sleep));
  const heartRate = numberValue(getLatestEntry(health.heartRate));
  const steps = numberValue(getLatestEntry(health.steps));
  const age = resolveMemberAge(member);
  const conditions = normalizeList(member?.conditions);
  const allergies = normalizeList(member?.allergies);
  const medications = normalizeList(member?.medications);
  const avoidedIngredients = normalizeList(member?.baselinePreferences?.avoidedIngredients);
  const dosage = getDosageProfile(age);
  const recommendedTags = [];
  const concerns = [];

  const flags = {
    childSensitive: Boolean(member?.childSensitive) || (age > 0 && age < 12),
    infant: age > 0 && age < 2,
    elderly: age >= 60,
    pregnant:
      member?.pregnancyStatus === "pregnant" ||
      conditions.some((entry) => entry.includes("pregnan")),
    highBp: false,
    highSugar: false,
    diabetes: false,
    poorSleep: false,
    highHeartRate: false,
    lowActivity: false,
    bloodThinner: medications.some((entry) => BLOOD_THINNER_PATTERN.test(entry)),
  };

  if (bp && (bp.systolic >= 140 || bp.diastolic >= 90)) {
    flags.highBp = true;
    concerns.push("BP-sensitive profile");
    recommendedTags.push("Relaxation", "Sleep", "Hydration", "Inflammation");
  }

  if (sugar !== null && sugar >= 140) {
    flags.highSugar = true;
    concerns.push("Sugar-sensitive profile");
    recommendedTags.push("Metabolic", "Digestion", "Hydration");
  }

  if (conditions.some((entry) => entry.includes("diabet") || entry.includes("sugar"))) {
    flags.diabetes = true;
    concerns.push("Diabetes profile");
    recommendedTags.push("Metabolic", "Digestion", "Hydration");
  }

  if (sleep !== null && sleep < 6) {
    flags.poorSleep = true;
    concerns.push("Low recent sleep");
    recommendedTags.push("Sleep", "Relaxation");
  }

  if (heartRate !== null && heartRate > 100) {
    flags.highHeartRate = true;
    concerns.push("Higher recent heart rate");
    recommendedTags.push("Relaxation", "Hydration");
  }

  if (steps !== null && steps < 4000) {
    flags.lowActivity = true;
    concerns.push("Low recent activity");
    recommendedTags.push("Metabolic", "Pain", "Inflammation");
  }

  if (flags.infant) {
    concerns.push("Infant profile");
    recommendedTags.push("Cold", "Hydration");
  } else if (flags.childSensitive) {
    concerns.push("Child-sensitive profile");
    recommendedTags.push("Immunity", "Cold", "Cough");
  }

  if (flags.elderly) {
    concerns.push("Elder-safe dosing profile");
    recommendedTags.push("Pain", "Sleep", "Hydration", "Immunity");
  }

  if (flags.pregnant) {
    concerns.push("Pregnancy safety profile");
    recommendedTags.push("Digestion", "Hydration", "Sleep");
  }

  if (flags.bloodThinner) {
    concerns.push("Blood-thinner interaction profile");
  }

  conditions.forEach((condition) => {
    recommendedTags.push(...(CONDITION_TAG_MAP[condition] || []));
  });

  const profileBullets = [
    age > 0 ? `Age ${age} (${dosage.label.toLowerCase()} dosing)` : "Age not saved",
    `Conditions: ${formatListSummary(conditions)}`,
    `Allergies: ${formatListSummary(allergies)}`,
    `Medications: ${formatListSummary(medications)}`,
  ];

  if (member?.pregnancyStatus && member.pregnancyStatus !== "not_applicable") {
    profileBullets.push(`Pregnancy: ${titleCase(member.pregnancyStatus.replace(/_/g, " "))}`);
  }

  return {
    memberId: member?._id || "family",
    memberName: member?.name || "Family member",
    age,
    dosage,
    conditions,
    allergies,
    medications,
    avoidedIngredients,
    concerns: unique(concerns),
    recommendedTags: unique(recommendedTags.map(titleCase)),
    profileBullets,
    flags,
  };
};

export const buildRemedyContext = (members = [], selectedMemberId = "family") => {
  const focusMembers =
    selectedMemberId === "family"
      ? members
      : members.filter((member) => member._id === selectedMemberId);

  const signals = focusMembers.map(buildMemberSignal);
  const tagFrequency = new Map();
  const summaryPills = [];
  const profileFacts = [];

  signals.forEach((signal) => {
    signal.recommendedTags.forEach((tag) => {
      tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
    });

    signal.concerns.forEach((concern) => {
      summaryPills.push(`${signal.memberName}: ${concern}`);
    });

    signal.profileBullets.slice(0, 2).forEach((item) => {
      profileFacts.push(`${signal.memberName}: ${item}`);
    });
  });

  const recommendedTags = Array.from(tagFrequency.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag)
    .slice(0, 6);

  const flags = signals.reduce(
    (acc, signal) => ({
      childSensitive: acc.childSensitive || signal.flags.childSensitive,
      infant: acc.infant || signal.flags.infant,
      elderly: acc.elderly || signal.flags.elderly,
      pregnant: acc.pregnant || signal.flags.pregnant,
      highBp: acc.highBp || signal.flags.highBp,
      highSugar: acc.highSugar || signal.flags.highSugar,
      diabetes: acc.diabetes || signal.flags.diabetes,
      poorSleep: acc.poorSleep || signal.flags.poorSleep,
      highHeartRate: acc.highHeartRate || signal.flags.highHeartRate,
      lowActivity: acc.lowActivity || signal.flags.lowActivity,
      bloodThinner: acc.bloodThinner || signal.flags.bloodThinner,
    }),
    {
      childSensitive: false,
      infant: false,
      elderly: false,
      pregnant: false,
      highBp: false,
      highSugar: false,
      diabetes: false,
      poorSleep: false,
      highHeartRate: false,
      lowActivity: false,
      bloodThinner: false,
    }
  );

  const focusLabel =
    selectedMemberId === "family"
      ? "Whole family"
      : focusMembers[0]?.name || "Selected member";

  const focusDetailLabel =
    selectedMemberId === "family"
      ? `${signals.length || members.length || 0} saved profiles`
      : focusMembers[0]?.name || "Selected member";

  const defaultDosage = getMostConservativeDosage(signals);
  const profileCheckedText =
    selectedMemberId === "family"
      ? `Checked ${signals.length || members.length || 0} saved family profiles before ranking remedies.`
      : `Checked ${focusLabel}'s saved profile before ranking remedies.`;

  return {
    selectedMemberId,
    focusMembers,
    signals,
    recommendedTags,
    summaryPills: unique(summaryPills).slice(0, 6),
    profileFacts: unique(profileFacts).slice(0, 6),
    flags,
    focusLabel,
    focusDetailLabel,
    focusNames: unique(signals.map((signal) => signal.memberName)),
    conditions: unique(signals.flatMap((signal) => signal.conditions)),
    allergies: unique(signals.flatMap((signal) => signal.allergies)),
    medications: unique(signals.flatMap((signal) => signal.medications)),
    avoidedIngredients: unique(signals.flatMap((signal) => signal.avoidedIngredients)),
    dosageProfile: defaultDosage,
    profileCheckedText,
    riskCount: unique(summaryPills).length,
    clearProfile:
      unique(summaryPills).length === 0
        ? `No active risk flags were detected for ${focusLabel.toLowerCase()} from saved profile data.`
        : "",
  };
};

export const getAllRemedyTags = (remedies = [], contextTags = []) => {
  const discovered = new Set();

  remedies.forEach((remedy) => {
    (remedy.tags || []).forEach((tag) => discovered.add(titleCase(tag)));
  });

  contextTags.forEach((tag) => discovered.add(titleCase(tag)));

  const priorityTags = Object.keys(TAG_FAMILY_MAP);
  const rest = Array.from(discovered).filter((tag) => !priorityTags.includes(tag));

  return [...priorityTags, ...rest.sort((a, b) => a.localeCompare(b))];
};

export const getSeriousSymptomMatch = (value = "") => {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return (
    SERIOUS_SYMPTOM_RULES.find((rule) => rule.regex.test(normalized)) || null
  );
};

const buildActiveIngredients = (ingredients = []) => {
  const filtered = ingredients.filter((ingredient) => {
    const normalized = normalizeText(ingredient);
    if (!normalized) return false;
    if (NUTRIENT_TERMS.test(normalized)) return false;
    return !ACTIVE_INGREDIENT_EXCLUSIONS.some((pattern) => pattern.test(normalized));
  });

  return unique((filtered.length ? filtered : ingredients).slice(0, 4).map(titleCase));
};

const buildTargetSymptoms = (remedy) =>
  unique([
    ...splitSymptoms(remedy?.symptoms || ""),
    ...((remedy?.tags || []).map(titleCase)),
  ]).slice(0, 4);

const isGingerHeavy = (remedy) => {
  const ingredients = remedy?.ingredients || [];
  const ingredientsText = ingredients.map(normalizeText).join(" ");

  if (/ginger juice/.test(ingredientsText)) return true;

  return (
    hasIngredient(ingredients, /\bginger\b/i) &&
    hasIngredient(ingredients, /\b(black pepper|ajwain|cinnamon|long pepper|trikatu)\b/i)
  );
};

const evaluateRemedySafety = (remedy, context) => {
  const ingredients = remedy?.ingredients || [];
  const ingredientText = ingredients.map(normalizeText).join(" ");
  const avoidReasons = [];
  const cautionReasons = [];

  const allergyMatch = context.allergies.find((allergy) =>
    ingredients.some((ingredient) => {
      const normalizedIngredient = normalizeText(ingredient);
      return normalizedIngredient.includes(allergy) || allergy.includes(normalizedIngredient);
    })
  );

  if (allergyMatch) {
    avoidReasons.push(`Avoid for ${context.focusLabel.toLowerCase()}: ingredient conflicts with saved allergy "${titleCase(allergyMatch)}".`);
  }

  if ((context.flags.diabetes || context.flags.highSugar) && SWEETENER_PATTERN.test(ingredientText)) {
    avoidReasons.push("Removed for diabetes or high-sugar profiles because it contains honey, jaggery, or another sweetener.");
  }

  if (context.flags.infant && /\bhoney\b/i.test(ingredientText)) {
    avoidReasons.push("Removed for children under 2 because honey is not safe at this age.");
  }

  if (context.flags.infant && STRONG_SPICE_PATTERN.test(ingredientText)) {
    avoidReasons.push("Removed for children under 2 because strong spices are not safe in this remedy flow.");
  }

  if (context.flags.pregnant && /\bpapaya\b/i.test(ingredientText)) {
    avoidReasons.push("Removed for pregnancy profiles because papaya is filtered out here.");
  }

  if (context.flags.pregnant && /\bsesame|til\b/i.test(ingredientText)) {
    avoidReasons.push("Removed for pregnancy profiles because sesame-heavy remedies are filtered out here.");
  }

  if (context.flags.pregnant && isGingerHeavy(remedy)) {
    avoidReasons.push("Removed for pregnancy profiles because this is a stronger ginger-based remedy.");
  } else if (context.flags.pregnant && /\bginger\b/i.test(ingredientText)) {
    cautionReasons.push("Pregnancy profile: keep ginger mild and confirm with a clinician if symptoms persist.");
  }

  if (context.flags.bloodThinner && /\b(turmeric|ginger)\b/i.test(ingredientText)) {
    cautionReasons.push("Blood-thinner profile: turmeric and ginger can interact with current medicines.");
  }

  if (context.flags.highBp && /\b(licorice|mulethi)\b/i.test(ingredientText)) {
    cautionReasons.push("BP-sensitive profile: licorice can worsen blood pressure control.");
  }

  if (context.flags.highBp && /\b(rock salt|salt)\b/i.test(ingredientText)) {
    cautionReasons.push("BP-sensitive profile: extra salt needs caution.");
  }

  if (context.flags.highHeartRate && STRONG_SPICE_PATTERN.test(ingredientText)) {
    cautionReasons.push("Higher recent heart rate: keep strong warming spices mild.");
  }

  context.avoidedIngredients.forEach((ingredient) => {
    if (ingredientText.includes(ingredient)) {
      cautionReasons.push(`Saved preference: ${titleCase(ingredient)} is on the avoided ingredient list.`);
    }
  });

  const status = avoidReasons.length > 0 ? "avoid" : cautionReasons.length > 0 ? "caution" : "safe";

  return {
    status,
    avoidReasons: unique(avoidReasons),
    cautionReasons: unique(cautionReasons),
    contraindications: unique([...avoidReasons, ...cautionReasons]).slice(0, 4),
  };
};

export const decorateRemedyForContext = (remedy, context, query = "") => {
  const queryText = normalizeText(query);
  const queryIntent = resolveQueryIntent(queryText);
  const tags = (remedy.tags || []).map(titleCase);
  const tagSet = new Set(tags);
  const ingredientsText = (remedy.ingredients || []).join(" ").toLowerCase();
  const symptomsText = String(remedy.symptoms || "").toLowerCase();
  const nameText = String(remedy.name || "").toLowerCase();
  const searchableText = `${nameText} ${symptomsText} ${ingredientsText} ${tags.join(" ").toLowerCase()}`;
  const reasons = [];
  const safety = evaluateRemedySafety(remedy, context);
  let score = Number(remedy.rating || 0);
  let queryMatchScore = 0;

  context.recommendedTags.forEach((tag) => {
    if (tagSet.has(titleCase(tag))) {
      reasons.push(`${tag} support matches the saved profile`);
      score += 3;
    }
  });

  if (queryText) {
    if (nameText.includes(queryText)) {
      score += 7;
      queryMatchScore += 7;
    }
    if (symptomsText.includes(queryText)) {
      score += 5;
      queryMatchScore += 5;
    }
    if (ingredientsText.includes(queryText)) {
      score += 3;
      queryMatchScore += 3;
    }
  }

  queryIntent.tokens.forEach((token) => {
    if (!searchableText.includes(token)) return;
    score += 2;
    queryMatchScore += 2;
  });

  queryIntent.tags.forEach((tag) => {
    const normalizedTag = titleCase(tag);
    const isPriority = queryIntent.priorityTags.includes(normalizedTag);
    if (!tagSet.has(normalizedTag)) return;
    score += isPriority ? 6 : 2;
    if (isPriority) {
      queryMatchScore += 6;
    }
    reasons.push(queryIntent.reasons[0] || `${tag} support matches the current search`);
  });

  queryIntent.priorityTags.forEach((tag) => {
    if (!tagSet.has(titleCase(tag))) return;
    score += 5;
    queryMatchScore += 5;
    reasons.push(`${tag} is the closest safe match for this search`);
  });

  queryIntent.keywords.forEach((keyword) => {
    if (!searchableText.includes(keyword)) return;
    score += 2;
    queryMatchScore += 2;
  });

  if (safety.status === "safe") {
    score += 3;
  } else if (safety.status === "caution") {
    score -= 1;
  } else {
    score -= 100;
  }

  const dosage = buildDosageGuidance(remedy, context.dosageProfile);
  const targetSymptoms = buildTargetSymptoms(remedy);
  const activeIngredients = buildActiveIngredients(remedy.ingredients || []);
  const familyAwareTag =
    safety.status === "safe"
      ? `Safe for ${context.focusLabel.toLowerCase()}`
      : safety.status === "caution"
        ? `Use with caution for ${context.focusLabel.toLowerCase()}`
        : `Not suitable for ${context.focusLabel.toLowerCase()}`;

  return {
    ...remedy,
    source: remedy.source || "catalog",
    tags,
    insight: {
      score,
      queryMatchScore,
      reasons: unique(reasons).slice(0, 3),
      warnings: safety.cautionReasons,
      contraindications: safety.contraindications,
      safetyStatus: safety.status,
      familyAwareTag,
      activeIngredients,
      targetSymptoms,
      dosage,
      matchesActiveTag: false,
      fallbackMatch: false,
    },
  };
};

const matchesTagSelection = (remedy, activeTag = "All", queryIntent = null) => {
  const acceptedTags = new Set(getTagFamily(activeTag));

  (queryIntent?.tags || []).forEach((tag) => {
    getTagFamily(tag).forEach((relatedTag) => acceptedTags.add(relatedTag));
  });

  if (activeTag === "All" && acceptedTags.size === 1) return true;

  return remedy.tags.some((tag) => acceptedTags.has(titleCase(tag)));
};

export const buildCatalog = (remedies, context, query = "", activeTag = "All") => {
  const normalizedQuery = normalizeText(query);
  const queryIntent = resolveQueryIntent(normalizedQuery);
  const decorated = remedies
    .map((remedy) => decorateRemedyForContext(remedy, context, normalizedQuery))
    .filter((remedy) => remedy.insight.safetyStatus !== "avoid")
    .sort((a, b) => {
      if (b.insight.score !== a.insight.score) return b.insight.score - a.insight.score;
      return Number(b.rating || 0) - Number(a.rating || 0);
    });

  if (!normalizedQuery && activeTag === "All") {
    return decorated.map((remedy) => ({
      ...remedy,
      insight: {
        ...remedy.insight,
        matchesActiveTag: true,
      },
    }));
  }

  const exactMatches = decorated.filter((remedy) => {
    const matchesQuery = !normalizedQuery || remedy.insight.queryMatchScore > 0;
    const matchesTag = matchesTagSelection(remedy, activeTag, queryIntent);
    return matchesQuery && matchesTag;
  });

  const exactIds = new Set(exactMatches.map((remedy) => remedy.id));
  const results = [...exactMatches];

  if (results.length < 6) {
    const relatedMatches = decorated.filter((remedy) => {
      if (exactIds.has(remedy.id)) return false;
      if (!normalizedQuery) return matchesTagSelection(remedy, activeTag, queryIntent);

      if (queryIntent.priorityTags.length > 0) {
        const hasPriorityTag = remedy.tags.some((tag) =>
          queryIntent.priorityTags.includes(titleCase(tag))
        );

        return hasPriorityTag || (
          remedy.insight.queryMatchScore > 0 &&
          matchesTagSelection(remedy, activeTag, queryIntent)
        );
      }

      if (remedy.insight.queryMatchScore > 0) return true;

      return remedy.insight.targetSymptoms.some((symptom) =>
        queryIntent.tokens.some((token) => normalizeText(symptom).includes(token))
      );
    });

    relatedMatches.forEach((remedy) => {
      if (results.length < 6) {
        results.push(remedy);
      }
    });
  }

  if (!results.length) {
    return decorated.slice(0, 6).map((remedy) => ({
      ...remedy,
      insight: {
        ...remedy.insight,
        fallbackMatch: true,
      },
    }));
  }

  return results.map((remedy) => ({
    ...remedy,
    insight: {
      ...remedy.insight,
      matchesActiveTag: exactIds.has(remedy.id),
      fallbackMatch: !exactIds.has(remedy.id),
    },
  }));
};
