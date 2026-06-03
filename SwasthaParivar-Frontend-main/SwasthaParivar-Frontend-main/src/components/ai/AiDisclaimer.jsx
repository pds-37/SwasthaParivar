import { AlertTriangle, Info } from "lucide-react";

const DISCLAIMER_COPY = {
  EMERGENCY: {
    tone: "emergency",
    title: "Emergency warning",
    text: "Emergency signals detected. Call 112 immediately.",
  },
  HIGH: {
    tone: "high",
    title: "Urgent attention",
    text: "This requires urgent medical attention. Please consult a doctor today.",
  },
  MODERATE: {
    tone: "moderate",
    title: "Doctor follow-up",
    text: "Please follow up with a doctor. AI guidance is not a substitute for medical care.",
  },
  LOW: {
    tone: "low",
    title: "Guidance only",
    text: "AI guidance only, not a diagnosis. Consult a doctor if symptoms persist.",
  },
  default: {
    tone: "low",
    title: "Guidance only",
    text: "SwasthaParivar AI provides guidance, not medical diagnosis or treatment.",
  },
};

export default function AiDisclaimer({ riskLevel }) {
  const { tone, title, text } = DISCLAIMER_COPY[riskLevel] || DISCLAIMER_COPY.default;
  const Icon = tone === "emergency" || tone === "high" ? AlertTriangle : Info;

  return (
    <div className={`ai-disclaimer ai-disclaimer--${tone}`} role={tone === "low" ? "note" : "alert"}>
      <Icon size={16} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}
