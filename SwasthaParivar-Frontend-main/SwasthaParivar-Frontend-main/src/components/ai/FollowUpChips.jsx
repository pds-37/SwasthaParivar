import { AlarmPlus, Hospital, Target } from "lucide-react";

const FollowUpButton = ({ icon, label, onClick }) => {
  const IconComponent = icon;
  return (
    <button type="button" className="ai-followup-chip" onClick={onClick}>
      <IconComponent size={15} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
};

export default function FollowUpChips({
  followUpPrompt,
  suggestedReminder,
  onCreateReminder,
  onAskFollowUp,
  onFindDoctor,
}) {
  return (
    <div className="ai-followup-chips">
      {suggestedReminder ? (
        <FollowUpButton
          icon={AlarmPlus}
          label={`Set reminder: ${suggestedReminder.title}`}
          onClick={() => onCreateReminder?.(suggestedReminder)}
        />
      ) : null}

      {followUpPrompt ? (
        <FollowUpButton
          icon={Target}
          label="Track these symptoms"
          onClick={() => onAskFollowUp?.(followUpPrompt)}
        />
      ) : null}

      {onFindDoctor ? (
        <FollowUpButton
          icon={Hospital}
          label="Find a doctor"
          onClick={() => onFindDoctor()}
        />
      ) : null}
    </div>
  );
}
