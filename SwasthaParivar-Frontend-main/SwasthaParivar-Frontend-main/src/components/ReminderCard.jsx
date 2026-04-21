import React from "react";
import { CalendarPlus, Clock3, Pill, Repeat, Stethoscope, Syringe, Trash2, Bell } from "lucide-react";

import { buildGoogleCalendarUrl } from "../lib/googleCalendar";
import { Button } from "./ui";
import "./ReminderCard.css";

const getStatus = (nextRunAt) => {
  const next = new Date(nextRunAt);
  return next < new Date() ? "missed" : "upcoming";
};

const ReminderCard = ({ reminder, onDelete, onEdit }) => {
  const status = getStatus(reminder.nextRunAt);

  return (
    <article className={`reminder-card card ${status === "missed" ? "is-overdue" : ""}`}>
      <div className="reminder-card__top">
        <div className="reminder-card__identity">
          <span className="avatar avatar--md">
            {reminder.category === "medicine" ? <Pill size={18} /> : 
             reminder.category === "vaccination" ? <Syringe size={18} /> :
             reminder.category === "checkup" ? <Stethoscope size={18} /> :
             <Bell size={18} />}
          </span>
          <div>
            <strong>{reminder.title}</strong>
            <span>{reminder.memberName || "Family member"}</span>
          </div>
        </div>

        <span className={`badge ${status === "missed" ? "badge--danger" : "badge--success"}`}>
          {status === "missed" ? "Missed" : "Upcoming"}
        </span>
      </div>

      <div className="reminder-card__meta">
        <span>
          <Clock3 size={14} />
          {new Date(reminder.nextRunAt).toLocaleString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>

        <span>
          <Repeat size={14} />
          {reminder.frequency || "once"}
        </span>
      </div>

      {reminder.description ? <p className="reminder-card__description">{reminder.description}</p> : null}

      {reminder.meta?.reportSummary ? (
        <div className="reminder-card__summary">
          <strong>AI report context</strong>
          <p>{reminder.meta.reportSummary}</p>
        </div>
      ) : null}

      <div className="reminder-card__actions">
        <Button variant="ghost" size="sm" onClick={() => onEdit?.(reminder)}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<CalendarPlus size={14} />}
          onClick={() =>
            window.open(
              buildGoogleCalendarUrl({
                title: reminder.title,
                description: [reminder.description, reminder.meta?.reportSummary].filter(Boolean).join("\n\n"),
                start: reminder.nextRunAt,
              }),
              "_blank",
              "noopener,noreferrer"
            )
          }
        >
          Calendar
        </Button>
        <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => onDelete?.(reminder._id)}>
          Delete
        </Button>
      </div>
    </article>
  );
};

export default ReminderCard;
