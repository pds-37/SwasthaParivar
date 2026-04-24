import { Chip } from "@mui/material";

const RISK_CONFIG = {
  LOW: { label: "Low risk", color: "success" },
  MODERATE: { label: "See a doctor", color: "warning" },
  HIGH: { label: "Urgent care", color: "error" },
  EMERGENCY: { label: "Emergency", color: "error" },
};

export default function RiskBadge({ level }) {
  if (!level || level === "UNKNOWN") {
    return null;
  }

  const { label, color } = RISK_CONFIG[level] || RISK_CONFIG.LOW;
  return <Chip label={label} color={color} size="small" sx={{ fontSize: 11, height: 22 }} />;
}
