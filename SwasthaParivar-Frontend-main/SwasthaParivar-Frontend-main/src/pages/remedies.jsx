import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ChevronDown,
  Heart,
  Leaf,
  Loader2,
  Search,
  Share2,
  ShieldAlert,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { motion as Motion } from "framer-motion";

import REMEDIES_DATA from "../data/remedies.js";
import api from "../lib/api";
import {
  buildCatalog,
  buildRemedyContext,
  decorateRemedyForContext,
  getAllRemedyTags,
  getSeriousSymptomMatch,
  getSuggestedSeed,
} from "../lib/remedyInsights";
import "./remedies.css";

const createGradient = (from = "var(--color-primary-strong)", to = "var(--color-primary)") =>
  `linear-gradient(135deg, ${from}, ${to})`;

const uniqueTextList = (items = []) => Array.from(new Set(items.filter(Boolean)));

const extractIngredientKey = (ingredient = "") =>
  String(ingredient || "")
    .toLowerCase()
    .replace(/\b\d+(?:\/\d+)?\b/g, " ")
    .replace(/\b(cup|cups|tbsp|tsp|tablespoon|tablespoons|teaspoon|teaspoons|pinch|small|fresh|warm|hot|of|or|to|taste)\b/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parsePantryItems = (value = "") =>
  uniqueTextList(
    String(value || "")
      .split(/[,\n]/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );

const pantryMatchesIngredient = (ingredient = "", pantryItems = []) => {
  const ingredientKey = extractIngredientKey(ingredient);
  if (!ingredientKey) return false;

  return pantryItems.some((item) => {
    const pantryKey = extractIngredientKey(item);
    return pantryKey && (ingredientKey.includes(pantryKey) || pantryKey.includes(ingredientKey));
  });
};

const LOCAL_GENERATOR_TEMPLATES = [
  {
    key: "infant-cold",
    when: (context) => context.flags.infant,
    match: /(cold|cough|throat|respiratory|congestion|runny nose)/i,
    name: "Gentle Tulsi Warm Water Support",
    description:
      "A very mild comfort option for infants when a caregiver wants something gentle and non-sweet.",
    symptoms: "Mild cold, light congestion, throat irritation",
    ingredients: ["1 cup warm water", "2 to 3 tulsi leaves"],
    steps: [
      "Wash the tulsi leaves well.",
      "Steep the leaves in warm water for 5 minutes and remove them.",
      "Offer only a few safe sips if the child's pediatrician has already said warm fluids are okay.",
      "Stop and get medical guidance if breathing, feeding, or fever worsens.",
    ],
    rating: 4.8,
    tags: ["Cold", "Hydration", "Immunity"],
    timeMins: 5,
    difficulty: "Easy",
    ayurveda:
      "This keeps the preparation very gentle for child-sensitive profiles and avoids honey or sharp spices.",
    bestFor: ["Gentle infant support", "Cold comfort", "Hydration support"],
    colorFrom: "#56bdd6",
    colorTo: "#327fcb",
  },
  {
    key: "pregnancy-digestion",
    when: (context) => context.flags.pregnant,
    match: /(digestion|bloating|gas|constipation|stomach|nausea|acidity)/i,
    name: "Pregnancy-Safe CCF Infusion",
    description:
      "A gentler cumin-coriander-fennel infusion designed for digestion support in pregnancy-aware profiles.",
    symptoms: "Bloating, mild acidity, post-meal heaviness",
    ingredients: ["1 cup water", "1/2 tsp cumin seeds", "1/2 tsp coriander seeds", "1/2 tsp fennel seeds"],
    steps: [
      "Lightly crush the seeds.",
      "Simmer them in water for 6 to 8 minutes.",
      "Strain and sip warm in small amounts after meals.",
      "Stop if it feels too warming or uncomfortable.",
    ],
    rating: 4.9,
    tags: ["Digestion", "Hydration", "Metabolic"],
    timeMins: 8,
    difficulty: "Easy",
    ayurveda:
      "This classic digestive blend is kept mild to support Agni without a strong heating load.",
    bestFor: ["Pregnancy-aware digestion support", "Bloating comfort", "Gentle post-meal support"],
    colorFrom: "#f2b349",
    colorTo: "#d08a16",
  },
  {
    key: "cold",
    match: /(cold|cough|throat|respiratory|congestion|flu)/i,
    name: "Tulsi Ginger Comfort Brew",
    description:
      "A warm kitchen remedy for throat comfort, light congestion support, and gentle immunity care.",
    symptoms: "Cold, cough, throat irritation, mild congestion",
    ingredients: ["1 cup water", "6 to 8 tulsi leaves", "1/4 tsp grated ginger", "1 pinch black pepper"],
    steps: [
      "Lightly crush the tulsi leaves and grated ginger.",
      "Simmer them in water for 8 to 10 minutes.",
      "Add a very small pinch of black pepper, strain, and sip warm.",
      "Use once or twice daily and stop if it feels too heating.",
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
    key: "sleep",
    match: /(sleep|stress|anxiety|insomnia|relax)/i,
    name: "Cardamom Calm Night Cup",
    description:
      "A simple evening remedy to support relaxation and easier wind-down before sleep.",
    symptoms: "Stress, restless evenings, light sleep difficulty",
    ingredients: ["1 cup milk or plant milk", "2 crushed cardamom pods", "1 pinch nutmeg"],
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
    key: "digestion",
    match: /(digestion|bloating|gas|constipation|metabolic|stomach)/i,
    name: "Cumin Coriander Digestive Infusion",
    description:
      "A gentle digestive infusion for bloating, sluggish digestion, and post-meal heaviness.",
    symptoms: "Bloating, gas, slow digestion, post-meal heaviness",
    ingredients: ["1 cup water", "1/2 tsp cumin seeds", "1/2 tsp coriander seeds", "1/2 tsp fennel seeds"],
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
      "This classic blend supports Agni without being overly sharp, making it useful for digestive complaints.",
    bestFor: ["Digestion", "Bloating", "Metabolic balance"],
    colorFrom: "#f2b349",
    colorTo: "#d08a16",
  },
  {
    key: "pain",
    match: /(pain|joint|inflammation|stiff|body ache)/i,
    name: "Turmeric Recovery Drink",
    description:
      "A warm anti-inflammatory comfort drink for mild pain, soreness, and recovery support.",
    symptoms: "Mild pain, inflammation, post-activity soreness",
    ingredients: ["1 cup milk or plant milk", "1/4 tsp turmeric", "1/8 tsp grated ginger", "1 pinch black pepper"],
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
    key: "hydration",
    match: /(hydration|skin|pitta|heat|summer)/i,
    name: "Coriander Cooling Water",
    description:
      "A light cooling drink to support hydration and reduce internal heat during warmer days.",
    symptoms: "Heat, low hydration, feeling overheated",
    ingredients: ["1 cup water", "1 tsp coriander seeds", "3 to 4 mint leaves"],
    steps: [
      "Soak coriander seeds in water for several hours or overnight.",
      "Strain, add a little fresh mint, and sip through the day.",
    ],
    rating: 4.7,
    tags: ["Hydration", "Skin"],
    timeMins: 5,
    difficulty: "Easy",
    ayurveda:
      "This lighter cooling preparation can help when Pitta feels high or hydration is low.",
    bestFor: ["Hydration", "Cooling support", "Skin comfort"],
    colorFrom: "#56bdd6",
    colorTo: "#327fcb",
  },
  {
    key: "metabolic",
    match: /(weight loss|lose weight|fat loss|slimming|slow metabolism|belly fat)/i,
    name: "Cumin Lemon Metabolic Water",
    description:
      "A light kitchen remedy for sluggish digestion, post-meal heaviness, and gentle metabolic support.",
    symptoms: "Weight balance, sluggish digestion, post-meal heaviness",
    ingredients: ["1 cup water", "1/2 tsp cumin seeds", "1 tsp lemon juice"],
    steps: [
      "Lightly crush the cumin seeds and simmer them in water for 6 to 8 minutes.",
      "Let the drink cool slightly, then add the lemon juice.",
      "Sip it warm after meals or in the morning if it feels comfortable.",
    ],
    rating: 4.7,
    tags: ["Metabolic", "Digestion", "Detox"],
    timeMins: 8,
    difficulty: "Easy",
    ayurveda:
      "Cumin and lemon can help support Agni and reduce digestive heaviness when paired with balanced meals.",
    bestFor: ["Metabolic support", "Digestive lightness", "Weight-balance routines"],
    colorFrom: "#f0ab3d",
    colorTo: "#d08a16",
  },
  {
    key: "hair",
    match: /(zinc deficiency|low zinc|zinc deficient|hair fall|hair loss|weak roots|skin dullness)/i,
    name: "Curry Leaf Nourish Drink",
    description:
      "A nourishment-focused drink that supports hair, skin, and daily food-based wellness when the body feels undernourished.",
    symptoms: "Low nourishment, hair fall, weak roots, skin dullness",
    ingredients: ["1 cup warm water", "8 to 10 curry leaves", "1 tsp black sesame seeds", "1 small slice ginger"],
    steps: [
      "Wash the curry leaves and lightly crush them with a small slice of ginger.",
      "Blend or simmer them with warm water and the sesame seeds.",
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

const normalizeGeneratedRemedy = (payload, seedText) => ({
  id: payload?.id || `guided-${Date.now()}`,
  name: payload?.name || `Custom ${seedText} Remedy`,
  description:
    payload?.description ||
    `A locally generated, family-aware remedy created for ${seedText}.`,
  symptoms:
    payload?.symptoms ||
    (Array.isArray(payload?.bestFor) ? payload.bestFor.join(", ") : seedText),
  ingredients: Array.isArray(payload?.ingredients) ? payload.ingredients : [],
  steps: Array.isArray(payload?.steps) ? payload.steps : [],
  rating: Number(payload?.rating || 4.9),
  tags: Array.isArray(payload?.tags) && payload.tags.length > 0 ? payload.tags : [seedText],
  timeMins: Number(payload?.timeMins || 10),
  difficulty: payload?.difficulty || "Easy",
  ayurveda: payload?.ayurveda || payload?.whyItWorks || "",
  warnings: Array.isArray(payload?.warnings) ? payload.warnings : [],
  bestFor: Array.isArray(payload?.bestFor) ? payload.bestFor : [],
  colorFrom: payload?.colorFrom || "var(--color-primary-strong)",
  colorTo: payload?.colorTo || "var(--color-primary)",
  source: payload?.source || "guided-local",
  pantryNotes: Array.isArray(payload?.pantryNotes) ? payload.pantryNotes : [],
});

const applyContextSafety = (remedy, context) => {
  const adjusted = {
    ...remedy,
    ingredients: [...(remedy.ingredients || [])],
    warnings: [...(remedy.warnings || [])],
  };

  const removeByPattern = (pattern, warning) => {
    const beforeCount = adjusted.ingredients.length;
    adjusted.ingredients = adjusted.ingredients.filter((ingredient) => !pattern.test(ingredient));
    if (adjusted.ingredients.length !== beforeCount && warning) {
      adjusted.warnings.push(warning);
    }
  };

  if (context.flags.diabetes || context.flags.highSugar) {
    removeByPattern(
      /\bhoney|jaggery|sugar syrup|sugar\b/i,
      "Sweeteners were removed because this profile is diabetes or sugar sensitive."
    );
  }

  if (context.flags.infant) {
    removeByPattern(/\bhoney\b/i, "Honey was removed because children under 2 should not have it.");
    removeByPattern(
      /\bblack pepper|long pepper|trikatu|ajwain|clove|cinnamon|red chilli|red chili\b/i,
      "Strong spices were removed because this is an under-2 profile."
    );
  }

  if (context.flags.pregnant) {
    removeByPattern(/\bpapaya\b/i, "Papaya was removed for pregnancy safety.");
    removeByPattern(/\bsesame|til\b/i, "Sesame was removed for pregnancy safety.");
  }

  if (context.flags.bloodThinner) {
    adjusted.warnings.push(
      "Turmeric and ginger should be used carefully because this profile has blood-thinner medication."
    );
  }

  if (context.flags.highBp) {
    removeByPattern(
      /\blicorice|mulethi\b/i,
      "Licorice was removed because this profile is BP sensitive."
    );
  }

  adjusted.warnings = uniqueTextList(adjusted.warnings);
  return adjusted;
};

const scoreTemplate = (template, seedText, pantryItems = []) => {
  let score = 0;
  const normalizedSeed = String(seedText || "").trim();

  if (template.match.test(normalizedSeed)) {
    score += 8;
  }

  if (pantryItems.length > 0) {
    template.ingredients.forEach((ingredient) => {
      if (pantryMatchesIngredient(ingredient, pantryItems)) {
        score += 2;
      }
    });
  }

  return score;
};

const buildPantryNotes = (ingredients = [], pantryItems = []) => {
  if (!pantryItems.length) return [];

  const available = ingredients.filter((ingredient) => pantryMatchesIngredient(ingredient, pantryItems));
  const missing = ingredients.filter((ingredient) => !pantryMatchesIngredient(ingredient, pantryItems));
  const notes = [];

  if (available.length > 0) {
    notes.push(`Matched your pantry with ${available.slice(0, 3).join(", ")}.`);
  }

  if (missing.length > 0) {
    notes.push(`You may still need ${missing.slice(0, 2).join(", ")} or a close substitute.`);
  }

  return notes;
};

const buildTemplateGeneratedRemedy = ({ seedText, context, activeTag, pantryInput }) => {
  const normalizedSeed = String(seedText || "").trim();
  const pantryItems = parsePantryItems(pantryInput);
  const matchingTemplates = LOCAL_GENERATOR_TEMPLATES
    .filter((template) => (!template.when || template.when(context)) && template.match.test(normalizedSeed))
    .sort((left, right) => scoreTemplate(right, normalizedSeed, pantryItems) - scoreTemplate(left, normalizedSeed, pantryItems));

  const selectedTemplate = matchingTemplates[0] || null;

  if (selectedTemplate) {
    const adjusted = applyContextSafety(
      {
        ...selectedTemplate,
        id: `guided-${Date.now()}`,
        source: "guided-local",
        warnings: buildPantryNotes(selectedTemplate.ingredients, pantryItems),
      },
      context
    );

    return adjusted;
  }

  const localMatches = buildCatalog(REMEDIES_DATA, context, normalizedSeed, activeTag || "All");
  const baseRemedy =
    localMatches[0] ||
    buildCatalog(REMEDIES_DATA, context, normalizedSeed, "All")[0] ||
    REMEDIES_DATA[0];

  const pantryNotes = buildPantryNotes(baseRemedy?.ingredients || [], pantryItems);

  return applyContextSafety(
    {
      ...baseRemedy,
      id: `guided-${Date.now()}`,
      name: baseRemedy?.name || `Custom ${normalizedSeed} Remedy`,
      description:
        baseRemedy?.description ||
        `A conservative locally selected remedy for ${normalizedSeed}, adjusted for ${context.focusLabel.toLowerCase()}.`,
      symptoms: baseRemedy?.symptoms || normalizedSeed,
      tags: uniqueTextList([...(baseRemedy?.tags || []), normalizedSeed]).slice(0, 4),
      bestFor: uniqueTextList([
        ...(Array.isArray(baseRemedy?.bestFor) ? baseRemedy.bestFor : []),
        normalizedSeed,
        context.focusLabel,
      ]).slice(0, 4),
      ayurveda:
        baseRemedy?.ayurveda ||
        "This guided remedy keeps the recommendation practical and conservative for the selected health focus.",
      warnings: pantryNotes,
      source: "guided-local",
    },
    context
  );
};

const buildLocalGeneratedRemedy = ({ seedText, context, activeTag, pantryInput }) => {
  const guidedRemedy = buildTemplateGeneratedRemedy({
    seedText,
    context,
    activeTag,
    pantryInput,
  });

  return {
    ...guidedRemedy,
    warnings: uniqueTextList([
      ...(guidedRemedy?.warnings || []),
      "This remedy was generated from the local remedy library so it stays available even when live services are slow.",
      "Get medical advice if symptoms are severe, unusual, or getting worse.",
    ]),
    source: "local-fallback",
  };
};

const shareRemedy = async (remedy) => {
  const text = [
    remedy.name,
    remedy.description || remedy.symptoms,
    `Ingredients: ${(remedy.ingredients || []).slice(0, 5).join(", ")}`,
    remedy.insight?.dosage?.detail ? `Dose: ${remedy.insight.dosage.detail}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    if (navigator.share) {
      await navigator.share({ title: remedy.name, text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("Copied remedy to clipboard");
    }
  } catch {
    // user cancelled share
  }
};

function RemedyCard({ remedy, onOpen, onShare, onToggleFavorite, favorite }) {
  const safetyStatus = remedy.insight?.safetyStatus || "safe";

  return (
    <article className={`remedy-card ${remedy.source !== "catalog" ? "is-ai" : ""}`}>
      <div
        className="remedy-card__hero"
        style={{ background: createGradient(remedy.colorFrom, remedy.colorTo) }}
      >
        <div className="remedy-card__badges">
          <span className="rating-chip">
            <Star size={14} />
            {Number(remedy.rating || 0).toFixed(1)}
          </span>
          {remedy.insight?.fallbackMatch ? (
            <span className="ai-chip">
              <Sparkles size={14} />
              Nearest match
            </span>
          ) : null}
          {remedy.source !== "catalog" ? (
            <span className="ai-chip">
              <Sparkles size={14} />
              Custom
            </span>
          ) : null}
        </div>

        <button
          className={`favorite-chip ${favorite ? "active" : ""}`}
          onClick={() => onToggleFavorite(remedy.id)}
          aria-label={favorite ? "Remove favorite" : "Save favorite"}
        >
          <Heart size={18} />
        </button>
      </div>

      <div className="remedy-card__body">
        <div className="remedy-card__meta">
          <span>{remedy.timeMins} min prep</span>
          <span>{remedy.difficulty || "Easy"}</span>
          <span className={`family-chip family-chip--${safetyStatus}`}>
            {remedy.insight?.familyAwareTag}
          </span>
        </div>

        <h3>{remedy.name}</h3>
        <p className="remedy-card__description">{remedy.description || remedy.symptoms}</p>

        <div className="remedy-card__tags">
          {(remedy.tags || []).slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <div className="remedy-card__fact">
          <span className="fact-label">Targets</span>
          <div className="ingredient-preview">
            {(remedy.insight?.targetSymptoms || []).slice(0, 3).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="remedy-card__fact">
          <span className="fact-label">Active ingredients</span>
          <div className="ingredient-preview">
            {(remedy.insight?.activeIngredients || []).slice(0, 3).map((ingredient) => (
              <span key={ingredient}>{ingredient}</span>
            ))}
          </div>
        </div>

        <div className="remedy-card__fact">
          <span className="fact-label">Family-aware dose</span>
          <p className="fact-copy">{remedy.insight?.dosage?.short}</p>
        </div>

        {remedy.insight?.reasons?.length > 0 && (
          <div className="remedy-card__reasons">
            {remedy.insight.reasons.map((reason) => (
              <div key={reason} className="info-callout">
                <Sparkles size={14} />
                {reason}
              </div>
            ))}
          </div>
        )}

        {remedy.insight?.contraindications?.length > 0 ? (
          <div className="warning-stack">
            {remedy.insight.contraindications.slice(0, 2).map((warning) => (
              <div key={warning} className="warning-callout">
                <AlertTriangle size={14} />
                {warning}
              </div>
            ))}
          </div>
        ) : (
          <div className="safe-callout">
            <Sparkles size={14} />
            No direct contraindications were detected for the active profile.
          </div>
        )}

        {remedy.pantryNotes?.length > 0 && (
          <div className="remedy-card__reasons">
            {remedy.pantryNotes.slice(0, 2).map((note) => (
              <div key={note} className="info-callout">
                <Sparkles size={14} />
                {note}
              </div>
            ))}
          </div>
        )}

        <div className="remedy-card__actions">
          <button className="action-button action-button--primary" onClick={() => onOpen(remedy)}>
            View Full Recipe
            <ChevronDown size={14} />
          </button>
          <button className="action-button action-button--ghost" onClick={() => onShare(remedy)}>
            <Share2 size={14} />
            Share
          </button>
        </div>
      </div>
    </article>
  );
}

function RecipeModal({ remedy, onClose, onToggleFavorite, favorite, onShare, focusLabel }) {
  if (!remedy) return null;

  return (
    <div className="remedy-modal-backdrop" onClick={onClose}>
      <div className="remedy-modal" onClick={(event) => event.stopPropagation()}>
        <button className="remedy-modal__close" onClick={onClose}>
          <X size={18} />
        </button>

        <div
          className="remedy-modal__hero"
          style={{ background: createGradient(remedy.colorFrom, remedy.colorTo) }}
        >
          <div className="remedy-modal__overlay" />
          <div className="remedy-modal__hero-content">
            <div className="remedy-modal__chips">
              {(remedy.tags || []).slice(0, 3).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <h2>{remedy.name}</h2>
            <p>{focusLabel}</p>
          </div>
        </div>

        <div className="remedy-modal__content">
          <div className="modal-section">
            <h3>Description</h3>
            <p>{remedy.description || remedy.symptoms}</p>
          </div>

          <div className="facts-grid">
            <div className="detail-card">
              <span className="detail-card__label">Prep time</span>
              <strong>{remedy.timeMins} min</strong>
            </div>
            <div className="detail-card">
              <span className="detail-card__label">Difficulty</span>
              <strong>{remedy.difficulty || "Easy"}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-card__label">Family-aware tag</span>
              <strong>{remedy.insight?.familyAwareTag}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-card__label">Dose</span>
              <strong>{remedy.insight?.dosage?.short}</strong>
            </div>
          </div>

          {remedy.insight?.reasons?.length > 0 && (
            <div className="modal-section">
              <h3>Why It Fits Right Now</h3>
              <div className="detail-pill-row">
                {remedy.insight.reasons.map((reason) => (
                  <span key={reason} className="detail-pill detail-pill--good">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="remedy-modal__grid">
            <div className="modal-section">
              <h3>Targets</h3>
              <div className="detail-pill-row">
                {(remedy.insight?.targetSymptoms || []).map((item) => (
                  <span key={item} className="detail-pill">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="modal-section">
              <h3>Active Ingredients</h3>
              <div className="detail-pill-row">
                {(remedy.insight?.activeIngredients || []).map((ingredient) => (
                  <span key={ingredient} className="detail-pill">
                    {ingredient}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>Family-Aware Dosage</h3>
            <p>{remedy.insight?.dosage?.detail}</p>
          </div>

          <div className="modal-section">
            <h3>Contraindications</h3>
            {remedy.insight?.contraindications?.length > 0 ? (
              <div className="warning-panel">
                {remedy.insight.contraindications.map((warning) => (
                  <div key={warning}>
                    <AlertTriangle size={14} />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="safe-callout">
                <Sparkles size={14} />
                No direct contraindications were detected for this profile.
              </div>
            )}
          </div>

          <div className="remedy-modal__grid">
            <div className="modal-section">
              <h3>Ingredients</h3>
              <ul className="detail-list">
                {(remedy.ingredients || []).map((ingredient) => (
                  <li key={ingredient}>{ingredient}</li>
                ))}
              </ul>
            </div>

            <div className="modal-section">
              <h3>Preparation</h3>
              <ol className="detail-list detail-list--numbered">
                {(remedy.steps || []).map((step, index) => (
                  <li key={`${step}-${index}`}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          {remedy.pantryNotes?.length > 0 && (
            <div className="modal-section">
              <h3>Pantry Check</h3>
              <div className="detail-pill-row">
                {remedy.pantryNotes.map((note) => (
                  <span key={note} className="detail-pill">
                    {note}
                  </span>
                ))}
              </div>
            </div>
          )}

          {remedy.ayurveda && (
            <div className="modal-section">
              <h3>Ayurvedic Perspective</h3>
              <p>{remedy.ayurveda}</p>
            </div>
          )}

          <div className="remedy-modal__footer">
            <button className="action-button action-button--primary" onClick={() => onToggleFavorite(remedy.id)}>
              <Heart size={16} />
              {favorite ? "Saved" : "Save Remedy"}
            </button>
            <button className="action-button action-button--ghost" onClick={() => onShare(remedy)}>
              <Share2 size={14} />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Remedies() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [selectedMemberId, setSelectedMemberId] = useState("family");
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("remedy_favs") || "[]");
    } catch {
      return [];
    }
  });
  const [openRecipe, setOpenRecipe] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [generatedRemedy, setGeneratedRemedy] = useState(null);
  const [generatedError, setGeneratedError] = useState("");
  const [pantryInput, setPantryInput] = useState("");
  const [generatorSymptoms, setGeneratorSymptoms] = useState("");

  const resetGeneratedState = () => {
    setGeneratedRemedy(null);
    setGeneratedError("");
  };

  useEffect(() => {
    localStorage.setItem("remedy_favs", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    let cancelled = false;

    const loadMembers = async () => {
      try {
        const data = await api.get("/members");
        const normalizedMembers = Array.isArray(data)
          ? data
          : Array.isArray(data?.members)
            ? data.members
            : Array.isArray(data?.data?.members)
              ? data.data.members
              : [];

        if (!cancelled) {
          setMembers(normalizedMembers);
        }
      } catch (error) {
        console.error("Failed to load family members for remedies", error);
        if (!cancelled) {
          setMembers([]);
        }
      }
    };

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenRecipe(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const context = useMemo(
    () => buildRemedyContext(members, selectedMemberId),
    [members, selectedMemberId]
  );

  const tagOptions = useMemo(
    () => getAllRemedyTags(REMEDIES_DATA, context.recommendedTags),
    [context.recommendedTags]
  );

  const seriousMatch = useMemo(
    () => getSeriousSymptomMatch(generatorSymptoms || query),
    [generatorSymptoms, query]
  );

  const rankedRemedies = useMemo(() => {
    if (seriousMatch) return [];
    return buildCatalog(REMEDIES_DATA, context, query, activeTag);
  }, [activeTag, context, query, seriousMatch]);

  const fallbackRemedies = useMemo(() => {
    if (seriousMatch) return [];
    return buildCatalog(REMEDIES_DATA, context, "", activeTag === "All" ? "All" : activeTag).slice(0, 6);
  }, [activeTag, context, seriousMatch]);

  const visibleRemedies = rankedRemedies.length > 0 ? rankedRemedies : fallbackRemedies;

  const suggestedSeed = useMemo(
    () => getSuggestedSeed(generatorSymptoms || query, activeTag, context),
    [activeTag, context, generatorSymptoms, query]
  );

  const handleToggleFavorite = (id) => {
    setFavorites((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]
    );
  };

  const openFamilyAI = (symptomText = "") => {
    if (symptomText) {
      sessionStorage.setItem("remedies_red_flag_query", symptomText);
    }
    navigate("/ai-chat");
  };

  const handleFocusChange = (event) => {
    setSelectedMemberId(event.target.value);
    resetGeneratedState();
  };

  const handleQueryChange = (event) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    setGeneratorSymptoms(nextQuery);

    if (nextQuery.trim()) {
      setActiveTag("All");
    }

    resetGeneratedState();

    const redFlagMatch = getSeriousSymptomMatch(nextQuery);
    if (redFlagMatch) {
      openFamilyAI(nextQuery);
    }
  };

  const handleTagSelect = (tag) => {
    setActiveTag(tag);
    setQuery("");
    setGeneratorSymptoms(tag === "All" ? "" : tag);
    resetGeneratedState();
  };

  const handleGenerateRemedy = async () => {
    const nextSeed = (generatorSymptoms || suggestedSeed || "").trim();

    if (!nextSeed) {
      setGeneratedError("Start with symptoms like cough, acidity, cold, sleep, or digestion.");
      return;
    }

    const redFlagMatch = getSeriousSymptomMatch(nextSeed);
    if (redFlagMatch) {
      openFamilyAI(nextSeed);
      return;
    }

    setAiBusy(true);
    setGeneratedError("");
    setGeneratedRemedy(null);

    try {
      const remedyPayload = buildTemplateGeneratedRemedy({
        seedText: nextSeed,
        context,
        activeTag,
        pantryInput,
      });
      const normalized = normalizeGeneratedRemedy(remedyPayload, nextSeed);
      const decorated = decorateRemedyForContext(normalized, context, nextSeed);

      setGeneratedRemedy({
        ...decorated,
        pantryNotes: uniqueTextList([...(normalized.pantryNotes || []), ...(normalized.warnings || [])]),
        insight: {
          ...decorated.insight,
          reasons: uniqueTextList([
            ...(decorated.insight?.reasons || []),
            `Profile checked: ${context.focusLabel}`,
            `Dose matched to ${context.dosageProfile.label.toLowerCase()}`,
          ]).slice(0, 4),
        },
      });
    } catch (error) {
      console.error("Failed to generate custom remedy", error);
      const fallback = buildLocalGeneratedRemedy({
        seedText: nextSeed,
        context,
        activeTag,
        pantryInput,
      });
      const normalized = normalizeGeneratedRemedy(fallback, nextSeed);
      const decorated = decorateRemedyForContext(normalized, context, nextSeed);

      setGeneratedRemedy({
        ...decorated,
        pantryNotes: uniqueTextList([...(normalized.pantryNotes || []), ...(normalized.warnings || [])]),
      });
      setGeneratedError(error.message || "Could not generate a custom remedy right now.");
    } finally {
      setAiBusy(false);
    }
  };

  const focusMembersLabel =
    selectedMemberId === "family"
      ? "Whole family profile check"
      : `${members.find((member) => member._id === selectedMemberId)?.name || "Selected"} profile check`;

  return (
    <div className="remedies-page">
      <section className="remedies-hero">
        <Motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="hero-kicker">
            <Leaf size={18} />
            Remedies
            <span className="hero-badge">Care Edition</span>
          </div>
          <h1>Safe, context-aware family remedies.</h1>
          <p>
            Profile-aware filtering now checks age, conditions, allergies, pregnancy, medicines,
            and saved household risk flags before ranking remedies for your family.
          </p>
        </Motion.div>

        <Motion.div
          className="hero-panel"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <label className="hero-field">
            <span>Who is it for?</span>
            <select value={selectedMemberId} onChange={handleFocusChange}>
              <option value="family">Whole Family</option>
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <label className="hero-field hero-field--search">
            <span>What symptoms?</span>
            <div className="search-shell">
              <Search size={18} />
              <input
                placeholder="Try cough, digestion, sleep, sore throat..."
                value={query}
                onChange={handleQueryChange}
              />
            </div>
          </label>

          <button className="generate-button" onClick={handleGenerateRemedy}>
            {aiBusy ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
            Generate New Remedy
          </button>
        </Motion.div>
      </section>

      <Motion.section
        className="context-strip"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="context-card">
          <div className="context-card__icon">
            <Users size={18} />
          </div>
          <div>
            <strong>{focusMembersLabel}</strong>
            <p>{context.profileCheckedText}</p>
          </div>
        </div>

        <div className="context-pills">
          {context.summaryPills.length > 0 ? (
            context.summaryPills.map((pill) => <span key={pill}>{pill}</span>)
          ) : (
            <span className="safe-pill">
              <Sparkles size={14} style={{ display: "inline-block", verticalAlign: "text-bottom", marginRight: "4px" }} />
              {context.clearProfile}
            </span>
          )}
        </div>
      </Motion.section>

      <section className="profile-strip">
        {context.profileFacts.map((fact) => (
          <div key={fact} className="profile-pill">
            {fact}
          </div>
        ))}
      </section>

      <section className="tag-strip">
        {tagOptions.map((tag) => (
          <button
            key={tag}
            className={`tag-pill ${activeTag === tag ? "active" : ""}`}
            onClick={() => handleTagSelect(tag)}
          >
            {tag}
          </button>
        ))}
      </section>

      {seriousMatch ? (
        <section className="triage-panel">
          <div className="triage-panel__icon">
            <AlertTriangle size={18} />
          </div>
          <div>
            <strong>{seriousMatch.label}</strong>
            <p>{seriousMatch.guidance}</p>
          </div>
          <button className="action-button action-button--primary" onClick={() => openFamilyAI(generatorSymptoms || query)}>
            Open Family AI
          </button>
        </section>
      ) : null}

      <section className="remedies-grid">
        <article className="generator-card">
          <div className="generator-form">
            <div className="generator-form__header">
              <div className="generator-orb">
                <Sparkles size={26} />
              </div>
              <div>
                <h3>Create Custom Remedy</h3>
                <p>Answer the three questions, then generate a family-aware recipe.</p>
              </div>
            </div>

            <label className="hero-field">
              <span>1. What symptoms?</span>
              <input
                className="generator-input"
                value={generatorSymptoms}
                onChange={(event) => setGeneratorSymptoms(event.target.value)}
                placeholder="Cough, acidity, bloating, sleep trouble..."
              />
            </label>

            <div className="generator-inline-note">
              <span className="detail-pill detail-pill--good">2. Who is it for? {context.focusLabel}</span>
            </div>

            <label className="hero-field">
              <span>3. What ingredients are available at home?</span>
              <textarea
                className="generator-textarea"
                value={pantryInput}
                onChange={(event) => setPantryInput(event.target.value)}
                placeholder="Tulsi, cumin, coriander, fennel, lemon..."
                rows={3}
              />
            </label>

            <button className="action-button action-button--primary" onClick={handleGenerateRemedy}>
              {aiBusy ? <Loader2 className="spin" size={14} /> : <Sparkles size={14} />}
              Generate Family-Safe Remedy
            </button>

            {generatedError ? <div className="warning-callout">{generatedError}</div> : null}
          </div>

          {aiBusy ? (
            <div className="generator-state">
              <Loader2 className="spin" size={34} />
              <h3>Building your remedy...</h3>
              <p>
                Matching symptoms, pantry ingredients, and safety rules for "{suggestedSeed}".
              </p>
            </div>
          ) : generatedRemedy ? (
            <RemedyCard
              remedy={generatedRemedy}
              onOpen={setOpenRecipe}
              onShare={shareRemedy}
              onToggleFavorite={handleToggleFavorite}
              favorite={favorites.includes(generatedRemedy.id)}
            />
          ) : null}
        </article>

        {!seriousMatch &&
          visibleRemedies.map((remedy) => (
            <RemedyCard
              key={remedy.id}
              remedy={remedy}
              onOpen={setOpenRecipe}
              onShare={shareRemedy}
              onToggleFavorite={handleToggleFavorite}
              favorite={favorites.includes(remedy.id)}
            />
          ))}
      </section>

      {!seriousMatch && rankedRemedies.length === 0 && fallbackRemedies.length > 0 && (
        <div className="empty-state">
          <h3>No exact remedies matched your filters.</h3>
          <p>Showing the nearest safe matches instead of a dead end.</p>
        </div>
      )}

      <RecipeModal
        remedy={openRecipe}
        onClose={() => setOpenRecipe(null)}
        onToggleFavorite={handleToggleFavorite}
        favorite={Boolean(openRecipe && favorites.includes(openRecipe.id))}
        onShare={shareRemedy}
        focusLabel={focusMembersLabel}
      />
    </div>
  );
}
