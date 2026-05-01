import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { 
  Leaf, 
  Sparkles, 
  ChevronRight, 
  ShieldCheck,
  Search,
  Users,
  Clock,
  Heart
} from "lucide-react";
import { motion as Motion } from "framer-motion";

import REMEDIES_DATA from "../data/remedies.js";
import "./PublicRemedyLibrary.css";

const SECTORS = [
  { id: "cold_flu", label: "Cold & Flu", icon: "🤒", description: "Natural relief for cough, cold, and seasonal flu." },
  { id: "digestion", label: "Digestion", icon: "🥗", description: "Ayurvedic solutions for bloating, acidity, and gut health." },
  { id: "headache", label: "Headache & Pain", icon: "💆", description: "Soothing remedies for tension, migraines, and joint pain." },
  { id: "skin", label: "Skin & Hair", icon: "✨", description: "Herbal care for acne, hair fall, and glowing skin." },
  { id: "sleep", label: "Sleep & Energy", icon: "🌙", description: "Calming blends for insomnia and daytime fatigue." },
  { id: "stress", label: "Stress & Mood", icon: "🧘", description: "Adaptogenic herbs to balance anxiety and mental fatigue." },
  { id: "immunity", label: "Immunity", icon: "🛡️", description: "Traditional immunity boosters like Tulsi and Giloy." },
  { id: "women", label: "Women's Health", icon: "🌸", description: "Hormonal balance and period care through Ayurveda." },
];

export default function PublicRemedyLibrary() {
  const featuredRemedies = useMemo(() => {
    return REMEDIES_DATA.slice(0, 6);
  }, []);

  return (
    <div className="public-library">
      <Helmet>
        <title>Remedy Library | SwasthaParivar - Natural Ayurvedic Home Remedies</title>
        <meta name="description" content="Explore our comprehensive library of 2500+ Ayurvedic home remedies. Find natural treatments for cold, flu, digestion, stress, and more." />
        <meta name="keywords" content="ayurvedic remedies, home remedies, natural medicine, tulsi kadha, turmeric milk, herbal healing" />
        <link rel="canonical" href="https://swasthaparivar.app/remedy-library" />
      </Helmet>

      <section className="library-hero">
        <div className="lib-container">
          <Motion.div 
            className="hero-badge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Leaf size={16} />
            <span>Traditional Wisdom, Modern Care</span>
          </Motion.div>
          
          <Motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            The Family Remedy <span className="text-gradient">Encyclopedia</span>
          </Motion.h1>
          
          <Motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Discover over 2,500 safety-checked Ayurvedic remedies tailored for your household. 
            From seasonal colds to digestive wellness, find the right herb for the right time.
          </Motion.p>

          <Motion.div 
            className="hero-trust"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="trust-item">
              <ShieldCheck size={18} />
              <span>Safety Checked</span>
            </div>
            <div className="trust-item">
              <Users size={18} />
              <span>Family Aware</span>
            </div>
            <div className="trust-item">
              <Sparkles size={18} />
              <span>AI Enhanced</span>
            </div>
          </Motion.div>
        </div>
      </section>

      <section className="categories-section">
        <div className="lib-container">
          <div className="lib-section-header">
            <h2>Browse by Category</h2>
            <p>Select a health sector to explore targeted natural solutions.</p>
          </div>

          <div className="categories-grid">
            {SECTORS.map((sector, index) => (
              <Motion.div 
                key={sector.id}
                className="category-card"
                whileHover={{ y: -5 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="category-icon">{sector.icon}</div>
                <h3>{sector.label}</h3>
                <p>{sector.description}</p>
                <Link to={`/remedy-library/${sector.id}`} className="category-link">
                  Explore Remedies
                  <ChevronRight size={16} />
                </Link>
              </Motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="featured-section">
        <div className="lib-container">
          <div className="lib-section-header">
            <h2>Featured Remedies</h2>
            <p>Our most trusted and requested traditional recipes.</p>
          </div>

          <div className="remedies-grid">
            {featuredRemedies.map((remedy) => (
              <div key={remedy.id} className="remedy-snippet">
                <div 
                  className="snippet-header"
                  style={{ background: `linear-gradient(135deg, ${remedy.colorFrom}, ${remedy.colorTo})` }}
                >
                  <div className="rating">
                    <Heart size={14} fill="white" />
                    {remedy.rating}
                  </div>
                </div>
                <div className="snippet-body">
                  <div className="snippet-meta">
                    <Clock size={14} />
                    <span>{remedy.timeMins} mins</span>
                    <span className="dot">•</span>
                    <span>{remedy.difficulty}</span>
                  </div>
                  <h3>{remedy.name}</h3>
                  <p>{remedy.symptoms}</p>
                  <Link to={`/remedy/${remedy.id}`} className="view-link">
                    View Recipe
                  </Link>
                </div>
              </div>
            ))}
          </div>
          
          <div className="cta-block">
            <p>Looking for a personalized recommendation for your family?</p>
            <Link to="/auth?mode=signup" className="lib-button lib-button-primary">
              Join SwasthaParivar Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
