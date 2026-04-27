import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import FamilyMember from "../models/familymembermodel.js";
import householdService from "../services/household/HouseholdService.js";
import { REMEDY_CATALOG } from "../services/care/remedyCatalog.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { logger } from "../utils/logger.js";

const activeProfileStatusFilter = () => ({ $ne: "archived" });
const JSON_FENCE_PATTERN = /```json|```/gi;
const MODEL_CANDIDATES = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
  "gemini-pro",
];
const NON_REMEDY_QUERY_PATTERN =
  /\b(zinc deficiency|low zinc|zinc deficient|iron deficiency|low iron|anemi[ae]|vitamin deficiency|b12 deficiency|vitamin b12 deficiency)\b/i;
const QUERY_STOP_WORDS = new Set([
  "and",
  "for",
  "the",
  "with",
  "from",
  "into",
  "your",
  "daily",
  "light",
  "gentle",
  "support",
  "issue",
  "problem",
  "remedy",
  "remedies",
]);

const TEMPLATE_LIBRARY = [
  {
    match: /(cold|cough|throat|respiratory|congestion|flu)/i,
    name: "Tulsi Ginger Comfort Brew",
    description:
      "A warm daily brew for throat comfort, light congestion relief, and gentle immune support.",
    symptoms: "Cold, cough, throat irritation, mild congestion",
    ingredients: ["Tulsi leaves", "Fresh ginger", "Warm water", "Black pepper"],
    steps: [
      "Lightly crush the tulsi leaves and ginger.",
      "Simmer them in water for 8 to 10 minutes.",
      "Add a very small pinch of black pepper, strain, and sip warm.",
      "Take once or twice daily and stop if it feels too heating.",
    ],
    rating: 4.9,
    tags: ["Cold", "Cough", "Immunity"],
    timeMins: 10,
    difficulty: "Easy",
    ayurveda:
      "Tulsi and ginger help support Agni while easing Kapha heaviness in the chest and throat.",
    bestFor: ["Cold support", "Throat comfort", "Immune balance"],
    colorFrom: "#56b88f",
    colorTo: "#127a54",
  },
  {
    match: /(sleep|stress|anxiety|insomnia|relax)/i,
    name: "Cardamom Calm Night Cup",
    description:
      "A simple evening routine to support relaxation and better wind-down before sleep.",
    symptoms: "Stress, restless evenings, light sleep difficulty",
    ingredients: ["Plant milk or milk", "Cardamom", "Nutmeg"],
    steps: [
      "Warm the milk gently without boiling it hard.",
      "Add crushed cardamom and a pinch of nutmeg.",
      "Simmer briefly, strain if needed, and drink warm 30 minutes before bed.",
    ],
    rating: 4.8,
    tags: ["Sleep", "Relaxation"],
    timeMins: 8,
    difficulty: "Easy",
    ayurveda:
      "This warming night cup can help settle Vata and support a calmer transition into sleep.",
    bestFor: ["Sleep support", "Evening calm", "Stress relief"],
    colorFrom: "#8b6dd8",
    colorTo: "#5c4bb7",
  },
  {
    match: /(digestion|bloating|gas|constipation|metabolic|stomach)/i,
    name: "Cumin Coriander Digestive Infusion",
    description:
      "A gentle digestive infusion for bloating, sluggish digestion, and post-meal heaviness.",
    symptoms: "Bloating, gas, slow digestion, post-meal heaviness",
    ingredients: ["Cumin seeds", "Coriander seeds", "Fennel seeds", "Warm water"],
    steps: [
      "Lightly crush the seeds.",
      "Simmer them in water for 8 minutes.",
      "Strain and sip warm after meals.",
    ],
    rating: 4.7,
    tags: ["Digestion", "Metabolic"],
    timeMins: 9,
    difficulty: "Easy",
    ayurveda:
      "This classic blend supports Agni without being overly sharp, making it useful for many digestive complaints.",
    bestFor: ["Digestion", "Bloating", "Metabolic balance"],
    colorFrom: "#f2b349",
    colorTo: "#d08a16",
  },
  {
    match: /(pain|joint|inflammation|stiff|body ache)/i,
    name: "Turmeric Recovery Drink",
    description:
      "A warm anti-inflammatory comfort drink for mild pain, soreness, and recovery support.",
    symptoms: "Mild pain, inflammation, post-activity soreness",
    ingredients: ["Plant milk or milk", "Turmeric", "Fresh ginger", "Black pepper"],
    steps: [
      "Warm the milk gently.",
      "Whisk in turmeric and grated ginger.",
      "Add a tiny pinch of black pepper, simmer briefly, and drink warm.",
    ],
    rating: 4.8,
    tags: ["Pain", "Inflammation"],
    timeMins: 9,
    difficulty: "Easy",
    ayurveda:
      "Turmeric and ginger help support circulation and can reduce Ama-related heaviness after strain.",
    bestFor: ["Inflammation support", "Recovery", "Comfort"],
    colorFrom: "#f0ab3d",
    colorTo: "#df7c18",
  },
  {
    match: /(hydration|skin|pitta|heat|summer)/i,
    name: "Coriander Cooling Water",
    description:
      "A light cooling drink to support hydration and reduce internal heat during warm days.",
    symptoms: "Heat, low hydration, feeling overheated",
    ingredients: ["Coriander seeds", "Water", "Fresh mint"],
    steps: [
      "Soak coriander seeds in water for several hours or overnight.",
      "Strain, add a little fresh mint, and sip through the day.",
    ],
    rating: 4.7,
    tags: ["Hydration", "Skin"],
    timeMins: 5,
    difficulty: "Easy",
    ayurveda:
      "This is a lighter cooling preparation that can be helpful when Pitta feels high or hydration is low.",
    bestFor: ["Hydration", "Cooling support", "Skin comfort"],
    colorFrom: "#56bdd6",
    colorTo: "#327fcb",
  },
  {
    match: /(weight loss|lose weight|fat loss|slimming|metabolic|slow metabolism|belly fat)/i,
    name: "Cumin Lemon Metabolic Water",
    description:
      "A light kitchen remedy for sluggish digestion, post-meal heaviness, and gentle metabolic support during weight-balance routines.",
    symptoms: "Weight balance, sluggish digestion, post-meal heaviness",
    ingredients: ["Cumin seeds", "Warm water", "Lemon"],
    steps: [
      "Lightly crush the cumin seeds and simmer them in water for 6 to 8 minutes.",
      "Let the drink cool slightly, then add a squeeze of lemon.",
      "Sip it warm after meals or in the morning if it feels comfortable.",
    ],
    rating: 4.7,
    tags: ["Metabolic", "Digestion", "Detox"],
    timeMins: 8,
    difficulty: "Easy",
    ayurveda:
      "Cumin and lemon can help support Agni and reduce digestive heaviness when paired with balanced meals and movement.",
    bestFor: ["Metabolic support", "Digestive lightness", "Weight-balance routines"],
    colorFrom: "#f0ab3d",
    colorTo: "#d08a16",
  },
  {
    match: /(hair fall|hair loss|weak roots|skin dullness)/i,
    name: "Curry Leaf Sesame Nourish Drink",
    description:
      "A nourishment-focused drink that supports hair, skin, and daily food-based wellness when the body feels undernourished.",
    symptoms: "Low nourishment, hair fall, weak roots, skin dullness",
    ingredients: ["Curry leaves", "Black sesame seeds", "Warm water", "Fresh ginger"],
    steps: [
      "Wash the curry leaves and lightly crush them with a small piece of ginger.",
      "Blend or simmer them with warm water and a spoon of black sesame seeds.",
      "Strain if needed and drink fresh in small portions.",
    ],
    rating: 4.8,
    tags: ["Hair", "Skin", "Immunity"],
    timeMins: 10,
    difficulty: "Easy",
    ayurveda:
      "Curry leaves and black sesame are traditionally used to support nourishment, hair strength, and tissue rebuilding.",
    bestFor: ["Hair nourishment", "Skin support", "Daily nourishment"],
    colorFrom: "#1f9c90",
    colorTo: "#0d6a65",
  },
];

const FALLBACK_QUERY_HINTS = [
  {
    pattern: /\b(cold|cough|throat|respiratory|congestion|flu|sore throat|tonsil)\b/i,
    tokens: ["cough", "cold", "sore throat", "congestion"],
    preferredIds: ["tulsi-ginger-brew", "warm-salt-gargle"],
  },
  {
    pattern: /\b(acidity|acid reflux|heartburn|gas|bloating|indigestion|stomach|constipation|loose motion|diarrhea|nausea|vomit)\b/i,
    tokens: ["bloating", "indigestion", "acidity", "nausea"],
    preferredIds: ["cumin-coriander-fennel", "ajwain-water", "coriander-cooling-water"],
  },
  {
    pattern: /\b(pain|joint|muscle|body ache|body pain|stiff|inflammation|cramp|headache)\b/i,
    tokens: ["joint pain", "fatigue", "stress"],
    preferredIds: ["golden-milk"],
  },
  {
    pattern: /\b(stress|sleep|insomnia|anxiety|restless|fatigue|weakness)\b/i,
    tokens: ["stress", "sleep trouble", "fatigue"],
    preferredIds: ["golden-milk"],
  },
  {
    pattern: /\b(heat|hydration|dehydration|skin|rash|acne|summer|pitta)\b/i,
    tokens: ["acidity", "fatigue", "nausea"],
    preferredIds: ["coriander-cooling-water"],
  },
];

function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

function parseJsonResponse(rawText) {
  return JSON.parse(String(rawText || "").replace(JSON_FENCE_PATTERN, "").trim());
}

function tokenizeQuery(value = "") {
  return Array.from(
    new Set(
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 2 && !QUERY_STOP_WORDS.has(token))
    )
  );
}

function getCandidateModels() {
  return [process.env.GEMINI_MODEL, ...MODEL_CANDIDATES].filter(
    (value, index, array) => value && array.indexOf(value) === index
  );
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

function buildMemberSignal(member) {
  const health = member?.health || {};
  const bp = parseBloodPressure(getLatestEntry(health.bloodPressure)?.value);
  const sugar = numberValue(getLatestEntry(health.bloodSugar));
  const sleep = numberValue(getLatestEntry(health.sleep));
  const heartRate = numberValue(getLatestEntry(health.heartRate));
  const steps = numberValue(getLatestEntry(health.steps));
  const age = Number(member?.age || 0);
  const conditions = Array.isArray(member?.conditions) ? member.conditions.filter(Boolean) : [];

  const notes = [];
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
    notes.push("Recent blood pressure is elevated.");
  }

  if (sugar !== null && sugar >= 140) {
    flags.highSugar = true;
    notes.push("Recent blood sugar is elevated.");
  }

  if (sleep !== null && sleep < 6) {
    flags.poorSleep = true;
    notes.push("Recent sleep duration has been low.");
  }

  if (heartRate !== null && heartRate > 100) {
    flags.highHeartRate = true;
    notes.push("Recent heart rate is on the higher side.");
  }

  if (steps !== null && steps < 4000) {
    flags.lowActivity = true;
    notes.push("Activity has been low lately.");
  }

  if (flags.childSensitive) {
    notes.push("This profile belongs to a younger child, so remedies should stay gentle.");
  }

  if (conditions.length > 0) {
    notes.push(`Known conditions: ${conditions.join(", ")}.`);
  }

  return {
    member,
    age,
    flags,
    notes,
  };
}

async function buildFocusContext(userId, selectedMemberId) {
  let members = [];
  const householdContext = await householdService.getOptionalUserHouseholdContext(
    userId,
    "buildRemedyFocusContext"
  );
  const householdId = householdContext?.household?._id || null;

  if (
    selectedMemberId &&
    selectedMemberId !== "family" &&
    mongoose.Types.ObjectId.isValid(selectedMemberId)
  ) {
    const member = await FamilyMember.findOne({
      _id: selectedMemberId,
      ...(householdId ? { householdId } : { user: userId }),
      profileStatus: activeProfileStatusFilter(),
    }).lean();

    if (member) {
      members = [member];
    }
  }

  if (members.length === 0) {
    members = await FamilyMember.find(
      householdId
        ? {
            householdId,
            profileStatus: activeProfileStatusFilter(),
          }
        : {
            user: userId,
            profileStatus: activeProfileStatusFilter(),
          }
    ).lean();
  }

  const signals = members.map(buildMemberSignal);
  const notes = [];
  const flags = {
    highBp: false,
    highSugar: false,
    poorSleep: false,
    highHeartRate: false,
    lowActivity: false,
    childSensitive: false,
  };

  signals.forEach((signal) => {
    if (signal.member?.name) {
      notes.push(`${signal.member.name}: age ${signal.age || "unknown"}.`);
    }

    signal.notes.forEach((note) => {
      notes.push(signal.member?.name ? `${signal.member.name}: ${note}` : note);
    });

    Object.keys(flags).forEach((key) => {
      flags[key] = flags[key] || signal.flags[key];
    });
  });

  return {
    focusLabel:
      selectedMemberId &&
      selectedMemberId !== "family" &&
      members.length === 1 &&
      members[0]?.name
        ? members[0].name
        : "whole family",
    members,
    healthNotes: notes.slice(0, 8),
    flags,
  };
}

async function searchLibrary(query = "") {
  const LibraryRemedy = mongoose.models.LibraryRemedy || (await import("../models/libraryremedymodel.js")).default;

  const directTemplate = TEMPLATE_LIBRARY.find((template) => template.match.test(query));
  if (directTemplate) return { ...directTemplate, source: "prebuilt" };

  const normalizedQuery = String(query || "").toLowerCase();
  const queryTokens = tokenizeQuery(normalizedQuery);
  const preferredIds = new Set();

  FALLBACK_QUERY_HINTS.forEach((hint) => {
    if (!hint.pattern.test(normalizedQuery)) return;

    hint.tokens.forEach((token) => {
      tokenizeQuery(token).forEach((part) => queryTokens.push(part));
    });

    (hint.preferredIds || []).forEach((id) => preferredIds.add(id));
  });

  const dbRemedies = await LibraryRemedy.find({}).lean();
  const combinedCatalog = [...REMEDY_CATALOG, ...dbRemedies];

  const rankedFallback = combinedCatalog.map((remedy) => {
    const searchable = [
      remedy.name,
      remedy.description,
      ...(remedy.symptomTags || remedy.tags || []),
      ...(remedy.tags || []),
      ...(remedy.ingredients || []),
    ]
      .join(" ")
      .toLowerCase();

    let score = preferredIds.has(remedy.id) ? 6 : 0;

    const symTags = remedy.symptomTags || remedy.tags || [];
    symTags.forEach((symptom) => {
      if (normalizedQuery.includes(String(symptom || "").toLowerCase())) {
        score += 5;
      }
    });

    queryTokens.forEach((token) => {
      if (searchable.includes(token)) {
        score += 2;
      }
    });

    return { remedy, score };
  }).sort((a, b) => b.score - a.score);

  if (rankedFallback[0]?.score > 4) {
    const best = rankedFallback[0].remedy;
    return {
      name: best.name,
      description: best.description,
      symptoms: best.symptoms || (best.symptomTags || []).join(", "),
      ingredients: [...(best.ingredients || [])],
      steps: [...(best.steps || [])],
      rating: best.rating || 4.7,
      tags: [...(best.tags || [])],
      timeMins: best.timeMins || 8,
      difficulty: best.difficulty || "Easy",
      ayurveda:
        best.ayurveda ||
        best.substitutes?.[0] ||
        "A practical home-prep option based on the closest safe remedy pattern.",
      bestFor: [...(best.bestFor || best.symptomTags || [])],
      colorFrom: best.colorFrom || "#1f9c90",
      colorTo: best.colorTo || "#0d6a65",
      source: "library",
    };
  }

  return null;
}

function applySafetyAdjustments(remedy, context) {
  const adjusted = {
    ...remedy,
    ingredients: [...(remedy.ingredients || [])],
    steps: [...(remedy.steps || [])],
    warnings: [...(remedy.warnings || [])],
  };

  if (context.flags.highSugar) {
    adjusted.ingredients = adjusted.ingredients.filter(
      (ingredient) => !/honey|banana/i.test(ingredient)
    );
    adjusted.warnings.push(
      "Avoided very sweet ingredients because recent blood sugar looks elevated."
    );
  }

  if (context.flags.highBp) {
    adjusted.ingredients = adjusted.ingredients.filter(
      (ingredient) => !/licorice|mulethi|salt/i.test(ingredient)
    );
    adjusted.warnings.push(
      "Avoid stronger blood-pressure-sensitive ingredients like licorice or extra salt."
    );
  }

  if (context.flags.highHeartRate) {
    adjusted.warnings.push(
      "Use warming spices in small amounts because recent heart rate has been high."
    );
  }

  if (context.flags.childSensitive) {
    adjusted.warnings.push(
      "For younger children, keep the preparation mild and confirm portions with a clinician."
    );
  }

  adjusted.warnings = Array.from(new Set(adjusted.warnings));
  return adjusted;
}

async function buildFallbackRemedy(query, context) {
  let template = await searchLibrary(query);
  
  if (!template) {
    template = {
      name: "Daily Tulsi Wellness Brew",
      description:
        "A balanced everyday Ayurvedic drink for light immunity and daily wellness support.",
      symptoms: "General immunity, seasonal wellness, low energy",
      ingredients: ["Tulsi leaves", "Fresh ginger", "Warm water"],
      steps: [
        "Lightly crush the tulsi and ginger.",
        "Simmer in water for 8 minutes.",
        "Strain and drink warm once daily.",
      ],
      rating: 4.8,
      tags: ["Immunity", "Daily Wellness"],
      timeMins: 8,
      difficulty: "Easy",
      ayurveda:
        "This simple brew supports Agni and keeps seasonal Kapha accumulation in check.",
      bestFor: ["Daily wellness", "Seasonal support"],
      colorFrom: "#1f9c90",
      colorTo: "#0d6a65",
    };
  }

  return applySafetyAdjustments(
    {
      ...template,
      source: "fallback",
    },
    context
  );
}

async function generateWithGemini(query, context) {
  const prompt = `
You are generating one Ayurvedic-inspired home remedy for a family wellness app.
CRITICAL: You MUST use your Google Search tool to search the internet for the most accurate, trusted, and effective home remedy for this specific issue. 
DO NOT guess or hallucinate. Rely strictly on real, reliable information found on the internet.

User request: "${query}"
Focus: ${context.focusLabel}
Known health context:
${context.healthNotes.length > 0 ? context.healthNotes.map((note) => `- ${note}`).join("\n") : "- No strong health flags are available."}

Safety flags:
- high blood pressure risk: ${context.flags.highBp}
- high blood sugar risk: ${context.flags.highSugar}
- poor sleep trend: ${context.flags.poorSleep}
- high heart rate trend: ${context.flags.highHeartRate}
- low activity trend: ${context.flags.lowActivity}
- child-sensitive profile in focus: ${context.flags.childSensitive}

Rules:
- Return only JSON.
- Give one practical remedy, not multiple options.
- Keep it realistic for a home kitchen.
- If a risk flag suggests caution, include a warning.
- Do not diagnose or promise a cure.

Return this exact shape:
{
  "name": "",
  "description": "",
  "symptoms": "",
  "ingredients": [""],
  "steps": [""],
  "rating": 4.8,
  "tags": [""],
  "timeMins": 10,
  "difficulty": "Easy",
  "ayurveda": "",
  "warnings": [""],
  "bestFor": [""],
  "colorFrom": "#1f9c90",
  "colorTo": "#0d6a65"
}
`;
  const genAI = getModel();
  let lastError = null;

  for (const modelName of getCandidateModels()) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        tools: [{ googleSearch: {} }]
      });
      const result = await model.generateContent([{ text: prompt }]);
      const text = result?.response?.text?.()?.trim();

      if (!text) {
        throw new Error(`Empty remedy response from ${modelName}`);
      }

      const parsed = parseJsonResponse(text);

      return applySafetyAdjustments(
        {
          name: parsed?.name || "Custom Remedy",
          description: parsed?.description || `A tailored remedy for ${query}.`,
          symptoms: parsed?.symptoms || query,
          ingredients: Array.isArray(parsed?.ingredients) ? parsed.ingredients : [],
          steps: Array.isArray(parsed?.steps) ? parsed.steps : [],
          rating: Number(parsed?.rating || 4.8),
          tags: Array.isArray(parsed?.tags) ? parsed.tags : [query],
          timeMins: Number(parsed?.timeMins || 10),
          difficulty: parsed?.difficulty || "Easy",
          ayurveda: parsed?.ayurveda || "",
          warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
          bestFor: Array.isArray(parsed?.bestFor) ? parsed.bestFor : [],
          colorFrom: parsed?.colorFrom || "#1f9c90",
          colorTo: parsed?.colorTo || "#0d6a65",
          source: "internet",
        },
        context
      );
    } catch (error) {
      lastError = error;
      logger.warn({
        route: "remedy-generate",
        model: modelName,
        error: {
          message: error?.message || "Gemini remedy generation failed",
        },
      });
    }
  }

  throw lastError || new Error("No Gemini model succeeded for remedy generation");
}

export const generateRemedy = async (req, res) => {
  try {
    const query = String(req.body?.query || "").trim() || "daily immunity";
    const selectedMemberId = req.body?.memberId || "family";

    if (NON_REMEDY_QUERY_PATTERN.test(query)) {
      return sendError(res, {
        status: 400,
        code: "NON_REMEDY_QUERY",
        message:
          "Nutrient deficiencies should be handled with lab review, food guidance, or clinician advice instead of a home-remedy card.",
      });
    }

    const context = await buildFocusContext(req.userId, selectedMemberId);
    let remedy;

    // 1. Try Cache Lookup (48h cache)
    const AIInsight = mongoose.models.AIInsight || (await import("../models/aiinsightmodel.js")).default;
    const recentCache = await AIInsight.findOne({
      sourceMessage: \`remedy:\${query}\`,
      memberLabel: context.focusLabel,
      createdAt: { $gt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    }).sort({ createdAt: -1 });

    if (recentCache?.adviceSummary) {
      try {
        remedy = JSON.parse(recentCache.adviceSummary);
        logger.info({ route: "remedy-generate", userId: req.userId, cacheHit: true }, "Serving cached remedy");
      } catch (err) {
        // Continue to generation if JSON is invalid
      }
    }

    if (!remedy) {
      // 2. Try Prebuilt Library FIRST
      const libraryMatch = await searchLibrary(query);
      if (libraryMatch) {
        remedy = applySafetyAdjustments(libraryMatch, context);
      } else {
        // 3. Not in library, search internet (Gemini)
        try {
          remedy = await generateWithGemini(query, context);
          
          // 4. Save that remedy in library too so may use in future
          const LibraryRemedy = mongoose.models.LibraryRemedy || (await import("../models/libraryremedymodel.js")).default;
          await LibraryRemedy.create({
            id: \`gen-\${Date.now()}\`,
            name: remedy.name,
            description: remedy.description,
            symptoms: remedy.symptoms,
            ingredients: remedy.ingredients,
            steps: remedy.steps,
            rating: remedy.rating,
            tags: remedy.tags,
            timeMins: remedy.timeMins,
            difficulty: remedy.difficulty,
            ayurveda: remedy.ayurveda,
            bestFor: remedy.bestFor,
            colorFrom: remedy.colorFrom,
            colorTo: remedy.colorTo,
          }).catch(err => console.error("Failed to save to LibraryRemedy", err));
          
        } catch (error) {
          console.error("Gemini remedy generation failed, using fallback:", error.message);
          remedy = await buildFallbackRemedy(query, context);
        }
      }

      // Cache the result for future requests
      if (remedy) {
        await AIInsight.create({
          ownerId: req.userId,
          memberId: selectedMemberId !== "family" ? selectedMemberId : null,
          memberLabel: context.focusLabel,
          sourceMessage: \`remedy:\${query}\`,
          adviceSummary: JSON.stringify(remedy),
          symptoms: [query],
        });
      }
    }

    return sendSuccess(res, {
      data: {
        remedy,
        context: {
          focusLabel: context.focusLabel,
          healthNotes: context.healthNotes,
          flags: context.flags,
        },
      },
    });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "REMEDY_GENERATION_FAILED",
      message: "Failed to generate remedy",
      details: error.message,
    });
  }
};
