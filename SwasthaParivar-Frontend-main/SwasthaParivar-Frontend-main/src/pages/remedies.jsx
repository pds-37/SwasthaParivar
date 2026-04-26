import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ChevronDown,
  Heart,
  Leaf,
  Loader2,
  Search,
  Share2,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { motion as Motion } from "framer-motion";

import REMEDIES_DATA from "../data/remedies.js";
import api from "../lib/api";
import notify from "../lib/notify";
import {
  buildCatalog,
  buildRemedyContext,
  decorateRemedyForContext,
  getAllRemedyTags,
  getSeriousSymptomMatch,
} from "../lib/remedyInsights";
import { useFamilyStore } from "../store/family-store";
import "./remedies.css";

const createGradient = (from = "var(--color-primary-strong)", to = "var(--color-primary)") =>
  `linear-gradient(135deg, ${from}, ${to})`;

const uniqueTextList = (items = []) => Array.from(new Set(items.filter(Boolean)));

const LOCAL_GENERATOR_TEMPLATES = [
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
    colorFrom: "#8b6dd8",
    colorTo: "#5c4bb7",
  },
  {
    match: /(digestion|bloating|gas|constipation|metabolic|stomach|acidity|indigestion)/i,
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
    colorFrom: "#f2b349",
    colorTo: "#d08a16",
  },
  {
    match: /(pain|joint|inflammation|stiff|body ache|body pain|muscle pain)/i,
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
    colorFrom: "#f0ab3d",
    colorTo: "#df7c18",
  },
  {
    match: /(hydration|skin|pitta|heat|summer|headache)/i,
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
      "Cumin and lemon can help support Agni and reduce digestive heaviness when paired with balanced meals and movement.",
    colorFrom: "#f0ab3d",
    colorTo: "#d08a16",
  },
  {
    match: /(hair fall|hair loss|weak roots|skin dullness)/i,
    name: "Curry Leaf Nourish Drink",
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
    colorFrom: "#1f9c90",
    colorTo: "#0d6a65",
  },
  {
    match: /.*/i,
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
    colorFrom: "#1f9c90",
    colorTo: "#0d6a65",
  },
];

const normalizeGeneratedRemedy = (payload, seedText, source = "guided-local") => ({
  id: payload?.id || `${source}-${Date.now()}`,
  name: payload?.name || `Custom ${seedText} Remedy`,
  description:
    payload?.description ||
    `A family-aware custom remedy created for ${seedText}.`,
  symptoms: payload?.symptoms || seedText,
  ingredients: Array.isArray(payload?.ingredients) ? payload.ingredients : [],
  steps: Array.isArray(payload?.steps) ? payload.steps : [],
  rating: Number(payload?.rating || 4.8),
  tags: Array.isArray(payload?.tags) && payload.tags.length > 0 ? payload.tags : [seedText],
  timeMins: Number(payload?.timeMins || 10),
  difficulty: payload?.difficulty || "Easy",
  ayurveda: payload?.ayurveda || "",
  warnings: Array.isArray(payload?.warnings) ? payload.warnings : [],
  colorFrom: payload?.colorFrom || "var(--color-primary-strong)",
  colorTo: payload?.colorTo || "var(--color-primary)",
  source: payload?.source || source,
});

const applyContextSafety = (remedy, context) => {
  const adjusted = {
    ...remedy,
    ingredients: [...(remedy.ingredients || [])],
    warnings: [...(remedy.warnings || [])],
  };

  const removeByPattern = (pattern, warning) => {
    const before = adjusted.ingredients.length;
    adjusted.ingredients = adjusted.ingredients.filter((ingredient) => !pattern.test(ingredient));
    if (adjusted.ingredients.length !== before && warning) {
      adjusted.warnings.push(warning);
    }
  };

  if (context.flags.diabetes || context.flags.highSugar) {
    removeByPattern(
      /\bhoney|jaggery|sugar syrup|sugar|banana\b/i,
      "Sweeteners were removed because this profile is sugar-sensitive."
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

  if (context.flags.highBp) {
    removeByPattern(
      /\blicorice|mulethi|salt\b/i,
      "Blood-pressure-sensitive ingredients were removed for this profile."
    );
  }

  adjusted.warnings = uniqueTextList(adjusted.warnings);
  return adjusted;
};

const buildLocalGeneratedRemedy = ({ seedText, context }) => {
  const template =
    LOCAL_GENERATOR_TEMPLATES.find((entry) => entry.match.test(seedText)) ||
    LOCAL_GENERATOR_TEMPLATES[LOCAL_GENERATOR_TEMPLATES.length - 1];

  return normalizeGeneratedRemedy(
    applyContextSafety(
      {
        ...template,
        source: "guided-local",
      },
      context
    ),
    seedText,
    "guided-local"
  );
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
    <article className="remedy-card">
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
              Generated
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

        {remedy.insight?.reasons?.length > 0 && (
          <div className="remedy-card__reasons">
            {remedy.insight.reasons.slice(0, 2).map((reason) => (
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
        ) : null}

        <div className="remedy-card__actions">
          <button className="action-button action-button--primary" onClick={() => onOpen(remedy)}>
            View recipe
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
  const {
    members: householdMembers,
    selfMember,
    selectedMember,
    activeView,
  } = useFamilyStore();
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
  const generatedSectionRef = useRef(null);

  const resetGeneratedState = () => {
    setGeneratedRemedy(null);
    setGeneratedError("");
  };

  const members = useMemo(() => {
    const seen = new Set();
    return [selfMember, ...(Array.isArray(householdMembers) ? householdMembers : [])].filter((member) => {
      if (!member?._id || seen.has(member._id)) return false;
      seen.add(member._id);
      return true;
    });
  }, [householdMembers, selfMember]);

  useEffect(() => {
    localStorage.setItem("remedy_favs", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (activeView === "self" && selfMember?._id) {
      setSelectedMemberId(selfMember._id);
      return;
    }

    if (selectedMember?._id && members.some((member) => member._id === selectedMember._id)) {
      setSelectedMemberId((previous) => (previous === "family" ? selectedMember._id : previous));
    }
  }, [activeView, members, selectedMember?._id, selfMember?._id]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenRecipe(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!generatedRemedy || !generatedSectionRef.current) return;

    generatedSectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [generatedRemedy]);

  const context = useMemo(
    () => buildRemedyContext(members, selectedMemberId),
    [members, selectedMemberId]
  );

  const tagOptions = useMemo(
    () => getAllRemedyTags(REMEDIES_DATA, context.recommendedTags),
    [context.recommendedTags]
  );

  const querySeriousMatch = useMemo(
    () => getSeriousSymptomMatch(query),
    [query]
  );
  const seriousMatch = querySeriousMatch;
  const seriousSymptomText = query;

  const rankedRemedies = useMemo(() => {
    if (seriousMatch) return [];
    return buildCatalog(REMEDIES_DATA, context, query, activeTag);
  }, [activeTag, context, query, seriousMatch]);

  const fallbackRemedies = useMemo(() => {
    if (seriousMatch) return [];
    return buildCatalog(REMEDIES_DATA, context, "", activeTag === "All" ? "All" : activeTag).slice(0, 6);
  }, [activeTag, context, seriousMatch]);

  const visibleRemedies = rankedRemedies.length > 0 ? rankedRemedies : fallbackRemedies;
  const hasCatalogFilters = Boolean(query.trim()) || activeTag !== "All";
  const showingNearestMatches =
    hasCatalogFilters &&
    visibleRemedies.length > 0 &&
    visibleRemedies.every((remedy) => remedy.insight?.fallbackMatch);
  const generationSeed =
    query.trim() ||
    (activeTag !== "All" ? activeTag : context.recommendedTags[0] || "daily immunity");

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

    if (nextQuery.trim()) {
      setActiveTag("All");
    }

    if (generatedRemedy || generatedError) {
      resetGeneratedState();
    }
  };

  const handleTagSelect = (tag) => {
    setActiveTag(tag);
    setQuery("");
    resetGeneratedState();
  };

  const clearFilters = () => {
    setQuery("");
    setActiveTag("All");
    resetGeneratedState();
  };

  const handleGenerateRemedy = async () => {
    const seedText = String(generationSeed || "").trim();

    if (!seedText) {
      setGeneratedError("Enter symptoms or choose a tag first.");
      return;
    }

    const redFlagMatch = getSeriousSymptomMatch(seedText);
    if (redFlagMatch) {
      openFamilyAI(seedText);
      return;
    }

    setAiBusy(true);
    setGeneratedError("");
    setGeneratedRemedy(null);

    try {
      const response = await api.post("/remedies/generate", {
        query: seedText,
        memberId: selectedMemberId,
      });

      const normalized = normalizeGeneratedRemedy(
        response?.remedy || response,
        seedText,
        "guided-api"
      );
      const decorated = decorateRemedyForContext(normalized, context, seedText);
      setGeneratedRemedy(decorated);
      setOpenRecipe(decorated);
      notify.success("Generated a new remedy");
    } catch (error) {
      const fallback = buildLocalGeneratedRemedy({ seedText, context });
      const decorated = decorateRemedyForContext(fallback, context, seedText);
      setGeneratedRemedy(decorated);
      setOpenRecipe(decorated);
      setGeneratedError(
        error?.message || "Live remedy generation is unavailable right now. Showing a guided local remedy instead."
      );
    } finally {
      setAiBusy(false);
    }
  };

  const focusMembersLabel =
    selectedMemberId === "family"
      ? "Whole family profile check"
      : `${members.find((member) => member._id === selectedMemberId)?.name || "Selected"} profile check`;

  const resultsTitle = showingNearestMatches
    ? "Nearest safe matches"
    : hasCatalogFilters
      ? "Matched remedies"
      : "Recommended remedies";

  const resultsDescription = showingNearestMatches
    ? "No exact match was found, so these are the closest safe remedies for the current profile."
    : hasCatalogFilters
      ? "Ranked by symptom fit, selected tag, and family safety checks."
      : "Profile-aware options from the family remedy catalog.";

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

          <div className="hero-panel__actions">
            <button className="action-button action-button--primary" onClick={handleGenerateRemedy}>
              {aiBusy ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              Create custom remedy
            </button>
          </div>

          {generatedError ? (
            <div className="hero-feedback hero-feedback--warning">
              <AlertTriangle size={14} />
              <span>{generatedError}</span>
            </div>
          ) : null}
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

      {!seriousMatch && generatedRemedy ? (
        <section ref={generatedSectionRef} className="generated-remedy-section">
          <section className="remedies-results-header">
            <div>
              <div className="remedies-results-title">
                <h2>Freshly generated</h2>
                <span>1 custom remedy</span>
              </div>
              <p>
                Built for {context.focusLabel.toLowerCase()} using the current symptom focus and family safety checks.
              </p>
            </div>
            <button className="action-button action-button--ghost" onClick={resetGeneratedState}>
              Dismiss
            </button>
          </section>

          <section className="remedies-grid">
            <RemedyCard
              remedy={generatedRemedy}
              onOpen={setOpenRecipe}
              onShare={shareRemedy}
              onToggleFavorite={handleToggleFavorite}
              favorite={favorites.includes(generatedRemedy.id)}
            />
          </section>
        </section>
      ) : null}

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
          <div className="triage-panel__actions">
            <button className="action-button action-button--ghost" onClick={clearFilters}>
              Clear symptoms
            </button>
            <button className="action-button action-button--primary" onClick={() => openFamilyAI(seriousSymptomText)}>
              Open Family AI
            </button>
          </div>
        </section>
      ) : null}

      {!seriousMatch ? (
        <>
          <section className="remedies-results-header">
            <div>
              <div className="remedies-results-title">
                <h2>{resultsTitle}</h2>
                <span>{visibleRemedies.length} {visibleRemedies.length === 1 ? "match" : "matches"}</span>
              </div>
              <p>{resultsDescription}</p>
            </div>
            {hasCatalogFilters ? (
              <button className="action-button action-button--ghost" onClick={clearFilters}>
                Reset filters
              </button>
            ) : null}
          </section>

          <section className="remedies-grid">
            {visibleRemedies.map((remedy) => (
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

          {visibleRemedies.length === 0 ? (
            <div className="empty-state">
              <h3>No safe remedies matched.</h3>
              <p>Reset the filters or ask Family AI for a safer next step.</p>
            </div>
          ) : null}
        </>
      ) : null}

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
