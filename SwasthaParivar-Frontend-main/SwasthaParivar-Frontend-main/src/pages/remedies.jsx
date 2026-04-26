import React, { useEffect, useMemo, useState } from "react";
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
  getAllRemedyTags,
  getSuggestedSeed,
} from "../lib/remedyInsights";
import "./remedies.css";

const createGradient = (from = "var(--color-primary-strong)", to = "var(--color-primary)") =>
  `linear-gradient(135deg, ${from}, ${to})`;

const uniqueTextList = (items = []) => Array.from(new Set(items.filter(Boolean)));

const LOCAL_GENERATOR_TEMPLATES = [
  {
    match: /(cold|cough|throat|respiratory|congestion|flu)/i,
    name: "Tulsi Ginger Comfort Brew",
    description:
      "A warm kitchen remedy for throat comfort, light congestion support, and gentle immunity care.",
    symptoms: "Cold, cough, throat irritation, mild congestion",
    ingredients: ["Tulsi leaves", "Fresh ginger", "Warm water", "Black pepper"],
    steps: [
      "Lightly crush the tulsi leaves and ginger.",
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
    match: /(sleep|stress|anxiety|insomnia|relax)/i,
    name: "Cardamom Calm Night Cup",
    description:
      "A simple evening remedy to support relaxation and easier wind-down before sleep.",
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
      "This classic blend supports Agni without being overly sharp, making it useful for digestive complaints.",
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
      "A light cooling drink to support hydration and reduce internal heat during warmer days.",
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
      "This lighter cooling preparation can help when Pitta feels high or hydration is low.",
    bestFor: ["Hydration", "Cooling support", "Skin comfort"],
    colorFrom: "#56bdd6",
    colorTo: "#327fcb",
  },
  {
    match: /(weight loss|lose weight|fat loss|slimming|slow metabolism|belly fat)/i,
    name: "Cumin Lemon Metabolic Water",
    description:
      "A light kitchen remedy for sluggish digestion, post-meal heaviness, and gentle metabolic support.",
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
      "Cumin and lemon can help support Agni and reduce digestive heaviness when paired with balanced meals.",
    bestFor: ["Metabolic support", "Digestive lightness", "Weight-balance routines"],
    colorFrom: "#f0ab3d",
    colorTo: "#d08a16",
  },
  {
    match: /(zinc deficiency|low zinc|zinc deficient|hair fall|hair loss|weak roots|skin dullness)/i,
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

const toTitleCase = (value = "") =>
  String(value || "").replace(/\b\w/g, (character) => character.toUpperCase());

const normalizeGeneratedRemedy = (payload, seedText) => ({
  id: payload?.id || `ai-${Date.now()}`,
  name: payload?.name || `Custom ${seedText} Remedy`,
  description:
    payload?.description ||
    `A Gemini-assisted Ayurvedic remedy created for ${seedText}.`,
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
  source: payload?.source || "ai",
});

const applyContextSafety = (remedy, context) => {
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

  adjusted.warnings = uniqueTextList(adjusted.warnings);
  return adjusted;
};

const buildTemplateGeneratedRemedy = ({ seedText, context, activeTag }) => {
  const normalizedSeed = String(seedText || "").trim();
  const matchedTemplate =
    LOCAL_GENERATOR_TEMPLATES.find((template) => template.match.test(normalizedSeed)) || null;

  if (matchedTemplate) {
    return applyContextSafety(
      {
        ...matchedTemplate,
        id: `guided-${Date.now()}`,
        source: "guided-local",
      },
      context
    );
  }

  const localMatches = buildCatalog(REMEDIES_DATA, context, normalizedSeed, activeTag || "All");
  const baseRemedy =
    localMatches[0] ||
    buildCatalog(REMEDIES_DATA, context, normalizedSeed, "All")[0] ||
    REMEDIES_DATA[0];

  return applyContextSafety(
    {
      ...baseRemedy,
      id: `guided-${Date.now()}`,
      name: baseRemedy?.name || `${toTitleCase(normalizedSeed)} Support Remedy`,
      description:
        baseRemedy?.description ||
        `A conservative locally selected remedy for ${normalizedSeed}, adjusted for ${context.focusLabel.toLowerCase()}.`,
      symptoms: baseRemedy?.symptoms || normalizedSeed,
      tags: uniqueTextList([...(baseRemedy?.tags || []), toTitleCase(normalizedSeed)]).slice(0, 4),
      bestFor: uniqueTextList([
        ...(Array.isArray(baseRemedy?.bestFor) ? baseRemedy.bestFor : []),
        toTitleCase(normalizedSeed),
        context.focusLabel,
      ]).slice(0, 4),
      ayurveda:
        baseRemedy?.ayurveda ||
        "This guided remedy keeps the recommendation practical and conservative for the selected health focus.",
      source: "guided-local",
    },
    context
  );
};

const buildLocalGeneratedRemedy = ({ seedText, context, activeTag }) => {
  const guidedRemedy = buildTemplateGeneratedRemedy({ seedText, context, activeTag });

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
  ].join("\n");

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

function RemedyCard({ remedy, onOpen, onShare, onToggleFavorite, favorite, focusLabel }) {
  return (
    <article className={`remedy-card ${remedy.source === "ai" ? "is-ai" : ""}`}>
      <div
        className="remedy-card__hero"
        style={{ background: createGradient(remedy.colorFrom, remedy.colorTo) }}
      >
        <div className="remedy-card__badges">
          <span className="rating-chip">
            <Star size={14} />
            {Number(remedy.rating || 0).toFixed(1)}
          </span>
          {remedy.insight?.warnings?.length > 0 && (
            <span className="warn-chip">
              <ShieldAlert size={14} />
              Warning
            </span>
          )}
          {remedy.source === "ai" && (
            <span className="ai-chip">
              <Sparkles size={14} />
              AI
            </span>
          )}
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
          <span>{remedy.timeMins} mins</span>
          <span>{remedy.difficulty || "Easy"}</span>
          <span>{focusLabel}</span>
        </div>

        <h3>{remedy.name}</h3>
        <p className="remedy-card__description">
          {remedy.description || remedy.symptoms}
        </p>

        <div className="remedy-card__tags">
          {(remedy.tags || []).slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
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

        {remedy.insight?.warnings?.length > 0 && (
          <div className="warning-stack">
            {remedy.insight.warnings.slice(0, 2).map((warning) => (
              <div key={warning} className="warning-callout">
                <AlertTriangle size={14} />
                {warning}
              </div>
            ))}
          </div>
        )}

        <div className="ingredient-preview">
          {(remedy.ingredients || []).slice(0, 3).map((ingredient) => (
            <span key={ingredient}>{ingredient}</span>
          ))}
        </div>

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

          {remedy.insight?.warnings?.length > 0 && (
            <div className="modal-section">
              <h3>Safety Warning</h3>
              <div className="warning-panel">
                {remedy.insight.warnings.map((warning) => (
                  <div key={warning}>
                    <AlertTriangle size={14} />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

  const rankedRemedies = useMemo(
    () => buildCatalog(REMEDIES_DATA, context, query, activeTag),
    [activeTag, context, query]
  );

  const suggestedSeed = useMemo(
    () => getSuggestedSeed(query, activeTag, context),
    [activeTag, context, query]
  );

  const handleToggleFavorite = (id) => {
    setFavorites((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]
    );
  };

  const handleFocusChange = (event) => {
    setSelectedMemberId(event.target.value);
    resetGeneratedState();
  };

  const handleQueryChange = (event) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);

    if (nextQuery.trim()) {
      setActiveTag("All");
    }

    resetGeneratedState();
  };

  const handleTagSelect = (tag) => {
    setActiveTag(tag);
    setQuery("");
    resetGeneratedState();
  };

  const handleGenerateRemedy = async () => {
    setAiBusy(true);
    setGeneratedError("");
    setGeneratedRemedy(null);

    try {
      const remedyPayload = buildTemplateGeneratedRemedy({
        seedText: suggestedSeed,
        context,
        activeTag,
      });
      const normalized = normalizeGeneratedRemedy(remedyPayload, suggestedSeed);
      setGeneratedRemedy({
        ...normalized,
        insight: {
          score: 999,
          reasons: normalized?.bestFor?.length
            ? remedyPayload.bestFor.slice(0, 3)
            : [`Created for ${context.focusLabel.toLowerCase()}`],
          warnings: normalized?.warnings || [],
        },
      });
    } catch (error) {
      console.error("Failed to generate custom remedy", error);
      const fallback = buildLocalGeneratedRemedy({
        seedText: suggestedSeed,
        context,
        activeTag,
      });
      const normalized = normalizeGeneratedRemedy(fallback, suggestedSeed);

      setGeneratedRemedy({
        ...normalized,
        insight: {
          score: 998,
          reasons: fallback.bestFor?.length
            ? fallback.bestFor.slice(0, 3)
            : [`Selected locally for ${context.focusLabel.toLowerCase()}`],
          warnings: fallback.warnings || [],
        },
      });
      setGeneratedError(error.message || "Could not generate a custom remedy right now.");
    } finally {
      setAiBusy(false);
    }
  };

  const focusMembersLabel =
    selectedMemberId === "family"
      ? "Whole Family"
      : `${members.find((member) => member._id === selectedMemberId)?.name || "Selected"} Profile`;

  const cardFocusLabel =
    selectedMemberId === "family" ? "Family-aware" : "Profile-aware";

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
            Find trusted Ayurvedic remedies tailored to your family's health history, 
            or let AI craft a custom solution for your exact symptoms.
          </p>
        </Motion.div>

        <Motion.div 
          className="hero-panel"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <label className="hero-field">
            <span>Focus</span>
            <select
              value={selectedMemberId}
              onChange={handleFocusChange}
            >
              <option value="family">Whole Family</option>
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <label className="hero-field hero-field--search">
            <span>Search or symptom</span>
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
            <p>Filtered by health history & safety</p>
          </div>
        </div>

        <div className="context-pills">
          {context.summaryPills.length > 0 ? (
            context.summaryPills.map((pill) => <span key={pill}>{pill}</span>)
          ) : (
            <span className="safe-pill"><Sparkles size={14} style={{ display: "inline-block", verticalAlign: "text-bottom", marginRight: "4px" }} /> No active risk flags</span>
          )}
        </div>
      </Motion.section>

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

      <section className="remedies-grid">
        <article className="generator-card">
          {aiBusy ? (
            <div className="generator-state">
              <Loader2 className="spin" size={34} />
              <h3>Building your remedy...</h3>
              <p>Matching symptom keywords, safety context, and remedy patterns for "{suggestedSeed}".</p>
            </div>
          ) : generatedRemedy ? (
            <>
              {generatedError ? <div className="warning-callout">{generatedError}</div> : null}
              <RemedyCard
                remedy={generatedRemedy}
                onOpen={setOpenRecipe}
                onShare={shareRemedy}
                onToggleFavorite={handleToggleFavorite}
                favorite={favorites.includes(generatedRemedy.id)}
                focusLabel={cardFocusLabel}
              />
            </>
          ) : (
            <div className="generator-state">
              <div className="generator-orb">
                <Sparkles size={26} />
              </div>
              <h3>Create Custom Remedy</h3>
              <p>
                Search a symptom above, then generate a focused remedy using the local remedy engine with built-in caution checks.
              </p>
              <button className="action-button action-button--primary" onClick={handleGenerateRemedy}>
                <Sparkles size={14} />
                Generate Now
              </button>
              {generatedError && <div className="warning-callout">{generatedError}</div>}
            </div>
          )}
        </article>

        {rankedRemedies.map((remedy) => (
          <RemedyCard
            key={remedy.id}
            remedy={remedy}
            onOpen={setOpenRecipe}
            onShare={shareRemedy}
            onToggleFavorite={handleToggleFavorite}
            favorite={favorites.includes(remedy.id)}
            focusLabel={cardFocusLabel}
          />
        ))}
      </section>

      {rankedRemedies.length === 0 && (
        <div className="empty-state">
          <h3>No remedies matched your filters.</h3>
          <p>Try a different symptom, or let Gemini generate a custom remedy.</p>
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
