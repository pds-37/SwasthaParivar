import React from "react";
import { Calendar, Clock, Repeat, Trash2, User } from "lucide-react";
import "./ReminderCard.css";

const categoryColors = {
  medicine: "#3b82f6",
  vaccination: "#10b981",
  checkup: "#8b5cf6",
  custom: "#f59e0b",
};

const computeDaysLeft = (nextDate) => {
  const now = new Date();
  const diff = new Date(nextDate) - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const computeProgress = (nextDate) => {
  const now = new Date();
  const target = new Date(nextDate);
  const daysLeft = Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
  return daysLeft <= 30 ? Math.round((1 - daysLeft / 30) * 100) : 10;
};

const heatColor = (daysLeft) => {
  if (daysLeft <= 0) return "#ef4444";
  if (daysLeft <= 3) return "#fb923c";
  if (daysLeft <= 7) return "#f59e0b";
  if (daysLeft <= 14) return "#facc15";
  return "#10b981";
};

const ProgressCircle = ({ percent, size = 52 }) => {
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="reminder-progress">
      <circle cx="24" cy="24" r="18" className="reminder-progress__track" />
      <circle
        cx="24"
        cy="24"
        r="18"
        className="reminder-progress__bar"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        transform="rotate(-90 24 24)"
      />
      <text x="24" y="28" textAnchor="middle">
        {percent}%
      </text>
    </svg>
  );
};

const ReminderCard = ({ reminder, onDelete, onEdit }) => {
  const nextDue = new Date(reminder.nextRunAt);
  const daysLeft = computeDaysLeft(nextDue);
  const progress = computeProgress(nextDue);
  const urgencyColor = heatColor(daysLeft);
  const categoryColor = categoryColors[reminder.category] || "#94a3b8";
  const recurringLabel = reminder.frequency && reminder.frequency !== "once"
    ? reminder.frequency.toUpperCase()
    : reminder.recurring?.type
      ? reminder.recurring.type.toUpperCase()
      : null;

  return (
    <article className="reminder-card" style={{ "--urgency": urgencyColor, "--category": categoryColor }}>
      <div className="reminder-card__progress">
        <ProgressCircle percent={progress} />
      </div>

      <div className="reminder-card__content">
        <div className="reminder-card__top">
          <div>
            <h3>{reminder.title}</h3>
            <div className="reminder-card__meta-row">
              <span className="reminder-card__person">
                <User size={14} />
                {reminder.memberName || reminder.member?.name || "Family member"}
              </span>
              <span className="reminder-card__category">
                {reminder.category?.toUpperCase() || "CUSTOM"}
              </span>
              {recurringLabel && (
                <span className="reminder-card__repeat">
                  <Repeat size={14} />
                  {recurringLabel}
                </span>
              )}
            </div>
          </div>

          <div className="reminder-card__actions">
            <button type="button" className="reminder-card__icon reminder-card__icon--edit" onClick={() => onEdit?.(reminder)}>
              Edit
            </button>
            <button type="button" className="reminder-card__icon reminder-card__icon--delete" onClick={() => onDelete?.(reminder._id)}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="reminder-card__info-grid">
          <div className="reminder-card__info">
            <Calendar size={14} />
            <div>
              <span className="reminder-card__label">Next due</span>
              <strong>{nextDue.toLocaleString()}</strong>
            </div>
          </div>

          <div className="reminder-card__info">
            <Clock size={14} />
            <div>
              <span className="reminder-card__label">Timeline</span>
              <strong>{daysLeft <= 0 ? "Due today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}</strong>
            </div>
          </div>
        </div>

        {reminder.description && (
          <div className="reminder-card__note">{reminder.description}</div>
        )}
      </div>
    </article>
  );
};

export default ReminderCard;
