import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Alert } from "@mui/material";

const DISCLAIMER_COPY = {
  EMERGENCY: {
    severity: "error",
    text: "Emergency signals detected. Call 112 immediately.",
  },
  HIGH: {
    severity: "error",
    text: "This requires urgent medical attention. Please consult a doctor today.",
  },
  MODERATE: {
    severity: "warning",
    text: "Please follow up with a doctor. AI guidance is not a substitute for medical care.",
  },
  LOW: {
    severity: "info",
    text: "AI guidance only, not a diagnosis. Consult a doctor if symptoms persist.",
  },
  default: {
    severity: "info",
    text: "SwasthaParivar AI provides guidance, not medical diagnosis or treatment.",
  },
};

export default function AiDisclaimer({ riskLevel }) {
  const { severity, text } = DISCLAIMER_COPY[riskLevel] || DISCLAIMER_COPY.default;

  return (
    <Alert
      severity={severity}
      icon={<InfoOutlinedIcon fontSize="small" />}
      sx={{ fontSize: 12, py: 0.5, borderRadius: 2, mb: 1 }}
    >
      {text}
    </Alert>
  );
}
