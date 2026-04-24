import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  LinearProgress,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";

import { useAuth } from "../auth-context";
import notify from "../../lib/notify";
import api from "../../lib/api";
import { useFamilyStore } from "../../store/family-store";
import { trackEvent } from "../../utils/analytics";

const STEPS = ["Welcome", "Add first member", "Set your first reminder"];
const RELATIONSHIP_LABELS = {
  self: "Self",
  spouse: "Spouse",
  child: "Child",
  parent: "Parent",
  sibling: "Sibling",
  other: "Other",
};

const buildInitialMember = (user) => ({
  name: user?.fullName || "",
  age: "",
  gender: "male",
  relationship: "self",
  conditions: [],
  medications: [],
  allergies: [],
});

const computeNextRunAt = (time) => {
  const [hours, minutes] = String(time || "08:00")
    .split(":")
    .map((value) => Number(value || 0));
  const nextRunAt = new Date();
  nextRunAt.setHours(hours, minutes, 0, 0);

  if (nextRunAt.getTime() <= Date.now()) {
    nextRunAt.setDate(nextRunAt.getDate() + 1);
  }

  return nextRunAt.toISOString();
};

export default function OnboardingWizard({ open, onComplete }) {
  const { user } = useAuth();
  const { selfMember, members, refreshMembers } = useFamilyStore();
  const [step, setStep] = useState(0);
  const [member, setMember] = useState(() => buildInitialMember(user));
  const [conditionInput, setConditionInput] = useState("");
  const [reminderType, setReminderType] = useState("medicine");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderTime, setReminderTime] = useState("08:00");
  const [savedMemberId, setSavedMemberId] = useState(null);
  const [savingMember, setSavingMember] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setMember(buildInitialMember(user));
    setConditionInput("");
    setReminderType("medicine");
    setReminderTitle("");
    setReminderTime("08:00");
    setSavedMemberId(null);
    setSavingMember(false);
    setFinishing(false);
  }, [open, user]);

  const shouldUpdateSelfMember = useMemo(
    () => member.relationship === "self" && Boolean(selfMember?._id),
    [member.relationship, selfMember?._id]
  );

  const handleAddCondition = () => {
    const nextCondition = conditionInput.trim();
    if (!nextCondition) return;

    setMember((current) => ({
      ...current,
      conditions: current.conditions.includes(nextCondition)
        ? current.conditions
        : [...current.conditions, nextCondition],
    }));
    setConditionInput("");
  };

  const handleAddMember = async () => {
    setSavingMember(true);
    try {
      const payload = {
        name: member.name.trim(),
        age: Number(member.age),
        gender: member.gender,
        relation: RELATIONSHIP_LABELS[member.relationship] || member.relationship,
        conditions: member.conditions,
        medications: member.medications,
        allergies: member.allergies,
      };

      let savedMember = null;

      if (shouldUpdateSelfMember) {
        savedMember = await api.patch(`/members/${selfMember._id}/profile`, payload);
      } else {
        savedMember = await api.post("/members", payload);
      }

      trackEvent("onboarding_member_saved", {
        relationship: member.relationship,
        is_self_profile: shouldUpdateSelfMember,
      });
      setSavedMemberId(savedMember?._id || selfMember?._id || null);
      await refreshMembers?.();
      setStep(2);
    } catch (error) {
      notify.error(error.message || "Could not save member details");
    } finally {
      setSavingMember(false);
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const fallbackMemberId = shouldUpdateSelfMember ? selfMember?._id : members[0]?._id || null;
      if (reminderTitle.trim()) {
        await api.post("/reminders", {
          title: reminderTitle.trim(),
          description: "",
          category: reminderType,
          memberId: savedMemberId || fallbackMemberId || null,
          frequency: "daily",
          options: { time: reminderTime },
          nextRunAt: computeNextRunAt(reminderTime),
        });
      }

      const updatedUser = await api.patch("/auth/me", { onboardingComplete: true });
      trackEvent("onboarding_completed", {
        created_first_reminder: Boolean(reminderTitle.trim()),
        reminder_type: reminderType,
      });
      onComplete?.(updatedUser);
    } catch (error) {
      notify.error(error.message || "Could not finish onboarding");
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth disableEscapeKeyDown onClose={() => {}}>
      <LinearProgress variant="determinate" value={(step / 2) * 100} />
      <DialogContent sx={{ p: 4 }}>
        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {step === 0 ? (
          <Box textAlign="center">
            <Typography variant="h5" fontWeight={600} mb={1}>
              Welcome to SwasthaParivar
            </Typography>
            <Typography color="text.secondary" mb={4}>
              Your family&apos;s health, organised in one place. Let&apos;s set things up in under
              2 minutes.
            </Typography>
            <Button variant="contained" size="large" onClick={() => setStep(1)}>
              Get started
            </Button>
          </Box>
        ) : null}

        {step === 1 ? (
          <Box>
            <Typography variant="h6" mb={3}>
              Who are you managing health for?
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Name"
                value={member.name}
                onChange={(event) =>
                  setMember((current) => ({ ...current, name: event.target.value }))
                }
                fullWidth
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Age"
                  type="number"
                  value={member.age}
                  onChange={(event) =>
                    setMember((current) => ({ ...current, age: event.target.value }))
                  }
                  fullWidth
                />
                <TextField
                  select
                  label="Gender"
                  value={member.gender}
                  onChange={(event) =>
                    setMember((current) => ({ ...current, gender: event.target.value }))
                  }
                  fullWidth
                >
                  {["male", "female", "other"].map((gender) => (
                    <MenuItem key={gender} value={gender}>
                      {gender}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <TextField
                select
                label="Relationship"
                value={member.relationship}
                onChange={(event) =>
                  setMember((current) => ({ ...current, relationship: event.target.value }))
                }
                fullWidth
              >
                {["self", "spouse", "child", "parent", "sibling", "other"].map((relationship) => (
                  <MenuItem key={relationship} value={relationship}>
                    {relationship}
                  </MenuItem>
                ))}
              </TextField>

              <Box>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Existing conditions (optional, press Enter to add)
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mb={1}>
                  {member.conditions.map((condition) => (
                    <Chip
                      key={condition}
                      label={condition}
                      size="small"
                      onDelete={() =>
                        setMember((current) => ({
                          ...current,
                          conditions: current.conditions.filter((value) => value !== condition),
                        }))
                      }
                    />
                  ))}
                </Stack>
                <TextField
                  size="small"
                  placeholder="e.g. Diabetes"
                  value={conditionInput}
                  onChange={(event) => setConditionInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddCondition();
                    }
                  }}
                  fullWidth
                />
              </Box>

              <Button
                variant="contained"
                disabled={!member.name.trim() || !member.age || savingMember}
                onClick={handleAddMember}
              >
                {savingMember ? "Saving..." : "Continue"}
              </Button>

              <Button size="small" color="inherit" onClick={() => setStep(2)}>
                Skip for now
              </Button>
            </Stack>
          </Box>
        ) : null}

        {step === 2 ? (
          <Box>
            <Typography variant="h6" mb={1}>
              Set your first reminder
            </Typography>
            <Typography color="text.secondary" mb={3}>
              Reminders are the most-used feature. Start with one.
            </Typography>

            <Stack spacing={2}>
              <TextField
                select
                label="Type"
                value={reminderType}
                onChange={(event) => setReminderType(event.target.value)}
                fullWidth
              >
                {["medicine", "vaccination", "checkup"].map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Medicine / appointment name"
                value={reminderTitle}
                onChange={(event) => setReminderTitle(event.target.value)}
                fullWidth
              />

              <TextField
                label="Time"
                type="time"
                value={reminderTime}
                onChange={(event) => setReminderTime(event.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <Button variant="contained" onClick={handleFinish} disabled={finishing}>
                {finishing
                  ? "Finishing..."
                  : reminderTitle.trim()
                    ? "Save reminder & finish"
                    : "Skip & finish"}
              </Button>
            </Stack>
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
