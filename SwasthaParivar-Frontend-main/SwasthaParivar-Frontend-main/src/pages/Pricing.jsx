import React from "react";
import { CheckCircle2, Crown, HeartHandshake, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "../components/ui";

const plans = [
  {
    name: "Free",
    price: "Rs 0",
    subtitle: "Launch access with core care tools unlocked",
    features: [
      "Unlimited family profiles during launch",
      "Full health history during launch",
      "Unlimited AI health chats during launch",
      "AI report analysis and trend alerts during launch",
    ],
  },
  {
    name: "Pro",
    price: "Coming soon",
    subtitle: "Premium family care is on the way",
    features: [
      "Unlimited family members",
      "Unlimited AI health chats",
      "Full health history",
      "AI report analysis",
      "Trend alerts and premium tools",
    ],
    featured: true,
    comingSoon: true,
  },
  {
    name: "Family",
    price: "Coming soon",
    subtitle: "Shared-household billing is on the way",
    features: [
      "Everything in Pro",
      "Shared family workspace",
      "Supports up to 5 users",
      "Ideal for coordinated caregiving",
    ],
    comingSoon: true,
  },
];

const Pricing = () => (
  <div className="app-shell" style={{ maxWidth: "72rem", margin: "0 auto", paddingBlock: "2rem" }}>
    <section
      className="card"
      style={{
        display: "grid",
        gap: "1rem",
        padding: "1.5rem",
        marginBottom: "1.5rem",
        background:
          "radial-gradient(circle at top left, color-mix(in srgb, var(--color-primary-soft) 82%, transparent), transparent 56%), var(--color-surface)",
      }}
    >
      <span className="eyebrow">
        <Sparkles size={16} />
        Pricing
      </span>
      <h1 className="text-h1">Choose the plan that matches your family's care rhythm.</h1>
      <p className="text-body-lg">
        Core features are unlocked during launch while paid plans and household billing are being finalized.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <Button as={Link} to="/dashboard" leftIcon={<HeartHandshake size={16} />}>
          Open dashboard
        </Button>
        <Button as={Link} to="/settings" variant="secondary">
          Manage account
        </Button>
      </div>
    </section>

    <section
      style={{
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
      }}
    >
      {plans.map((plan) => (
        <article
          key={plan.name}
          className="card"
          style={{
            display: "grid",
            gap: "1rem",
            padding: "1.5rem",
            border: plan.featured
              ? "1px solid color-mix(in srgb, var(--color-primary) 32%, var(--color-border))"
              : undefined,
            boxShadow: plan.featured ? "var(--shadow-md)" : undefined,
          }}
        >
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {plan.featured ? <Crown size={18} /> : <Sparkles size={18} />}
              <strong>{plan.name}</strong>
            </div>
            <span className="text-h3">{plan.price}</span>
            <p className="muted-copy">{plan.subtitle}</p>
          </div>

          <div style={{ display: "grid", gap: "0.75rem" }}>
            {plan.features.map((feature) => (
              <div key={feature} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={16} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <Button
            as={Link}
            to="/settings"
            variant={plan.featured && !plan.comingSoon ? "primary" : "secondary"}
            disabled={plan.comingSoon}
          >
            {plan.comingSoon ? "Coming soon" : plan.featured ? "Choose Pro" : "Review in settings"}
          </Button>
        </article>
      ))}
    </section>
  </div>
);

export default Pricing;
