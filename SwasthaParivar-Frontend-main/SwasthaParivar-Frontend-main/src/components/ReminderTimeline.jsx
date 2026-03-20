// client/components/ReminderTimeline.jsx

import React from "react";
import ReminderCard from "./ReminderCard";

const TimelineSection = ({ title, items, onDelete, onEdit }) => {
  if (!items || items.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 18 }}>
      
      {/* LEFT TIMELINE BAR */}
      <div style={{ width: 40, display: "flex", flexDirection: "column", alignItems: "center" }}>
        
        {/* Section dot */}
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#2563eb",
            marginTop: 4,
          }}
        />

        {/* Vertical line */}
        <div
          style={{
            width: 3,
            flex: 1,
            background: "linear-gradient(#93c5fd, transparent)",
            marginTop: 4,
          }}
        />
      </div>

      {/* RIGHT CONTENT */}
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 20, color: "#0f172a" }}>
          {title}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((r) => (
            <div key={r._id}>
              <ReminderCard reminder={r} onDelete={onDelete} onEdit={onEdit} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ReminderTimeline = ({ groups, onDelete, onEdit }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <TimelineSection
        title="Today"
        items={groups["Today"]}
        onDelete={onDelete}
        onEdit={onEdit}
      />

      <TimelineSection
        title="This Week"
        items={groups["This Week"]}
        onDelete={onDelete}
        onEdit={onEdit}
      />

      <TimelineSection
        title="Later"
        items={groups["Later"]}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    </div>
  );
};

export default ReminderTimeline;
