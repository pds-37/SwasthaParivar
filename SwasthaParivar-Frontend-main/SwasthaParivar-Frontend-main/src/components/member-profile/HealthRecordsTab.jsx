import React from "react";
import { EmptyState } from "../ui";

const HealthRecordsTab = ({ records }) => {
  if (!records.length) {
    return (
      <EmptyState
        heading="No health records yet"
        description="Add snapshots from the Health page to start building this member's timeline."
      />
    );
  }

  return (
    <div className="member-profile__list">
      {records.map((record) => (
        <article key={record.date} className="card member-profile__list-card">
          <strong>{new Date(record.date).toLocaleString()}</strong>
          <p className="text-body-sm">
            {Object.entries(record)
              .filter(([key]) => key !== "date")
              .map(([key, value]) => `${key}: ${value}`)
              .join(" | ")}
          </p>
        </article>
      ))}
    </div>
  );
};

export default HealthRecordsTab;
