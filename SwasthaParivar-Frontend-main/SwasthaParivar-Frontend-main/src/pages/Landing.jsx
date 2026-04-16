import React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bell,
  BrainCircuit,
  CircleHelp,
  HeartPulse,
  Shield,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import Navigation from "../components/Navigation";
import { howToUseNote, howToUseSteps } from "../lib/howToUse";
import { Button } from "../components/ui";
import "./Landing.css";

const features = [
  {
    icon: Bell,
    title: "Smarter reminders",
    text: "Medication, checkup, vaccination, and follow-up reminders stay organized by person and priority.",
  },
  {
    icon: BrainCircuit,
    title: "Family-aware AI care",
    text: "AI guidance can use family context like allergies, medications, conditions, and prior activity.",
  },
  {
    icon: Stethoscope,
    title: "Home-to-clinic continuity",
    text: "Reports, wellness insights, and next steps stay connected so doctor conversations are easier.",
  },
];

const trustItems = [
  "Built for families",
  "Multi-member care tracking",
  "Designed for daily household use",
  "Clear care context at a glance",
];

const Landing = () => {
  return (
    <div className="landing-page">
      <Navigation variant="public" />

      <main className="landing-main">
        <section className="landing-hero" id="home">
          <div className="landing-hero__copy">
            <span className="landing-kicker">
              <Sparkles size={16} />
              Family health, guided together
            </span>
            <h1 className="text-h1">Care for every family member, all in one place.</h1>
            <p className="text-body-lg">
              SwasthaParivar brings reminders, records, reports, remedies, and AI guidance into
              one connected care system that helps your whole family stay organized, safer, and on track.
            </p>

            <div className="landing-hero__actions">
              <Button as={Link} to="/auth?mode=signup" size="lg" rightIcon={<ArrowRight size={18} />}>
                Get started
              </Button>
              <Button as="a" href="#features" variant="secondary" size="lg">
                Explore features
              </Button>
            </div>

            <div className="landing-hero__stats">
              <div className="landing-stat">
                <strong>24/7</strong>
                <span>AI household support</span>
              </div>
              <div className="landing-stat">
                <strong>1 app</strong>
                <span>for reminders, records, and reports</span>
              </div>
              <div className="landing-stat">
                <strong>Family-first</strong>
                <span>care context across every member</span>
              </div>
            </div>
          </div>

          <div className="landing-hero__visual" aria-hidden="true">
            <div className="landing-cluster landing-cluster--primary">
              <div className="landing-cluster__badge">
                <HeartPulse size={16} />
                Household pulse
              </div>
              <strong>2 reminders due today</strong>
              <span>1 report ready for AI summary</span>
            </div>
            <div className="landing-cluster landing-cluster--secondary">
              <Shield size={16} />
              Safer care context
            </div>
            <div className="landing-cluster landing-cluster--accent">
              <Activity size={16} />
              Records, reminders, reports
            </div>
            <div className="landing-orbit landing-orbit--one" />
            <div className="landing-orbit landing-orbit--two" />
          </div>
        </section>

        <section className="landing-trust" aria-label="Trust bar">
          {trustItems.map((item) => (
            <span key={item} className="landing-trust__pill">
              {item}
            </span>
          ))}
        </section>

        <section className="landing-features" id="features">
          <div className="landing-section-head">
            <span className="eyebrow">Why it works</span>
            <h2 className="text-h2">Built for real family care, not just symptom chat.</h2>
            <p className="text-body-md">
              Every surface is designed to reduce friction, improve continuity, and make household
              health management feel simpler.
            </p>
          </div>

          <div className="landing-feature-grid">
            {features.map((feature) => (
              <article key={feature.title} className="landing-feature-card card card-hover">
                <div className="landing-feature-card__icon">
                  <feature.icon size={20} />
                </div>
                <h3 className="text-h4">{feature.title}</h3>
                <p className="text-body-sm">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-howto" id="how-to-use">
          <div className="landing-section-head">
            <span className="eyebrow">How to use</span>
            <h2 className="text-h2">A simple care flow your family can follow every day.</h2>
            <p className="text-body-md">
              SwasthaParivar works best when you keep care context updated, switch to the right family
              member, and use remedies and AI as guided support instead of guesswork.
            </p>
          </div>

          <div className="landing-howto__grid">
            {howToUseSteps.map((step, index) => (
              <article key={step.title} className="landing-howto__card card card-hover">
                <span className="landing-howto__step">Step {index + 1}</span>
                <h3 className="text-h4">{step.title}</h3>
                <p className="text-body-sm">{step.text}</p>
              </article>
            ))}
          </div>

          <div className="landing-howto__note">
            <CircleHelp size={18} />
            <span>{howToUseNote}</span>
          </div>
        </section>

        <section className="landing-cta">
          <div>
            <span className="eyebrow">Built for Indian families</span>
            <h2 className="text-h2">Ready to turn care chaos into one clear family system?</h2>
            <p className="text-body-md">
              Start with reminders, records, and AI guidance now, then grow into the full care
              intelligence layer as your family uses the app.
            </p>
          </div>
          <Button as={Link} to="/auth?mode=signin" size="lg" variant="secondary">
            Launch SwasthaParivar
          </Button>
        </section>
      </main>

      <footer className="landing-footer">
        <div>
          <strong>SwasthaParivar</strong>
          <p>Family health, reminders, records, and AI care in one connected household system.</p>
        </div>
        <nav className="landing-footer__nav" aria-label="Footer navigation">
          <Link to="/">Home</Link>
          <a href="#features">Features</a>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/auth?mode=signin">Login</Link>
        </nav>
        <div className="landing-footer__meta">
          <a href="https://x.com" target="_blank" rel="noreferrer">
            X
          </a>
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <span>Copyright 2026 SwasthaParivar</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
