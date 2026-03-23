import React from "react";
import { EmptyState } from "../ui";

const RemindersTab = ({ reminders }) => {
  if (!reminders.length) {
    return (
      <EmptyState
        heading="No reminders for this member"
        description="When reminders are assigned to this member, they will show up here."
      />
    );
  }

  return (
    <div className="member-profile__list">
      {reminders.map((reminder) => (
        <article key={reminder._id} className="card member-profile__list-card">
          <strong>{reminder.title}</strong>
          <p className="text-body-sm">
            {reminder.category} | {reminder.nextRunAt ? new Date(reminder.nextRunAt).toLocaleString() : "No time"}
          </p>
        </article>
      ))}
    </div>
  );
};

export default RemindersTab;
