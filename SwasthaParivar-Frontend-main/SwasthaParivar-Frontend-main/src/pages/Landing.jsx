import React from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Bell, BrainCircuit, FileHeart, HeartPulse, Play, Shield, Sparkles, Stethoscope } from "lucide-react";
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

const heroStats = [
  { value: "24/7", label: "AI care advisor" },
  { value: "1", label: "shared family memory" },
  { value: "6h / 24h / 48h", label: "smart follow-up loops" },
];

const visualCards = [
  {
    icon: FileHeart,
    title: "Report Memory",
    text: "Camera uploads become usable care context.",
    className: "is-report",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    text: "Dose, follow-up, and clinic tasks stay synced.",
    className: "is-reminder",
  },
  {
    icon: Stethoscope,
    title: "Doctor Handoff",
    text: "Escalations turn into a clean summary packet.",
    className: "is-doctor",
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

          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <span className="landing-badge">
                <Sparkles size={15} />
                AI Household Care Platform
              </span>

              <h1 className="landing-title">
                One care graph for every family health decision.
              </h1>

              <p className="landing-subtitle">
                SwasthaParivar connects reminders, vitals, uploaded reports,
                remedy outcomes, and doctor handoffs into one proactive care
                workspace that feels curated for each family member.
              </p>

              <div className="landing-actions">
                <Link to="/auth" className="landing-btn primary">
                  Launch Care Workspace
                  <ArrowRight size={18} />
                </Link>

                <a href="#features" className="landing-btn secondary">
                  <Play size={16} fill="currentColor" />
                  Explore the Flow
                </a>
              </div>

              <div className="landing-hero-stats">
                {heroStats.map((item) => (
                  <div key={item.label} className="landing-stat">
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
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
                  Personalized AI care guidance
                </span>
              </div>
            </div>

            <div className="landing-visual" aria-hidden="true">
              <div className="landing-visual-grid" />
              <div className="landing-orbit">
                <div className="landing-orbit-ring landing-orbit-ring--outer" />
                <div className="landing-orbit-ring landing-orbit-ring--inner" />

                <div className="landing-core-card">
                  <div className="landing-core-card__icon">
                    <BrainCircuit size={24} />
                  </div>
                  <span>AI Care Brain</span>
                  <strong>Personalized family memory, safety, and follow-up in one loop.</strong>
                </div>

                {visualCards.map((card) => (
                  <article key={card.title} className={`landing-floating-card ${card.className}`}>
                    <div className="landing-floating-card__icon">
                      <card.icon size={18} />
                    </div>
                    <div>
                      <h3>{card.title}</h3>
                      <p>{card.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-features" id="features">
          <div className="landing-section-head">
            <h2>Built for real household care, not just chat answers</h2>
            <p>From home remedies to doctor continuity, every step stays connected.</p>
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
