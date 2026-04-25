import { CheckCircle2, Crown, Sparkles } from "lucide-react";

import { Button, Modal } from "../ui";
import "./UpgradePrompt.css";

const FEATURE_LABELS = {
  addMember: "Adding more family members",
  aiChat: "Unlimited AI health chats",
  reportAiAnalysis: "AI analysis for medical reports",
  plan: "Premium care tools",
};

const PRO_FEATURES = [
  "Unlimited family members",
  "Full health record history",
  "Unlimited AI health chats",
  "AI analysis for medical reports",
  "Proactive health trend alerts",
  "Doctor share PDF",
];

export default function UpgradePrompt({ open, onClose, featureName }) {
  const readableFeature =
    FEATURE_LABELS[featureName] || featureName || "Unlock the full SwasthaParivar experience";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      className="upgrade-prompt"
      title="Pro is coming soon"
      description={`${readableFeature} will be part of the upcoming Pro plan.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Maybe later
          </Button>
          <Button
            leftIcon={<Crown size={16} />}
            onClick={() => {
              window.open("/pricing", "_blank", "noopener,noreferrer");
            }}
          >
            View pricing
          </Button>
        </>
      }
    >
      <div className="upgrade-prompt__hero">
        <span className="upgrade-prompt__icon">
          <Sparkles size={20} />
        </span>
        <strong>Premium family care is on the way.</strong>
        <p>Pro will add richer records, deeper AI support, and stronger household follow-up tools.</p>
      </div>

      <div className="upgrade-prompt__features">
        {PRO_FEATURES.map((feature) => (
          <article key={feature} className="upgrade-prompt__feature">
            <CheckCircle2 size={16} />
            <span>{feature}</span>
          </article>
        ))}
      </div>

      <div className="upgrade-prompt__price">
        <small>Status</small>
        <strong>Coming soon</strong>
      </div>
    </Modal>
  );
}
