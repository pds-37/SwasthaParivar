import React, { useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { 
  ArrowLeft, 
  Clock, 
  BarChart, 
  ShieldCheck, 
  AlertTriangle,
  Sparkles,
  Share2
} from "lucide-react";
import { motion as Motion } from "framer-motion";

import REMEDIES_DATA from "../data/remedies.js";
import "./PublicRemedyDetail.css";

export default function PublicRemedyDetail() {
  const { id } = useParams();
  
  const remedy = useMemo(() => {
    return REMEDIES_DATA.find(r => r.id === id);
  }, [id]);

  if (!remedy) {
    return <Navigate to="/remedy-library" replace />;
  }

  const structuredData = {
    "@context": "https://schema.org/",
    "@type": "Recipe",
    "name": remedy.name,
    "description": remedy.description,
    "recipeIngredient": remedy.ingredients,
    "recipeInstructions": remedy.steps.map(step => ({ "@type": "HowToStep", "text": step })),
    "prepTime": `PT${remedy.timeMins}M`,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": remedy.rating,
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": "150"
    }
  };

  return (
    <div className="remedy-detail">
      <Helmet>
        <title>{remedy.name} | Natural Ayurvedic Remedy | SwasthaParivar</title>
        <meta name="description" content={`Learn how to prepare ${remedy.name} for ${remedy.symptoms}. Full Ayurvedic recipe, ingredients, and safety tips for your family.`} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="container">
        <Link to="/remedy-library" className="back-link">
          <ArrowLeft size={16} />
          Back to Library
        </Link>

        <article className="remedy-article">
          <header 
            className="article-header"
            style={{ background: `linear-gradient(135deg, ${remedy.colorFrom}, ${remedy.colorTo})` }}
          >
            <Motion.div 
              className="header-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="tags">
                {remedy.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
              <h1>{remedy.name}</h1>
              <p className="subtitle">Traditional Ayurvedic Preparation</p>
            </Motion.div>
          </header>

          <div className="article-body">
            <section className="quick-stats">
              <div className="stat-card">
                <Clock size={20} />
                <div>
                  <label>Prep Time</label>
                  <strong>{remedy.timeMins} Mins</strong>
                </div>
              </div>
              <div className="stat-card">
                <BarChart size={20} />
                <div>
                  <label>Difficulty</label>
                  <strong>{remedy.difficulty}</strong>
                </div>
              </div>
              <div className="stat-card">
                <ShieldCheck size={20} />
                <div>
                  <label>Rating</label>
                  <strong>{remedy.rating} / 5.0</strong>
                </div>
              </div>
            </section>

            <div className="grid-main">
              <div className="main-content">
                <section className="section">
                  <h2>Description</h2>
                  <p>{remedy.description}</p>
                </section>

                <section className="section">
                  <h2>Ingredients</h2>
                  <ul className="ingredient-list">
                    {remedy.ingredients.map(ing => (
                      <li key={ing}>{ing}</li>
                    ))}
                  </ul>
                </section>

                <section className="section">
                  <h2>Preparation Steps</h2>
                  <ol className="step-list">
                    {remedy.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </section>
              </div>

              <aside className="sidebar">
                <div className="sidebar-card ayurveda-card">
                  <div className="card-head">
                    <Sparkles size={18} />
                    <h3>Ayurvedic Insight</h3>
                  </div>
                  <p>{remedy.ayurveda}</p>
                </div>

                <div className="sidebar-card safety-card">
                  <div className="card-head">
                    <AlertTriangle size={18} />
                    <h3>Safety Disclaimer</h3>
                  </div>
                  <p>
                    These remedies are traditional home-care suggestions. 
                    They are not a replacement for professional medical advice. 
                    Always consult your doctor for persistent symptoms.
                  </p>
                </div>

                <div className="promo-card">
                  <h3>Get Family-Aware Recommendations</h3>
                  <p>Sign up to see which of these 2500+ remedies are safe for your specific family members based on age and conditions.</p>
                  <Link to="/auth?mode=signup" className="button button-primary">
                    Create Free Profile
                  </Link>
                </div>
              </aside>
            </div>
          </div>

          <footer className="article-footer">
            <button className="share-button" onClick={() => window.print()}>
              <Share2 size={16} />
              Print Recipe
            </button>
          </footer>
        </article>
      </div>
    </div>
  );
}
