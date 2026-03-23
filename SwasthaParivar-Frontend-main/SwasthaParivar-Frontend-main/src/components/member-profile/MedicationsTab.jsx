import React from "react";
import { BellPlus } from "lucide-react";
import { Button, EmptyState } from "../ui";

const MedicationsTab = ({ member, onSuggestReminder }) => {
  if (!member.medications?.length) {
    return (
      <EmptyState
        heading="No medications saved"
        description="Medication details added to a member profile will appear here."
      />
    );
  }

  return (
    <div className="member-profile__list">
      {member.medications.map((item) => (
        <article key={item} className="card member-profile__list-card">
          <strong>{item}</strong>
          <p className="text-body-sm">Stored in the member's medication context for safer AI suggestions.</p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<BellPlus size={16} />}
            onClick={() => onSuggestReminder?.(item)}
          >
            Set reminder
          </Button>
        </article>
      ))}
    </div>
  );
};

export default MedicationsTab;
