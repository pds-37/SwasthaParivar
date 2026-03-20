import React from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Bell, BrainCircuit, HeartPulse, Play, Shield } from "lucide-react";
import Navigation from "../components/Navigation";
import "./Landing.css";

const featureCards = [
  {
    icon: HeartPulse,
    title: "Health Tracking",
    text: "Monitor vitals, sleep, and physical activity with easy-to-read charts and daily logs.",
    accent: "teal",
  },
  {
    icon: Shield,
    title: "Smart Reminders",
    text: "Never miss a dose or vaccination again. Automated notifications keep the whole family on track.",
    accent: "violet",
  },
  {
    icon: BrainCircuit,
    title: "Ayurvedic AI",
    text: "Get personalized home remedies and diet tips guided by Ayurvedic wellness patterns.",
    accent: "amber",
  },
];

const Landing = () => {
  return (
    <div className="landing-page">
      <Navigation variant="public" />

      <main className="landing-shell">
        <section className="landing-hero" id="home">
          <div className="landing-hero-pattern" />
          <div className="landing-hero-glow" />

          <div className="landing-hero-content">
            <span className="landing-badge">Ayurvedic AI Wellness</span>

            <h1 className="landing-title">
              Holistic Health for the
              <span> Entire Family</span>
            </h1>

            <p className="landing-subtitle">
              Manage medicines, track vaccinations, and discover personalized
              Ayurvedic remedies, all in one secure place.
            </p>

            <div className="landing-actions">
              <Link to="/auth" className="landing-btn primary">
                Get Started Free
                <ArrowRight size={18} />
              </Link>

              <a href="#features" className="landing-btn secondary">
                <Play size={16} fill="currentColor" />
                View Demo
              </a>
            </div>

            <div className="landing-mini-points">
              <span>
                <Bell size={15} />
                Smart reminders
              </span>
              <span>
                <Activity size={15} />
                Family health tracking
              </span>
              <span>
                <BrainCircuit size={15} />
                AI wellness guidance
              </span>
            </div>
          </div>
        </section>

        <section className="landing-features" id="features">
          <div className="landing-section-head">
            <h2>Everything you need for wellness</h2>
            <p>Powered by MERN Stack & Ayurvedic Intelligence</p>
          </div>

          <div className="landing-feature-grid">
            {featureCards.map((card) => (
              <article key={card.title} className={`landing-feature-card ${card.accent}`}>
                <div className="landing-feature-icon">
                  <card.icon size={24} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>Copyright 2026 SwasthaParivar. All rights reserved.</p>
        <span>Scalable MERN Architecture</span>
      </footer>
    </div>
  );
};

export default Landing;
