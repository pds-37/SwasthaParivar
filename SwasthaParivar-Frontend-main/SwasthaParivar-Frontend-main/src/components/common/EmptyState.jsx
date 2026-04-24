import React from "react";
import { Bell, FileText, HeartPulse, MessageSquare, Users } from "lucide-react";

import Button from "../ui/Button";
import "../ui/EmptyState.css";

const CONFIGS = {
  members: {
    icon: <Users size={20} />,
    title: "No family members yet",
    subtitle: "Add your first member to start tracking their health.",
    action: "Add member",
  },
  records: {
    icon: <HeartPulse size={20} />,
    title: "No health records",
    subtitle: "Start logging BP, sugar, or weight to see trends over time.",
    action: "Log first record",
  },
  reminders: {
    icon: <Bell size={20} />,
    title: "No reminders set",
    subtitle: "Never miss a medicine or checkup again.",
    action: "Create reminder",
  },
  reports: {
    icon: <FileText size={20} />,
    title: "No reports uploaded",
    subtitle: "Upload a blood test, X-ray, or any medical report for AI analysis.",
    action: "Upload report",
  },
  chat: {
    icon: <MessageSquare size={20} />,
    title: "Ask me anything health-related",
    subtitle:
      "I can help with symptoms, medicines, reports, and reminders, all with your family's profile in mind.",
    action: null,
  },
};

const buildDisplayCopy = ({ type, icon, title, subtitle, actionLabel }) => {
  const config = CONFIGS[type] || CONFIGS.members;

  return {
    icon: icon ?? config.icon,
    title: title ?? config.title,
    subtitle: subtitle ?? config.subtitle,
    action: actionLabel === undefined ? config.action : actionLabel,
  };
};

const EmptyState = ({ type, onAction, icon, title, subtitle, actionLabel }) => {
  const copy = buildDisplayCopy({ type, icon, title, subtitle, actionLabel });

  return (
    <div className="ui-empty-state">
      {copy.icon ? <div className="ui-empty-state__icon">{copy.icon}</div> : null}
      <div className="ui-empty-state__heading">{copy.title}</div>
      <div className="ui-empty-state__description">{copy.subtitle}</div>
      {copy.action && onAction ? (
        <Button variant="primary" onClick={onAction}>
          {copy.action}
        </Button>
      ) : null}
    </div>
  );
};

export default EmptyState;
