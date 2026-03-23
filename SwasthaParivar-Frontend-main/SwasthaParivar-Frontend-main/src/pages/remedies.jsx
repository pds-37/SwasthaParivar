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
  source: "ai",
});

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

  useEffect(() => {
    localStorage.setItem("remedy_favs", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    let cancelled = false;

    const loadMembers = async () => {
      try {
        const data = await api.get("/members");
        if (!cancelled) {
          setMembers(Array.isArray(data) ? data : []);
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

  const handleGenerateRemedy = async () => {
    setAiBusy(true);
    setGeneratedError("");
    setGeneratedRemedy(null);

    try {
      const response = await api.post("/remedies/generate", {
        query: suggestedSeed,
        memberId: selectedMemberId,
      });

      const normalized = normalizeGeneratedRemedy(response?.remedy, suggestedSeed);
      setGeneratedRemedy({
        ...normalized,
        insight: {
          score: 999,
          reasons: response?.remedy?.bestFor?.length
            ? response.remedy.bestFor.slice(0, 3)
            : [`Created for ${context.focusLabel.toLowerCase()}`],
          warnings: response?.remedy?.warnings || [],
        },
      });
    } catch (error) {
      console.error("Failed to generate custom remedy", error);
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
        <div className="hero-copy">
          <div className="hero-kicker">
            <Leaf size={18} />
            Remedies
            <span className="hero-badge">Care Edition</span>
          </div>
          <h1>Remedies ranked by safety, memory, and family context.</h1>
          <p>
            Search symptoms, explore recommendations shaped by your family&apos;s
            latest health patterns, and generate a custom Ayurvedic option with
            built-in care context when you need something more specific.
          </p>
        </div>

        <div className="hero-panel">
          <label className="hero-field">
            <span>Focus</span>
            <select
              value={selectedMemberId}
              onChange={(event) => setSelectedMemberId(event.target.value)}
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
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </label>

          <button className="generate-button" onClick={handleGenerateRemedy}>
            {aiBusy ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
            Generate New Remedy
          </button>
        </div>
      </section>

      <section className="context-strip">
        <div className="context-card">
          <div className="context-card__icon">
            <Users size={18} />
          </div>
          <div>
            <strong>{focusMembersLabel}</strong>
            <p>Recommendations are ranked using safety signals, history, and saved family health data.</p>
          </div>
        </div>

        <div className="context-pills">
          {context.summaryPills.length > 0 ? (
            context.summaryPills.map((pill) => <span key={pill}>{pill}</span>)
          ) : (
            <span>No major risk flags yet. Showing balanced preventive remedies.</span>
          )}
        </div>
      </section>

      <section className="tag-strip">
        {tagOptions.map((tag) => (
          <button
            key={tag}
            className={`tag-pill ${activeTag === tag ? "active" : ""}`}
            onClick={() => setActiveTag(tag)}
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
              <h3>Consulting Ancient Wisdom...</h3>
              <p>Using Gemini to craft a personalized Ayurvedic remedy for "{suggestedSeed}".</p>
            </div>
          ) : generatedRemedy ? (
            <RemedyCard
              remedy={generatedRemedy}
              onOpen={setOpenRecipe}
              onShare={shareRemedy}
              onToggleFavorite={handleToggleFavorite}
              favorite={favorites.includes(generatedRemedy.id)}
              focusLabel={cardFocusLabel}
            />
          ) : (
            <div className="generator-state">
              <div className="generator-orb">
                <Sparkles size={26} />
              </div>
              <h3>Create Custom Remedy</h3>
              <p>
                Search a symptom above, then generate a new remedy tailored to the current focus with built-in caution checks.
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
