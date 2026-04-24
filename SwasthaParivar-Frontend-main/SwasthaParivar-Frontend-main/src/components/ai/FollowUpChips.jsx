import AddAlarmIcon from "@mui/icons-material/AddAlarm";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import { Chip, Stack } from "@mui/material";

export default function FollowUpChips({
  followUpPrompt,
  suggestedReminder,
  onCreateReminder,
  onAskFollowUp,
  onFindDoctor,
}) {
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mt={1}>
      {suggestedReminder ? (
        <Chip
          icon={<AddAlarmIcon fontSize="small" />}
          label={`Set reminder: ${suggestedReminder.title}`}
          variant="outlined"
          size="small"
          clickable
          onClick={() => onCreateReminder?.(suggestedReminder)}
        />
      ) : null}

      {followUpPrompt ? (
        <Chip
          icon={<TrackChangesIcon fontSize="small" />}
          label="Track these symptoms"
          variant="outlined"
          size="small"
          clickable
          onClick={() => onAskFollowUp?.(followUpPrompt)}
        />
      ) : null}

      {onFindDoctor ? (
        <Chip
          icon={<LocalHospitalIcon fontSize="small" />}
          label="Find a doctor"
          variant="outlined"
          size="small"
          clickable
          onClick={() => onFindDoctor()}
        />
      ) : null}
    </Stack>
  );
}
