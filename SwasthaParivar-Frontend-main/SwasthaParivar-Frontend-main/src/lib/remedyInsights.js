const CONDITION_TAG_MAP = {
  cold: ["Cold", "Cough", "Immunity", "Respiratory", "Throat"],
  cough: ["Cough", "Throat", "Respiratory"],
  digestion: ["Digestion", "Detox", "Metabolic"],
  diabetes: ["Metabolic", "Digestion", "Hydration"],
  hypertension: ["Relaxation", "Sleep", "Hydration", "Inflammation"],
  pain: ["Pain", "Inflammation", "Relaxation"],
  anxiety: ["Relaxation", "Sleep"],
  stress: ["Relaxation", "Sleep"],
  skin: ["Skin", "Hydration", "Detox"],
};

const SAFETY_RULES = [
  {
    key: "highSugar",
    matches: /honey|banana/i,
    message:
      "Contains naturally sweet ingredients that may not be ideal when blood sugar is elevated.",
  },
  {
    key: "highBp",
    matches: /licorice|mulethi|salt/i,
    message:
      "May not suit elevated blood pressure without clinical guidance.",
  },
  {
    key: "highHeartRate",
    matches: /black pepper|long pepper|ajwain|cinnamon/i,
    message:
      "Uses warming spices that can feel too stimulating when heart rate is already high.",
  },
  {
    key: "childSensitive",
    matches: /trikatu|neem|licorice|mulethi/i,
    message:
      "Stronger herbs should be used carefully for younger children and only with guardian or clinician guidance.",
  },
];

const PRIORITY_TAGS = [
  "All",
  "Cold",
  "Cough",
  "Detox",
  "Digestion",
  "Hair",
  "Hydration",
  "Immunity",
  "Inflammation",
  "Metabolic",
  "Nasal",
  "Nausea",
  "Oral",
  "Pain",
  "Relaxation",
  "Respiratory",
  "Skin",
  "Sleep",
  "Stress",
  "Throat",
];

const unique = (items) => Array.from(new Set(items.filter(Boolean)));

const titleCase = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

const getLatestEntry = (entries = []) =>
  entries
    .slice()
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0] || null;

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

const buildMemberSignal = (member) => {
  const health = member?.health || {};
  const bp = parseBloodPressure(getLatestEntry(health.bloodPressure)?.value);
  const sugar = numberValue(getLatestEntry(health.bloodSugar));
  const sleep = numberValue(getLatestEntry(health.sleep));
  const heartRate = numberValue(getLatestEntry(health.heartRate));
  const steps = numberValue(getLatestEntry(health.steps));
  const age = Number(member?.age || 0);
  const conditions = Array.isArray(member?.conditions) ? member.conditions : [];

  const recommendedTags = [];
  const concerns = [];
  const flags = {
    highBp: false,
    highSugar: false,
    poorSleep: false,
    highHeartRate: false,
    lowActivity: false,
    childSensitive: age > 0 && age < 12,
  };

  if (bp && (bp.systolic >= 140 || bp.diastolic >= 90)) {
    flags.highBp = true;
    concerns.push("Recent blood pressure looks elevated");
    recommendedTags.push("Relaxation", "Sleep", "Hydration", "Inflammation");
  }

  if (sugar !== null && sugar >= 140) {
    flags.highSugar = true;
    concerns.push("Blood sugar is trending high");
    recommendedTags.push("Metabolic", "Digestion", "Hydration");
  }

  if (sleep !== null && sleep < 6) {
    flags.poorSleep = true;
    concerns.push("Recent sleep is low");
    recommendedTags.push("Sleep", "Relaxation");
  }

  if (heartRate !== null && heartRate > 100) {
    flags.highHeartRate = true;
    concerns.push("Heart rate is on the higher side");
    recommendedTags.push("Relaxation", "Hydration");
  }

  if (steps !== null && steps < 4000) {
    flags.lowActivity = true;
    concerns.push("Activity has been low lately");
    recommendedTags.push("Metabolic", "Pain", "Inflammation");
  }

  if (age >= 60) {
    recommendedTags.push("Pain", "Sleep", "Hydration", "Immunity");
  }

  if (flags.childSensitive) {
    recommendedTags.push("Immunity", "Cold", "Cough");
  }

  conditions.forEach((condition) => {
    const normalized = String(condition).trim().toLowerCase();
    recommendedTags.push(...(CONDITION_TAG_MAP[normalized] || []));
  });

  return {
    memberId: member?._id || "family",
    memberName: member?.name || "Family member",
    concerns: unique(concerns),
    recommendedTags: unique(recommendedTags),
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

  signals.forEach((signal) => {
    signal.recommendedTags.forEach((tag) => {
      tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
    });

    signal.concerns.slice(0, 2).forEach((concern) => {
      summaryPills.push(`${signal.memberName}: ${concern}`);
    });
  });

  const recommendedTags = Array.from(tagFrequency.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag)
    .slice(0, 6);

  const highLevelFlags = signals.reduce(
    (acc, signal) => ({
      highBp: acc.highBp || signal.flags.highBp,
      highSugar: acc.highSugar || signal.flags.highSugar,
      poorSleep: acc.poorSleep || signal.flags.poorSleep,
      highHeartRate: acc.highHeartRate || signal.flags.highHeartRate,
      lowActivity: acc.lowActivity || signal.flags.lowActivity,
      childSensitive: acc.childSensitive || signal.flags.childSensitive,
    }),
    {
      highBp: false,
      highSugar: false,
      poorSleep: false,
      highHeartRate: false,
      lowActivity: false,
      childSensitive: false,
    }
  );

  return {
    selectedMemberId,
    focusMembers,
    signals,
    recommendedTags,
    summaryPills: unique(summaryPills).slice(0, 4),
    flags: highLevelFlags,
    focusLabel:
      selectedMemberId === "family"
        ? "Whole family"
        : focusMembers[0]?.name || "Selected member",
  };
};

export const getAllRemedyTags = (remedies = [], contextTags = []) => {
  const discovered = new Set();

  remedies.forEach((remedy) => {
    (remedy.tags || []).forEach((tag) => discovered.add(titleCase(tag)));
  });

  contextTags.forEach((tag) => discovered.add(titleCase(tag)));

  const rest = Array.from(discovered).filter((tag) => !PRIORITY_TAGS.includes(tag));

  return [...PRIORITY_TAGS, ...rest.sort((a, b) => a.localeCompare(b))];
};

export const getRemedyInsight = (remedy, context, query = "") => {
  const queryText = query.trim().toLowerCase();
  const tags = (remedy.tags || []).map(titleCase);
  const tagSet = new Set(tags);
  const ingredientsText = (remedy.ingredients || []).join(" ").toLowerCase();
  const symptomsText = String(remedy.symptoms || "").toLowerCase();
  const nameText = String(remedy.name || "").toLowerCase();
  const reasons = [];
  const warnings = [];
  let score = Number(remedy.rating || 0);

  context.recommendedTags.forEach((tag) => {
    if (tagSet.has(titleCase(tag))) {
      reasons.push(`${tag} support matches recent health needs`);
      score += 3;
    }
  });

  if (queryText) {
    if (nameText.includes(queryText)) score += 5;
    if (symptomsText.includes(queryText)) score += 3;
    if (ingredientsText.includes(queryText)) score += 2;
  }

  SAFETY_RULES.forEach((rule) => {
    if (context.flags[rule.key] && rule.matches.test(ingredientsText)) {
      warnings.push(rule.message);
      score -= 4;
    }
  });

  context.summaryPills.forEach((pill) => {
    const focusWord = pill.split(":")[1]?.trim().toLowerCase() || "";
    if (focusWord && symptomsText.includes(focusWord.split(" ")[0])) {
      reasons.push("May support an active family concern");
      score += 2;
    }
  });

  return {
    score,
    reasons: unique(reasons).slice(0, 3),
    warnings: unique([...warnings, ...(remedy.warnings || [])]),
  };
};

export const buildCatalog = (remedies, context, query = "", activeTag = "All") => {
  const normalizedQuery = query.trim().toLowerCase();

  return remedies
    .map((remedy) => {
      const insight = getRemedyInsight(remedy, context, normalizedQuery);
      return {
        ...remedy,
        tags: (remedy.tags || []).map(titleCase),
        insight,
      };
    })
    .filter((remedy) => {
      const matchesQuery =
        !normalizedQuery ||
        remedy.name.toLowerCase().includes(normalizedQuery) ||
        String(remedy.symptoms || "").toLowerCase().includes(normalizedQuery) ||
        remedy.tags.join(" ").toLowerCase().includes(normalizedQuery) ||
        remedy.ingredients.join(" ").toLowerCase().includes(normalizedQuery);

      const matchesTag =
        activeTag === "All" ||
        remedy.tags.includes(activeTag) ||
        remedy.insight.reasons.some((reason) =>
          reason.toLowerCase().includes(activeTag.toLowerCase())
        );

      return matchesQuery && matchesTag;
    })
    .sort((a, b) => {
      if (b.insight.score !== a.insight.score) return b.insight.score - a.insight.score;
      return Number(b.rating || 0) - Number(a.rating || 0);
    });
};

export const getSuggestedSeed = (query, activeTag, context) => {
  if (query.trim()) return query.trim();
  if (activeTag && activeTag !== "All") return activeTag;
  if (context.recommendedTags.length > 0) return context.recommendedTags[0];
  return "daily immunity";
};
