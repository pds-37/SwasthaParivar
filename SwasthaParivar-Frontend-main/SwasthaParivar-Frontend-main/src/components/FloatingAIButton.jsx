import React from "react";
import { MessageSquareText, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import "./FloatingAIButton.css";

const FloatingAIButton = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (
    location.pathname.startsWith("/ai-chat") ||
    location.pathname === "/dashboard" ||
    location.pathname === "/"
  ) {
    return null;
  }

  return (
    <button
      type="button"
      className="floating-ai-button"
      onClick={() => navigate("/ai-chat")}
      aria-label="Open AI chat"
    >
      <span className="floating-ai-button__halo" aria-hidden="true" />
      <span className="floating-ai-button__icon">
        <MessageSquareText size={18} />
      </span>
      <span className="floating-ai-button__copy">
        <strong>Ask AI</strong>
        <small>Symptoms, medicines, reports</small>
      </span>
      <span className="floating-ai-button__spark">
        <Sparkles size={14} />
      </span>
    </button>
  );
};

export default FloatingAIButton;
