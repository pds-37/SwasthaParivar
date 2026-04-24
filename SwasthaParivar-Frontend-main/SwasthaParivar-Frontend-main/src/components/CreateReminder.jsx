import React, { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Camera, LoaderCircle, Sparkles } from "lucide-react";

import api from "../lib/api";
import ProfileAvatar from "./common/ProfileAvatar";
import { showUnlockedBadges } from "../lib/badges";
import { buildGoogleCalendarUrl } from "../lib/googleCalendar";
import notify from "../lib/notify";
import { clearReminderDraft, readReminderDraft, toLocalDateTimeValue } from "../lib/reminderDraft";
import { useFamilyStore } from "../store/family-store";
import { trackEvent } from "../utils/analytics";
import { Button, Checkbox, Input, Select, Textarea } from "./ui";
import "./CreateReminder.css";

const reminderTypes = [
  { value: "medicine", label: "Medicine" },
  { value: "vaccination", label: "Vaccination" },
  { value: "checkup", label: "Checkup" },
  { value: "followup", label: "Follow-up" },
  { value: "custom", label: "Custom" },
];

const frequencyOptions = [
  { value: "once", label: "One time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const fileToBase64Payload = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const [prefix, data] = result.split(",", 2);
      const mimeType = prefix.match(/data:(.*);base64/)?.[1] || file.type || "image/png";

      if (!data) {
        reject(new Error("Could not read attachment"));
        return;
      }

      resolve({
        data,
        mimeType,
        preview: result,
      });
    };

    reader.onerror = () => reject(new Error("Could not read attachment"));
    reader.readAsDataURL(file);
  });

const validateReminderForm = ({ title, nextRunAt, selectedMembers }) => {
  const nextErrors = {};

  if (!title.trim()) {
    nextErrors.title = "Reminder title is required.";
  }

  if (!selectedMembers.length) {
    nextErrors.selectedMembers = "Select at least one family member.";
  }

  if (!nextRunAt) {
    nextErrors.nextRunAt = "Choose the reminder date and time.";
  }

  return nextErrors;
};

const CreateReminder = ({ existing = null, refresh, cancel }) => {
  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || existing?.note || "");
  const [category, setCategory] = useState(existing?.category || "medicine");
  const [frequency, setFrequency] = useState(existing?.frequency || "once");
  const [time, setTime] = useState(existing?.options?.time || "09:00");
  const [nextRunAt, setNextRunAt] = useState(
    existing?.nextRunAt ? toLocalDateTimeValue(existing.nextRunAt) : ""
  );
  const [syncToCalendar, setSyncToCalendar] = useState(Boolean(existing?.meta?.syncToCalendar));
  const [selectedMembers, setSelectedMembers] = useState(existing?.memberId ? [existing.memberId] : []);
  const [reportPreview, setReportPreview] = useState(existing?.meta?.reportPreview || "");
  const [reportSummary, setReportSummary] = useState(existing?.meta?.reportSummary || "");
  const [reportFileName, setReportFileName] = useState(existing?.meta?.reportFileName || "");
  const [reportBusy, setReportBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const { members: householdMembers, selfMember, activeView } = useFamilyStore();
  const members = useMemo(
    () => (activeView === "self" ? (selfMember ? [selfMember] : []) : householdMembers),
    [activeView, householdMembers, selfMember]
  );

  useEffect(() => {
    if (existing) return;

    const draft = readReminderDraft();
    if (!draft) return;

    if (draft.title) setTitle(draft.title);
    if (draft.description) setDescription(draft.description);
    if (draft.category) setCategory(draft.category);
    if (draft.frequency) setFrequency(draft.frequency);
    if (draft.nextRunAt) setNextRunAt(draft.nextRunAt);
    if (Array.isArray(draft.selectedMembers)) setSelectedMembers(draft.selectedMembers);
  }, [existing]);

  useEffect(() => {
    if (activeView === "self" && selfMember?._id) {
      setSelectedMembers([selfMember._id]);
    }
  }, [activeView, selfMember?._id]);

  const selectedMemberNames = useMemo(
    () =>
      members
        .filter((member) => selectedMembers.includes(member._id))
        .map((member) => member.name)
        .join(", "),
    [members, selectedMembers]
  );

  const toggleMember = (memberId) => {
    if (activeView === "self") {
      return;
    }

    setSelectedMembers((previous) =>
      previous.includes(memberId)
        ? previous.filter((item) => item !== memberId)
        : [...previous, memberId]
    );
    setErrors((previous) => ({ ...previous, selectedMembers: "" }));
  };

  const analyzeReport = async (file) => {
    if (!file) return;

    setReportBusy(true);

    try {
      const payload = await fileToBase64Payload(file);
      setReportPreview(payload.preview);
      setReportFileName(file.name);

      if (file.type.startsWith("image/")) {
        const response = await api.post("/ai/attachments", {
          imageData: payload.data,
          mimeType: payload.mimeType,
          fileName: file.name,
          member: selectedMemberNames || "Family",
        });
        if (response?.isHealthReport === false) {
          setReportSummary("");
          notify.error(response.reason || "Please upload a genuine health report");
          return;
        }

        setReportSummary(response?.reply || "");
      } else {
        setReportSummary("Report attached successfully. PDF review will be validated when the reminder is saved.");
      }
    } catch {
      notify.error("Could not analyze the attached report");
    } finally {
      setReportBusy(false);
    }
  };

  const handleSubmit = async () => {
    const nextErrors = validateReminderForm({ title, nextRunAt, selectedMembers });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      notify.error("Please fix the highlighted reminder details");
      return;
    }

    const payload = {
      title,
      description,
      category,
      frequency,
      options: { time },
      nextRunAt,
      meta: {
        reportSummary,
        reportFileName,
        reportPreview,
        syncToCalendar,
      },
    };

    setSaving(true);

    try {
      if (existing?._id) {
        await api.put(`/reminders/${existing._id}`, {
          ...payload,
          memberId: selectedMembers[0],
        });
        trackEvent("reminder_updated", {
          category,
          frequency,
          selected_member_count: selectedMembers.length,
        });
      } else {
        const responses = await Promise.all(
          selectedMembers.map((memberId) =>
            api.post("/reminders", {
              ...payload,
              memberId,
            })
          )
        );
        showUnlockedBadges(responses.flatMap((response) => response?.newBadges || []));
        trackEvent("reminder_created", {
          category,
          frequency,
          selected_member_count: selectedMembers.length,
          synced_to_calendar: syncToCalendar,
          attached_report: Boolean(reportFileName),
        });
      }

      if (syncToCalendar) {
        window.open(
          buildGoogleCalendarUrl({
            title,
            description: [description, reportSummary].filter(Boolean).join("\n\n"),
            start: nextRunAt,
          }),
          "_blank",
          "noopener,noreferrer"
        );
      }

      notify.success(existing ? "Reminder updated" : "Reminder created");
      clearReminderDraft();
      refresh?.();
    } catch {
      notify.error("Could not save reminder");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="create-reminder-form">
      <div className="create-reminder-form__grid">
        <Input
          label="Title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setErrors((previous) => ({ ...previous, title: "" }));
          }}
          placeholder="Vitamin D after breakfast"
          error={errors.title}
        />

        <Select label="Reminder type" value={category} onChange={(event) => setCategory(event.target.value)}>
          {reminderTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>

        <Input
          label="Next run"
          type="datetime-local"
          value={nextRunAt}
          onChange={(event) => {
            setNextRunAt(event.target.value);
            setErrors((previous) => ({ ...previous, nextRunAt: "" }));
          }}
          error={errors.nextRunAt}
        />

        <Select label="Recurrence" value={frequency} onChange={(event) => setFrequency(event.target.value)}>
          {frequencyOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>

        <Input
          label="Preferred time"
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />

        <div className="create-reminder-form__field create-reminder-form__field--wide">
          <span className="label-md">{activeView === "self" ? "Self profile" : "Family members"}</span>
          <div className="create-reminder-members">
            {members.map((member) => (
              <button
                key={member._id}
                type="button"
                className={`create-reminder-member ${selectedMembers.includes(member._id) ? "is-active" : ""}`}
                onClick={() => toggleMember(member._id)}
                disabled={activeView === "self"}
              >
                <ProfileAvatar name={member.name} src={member.avatar} size="sm" />
                <span>{member.name}</span>
              </button>
            ))}
          </div>
          {errors.selectedMembers ? <span className="ui-field__error">{errors.selectedMembers}</span> : null}
        </div>

        <Textarea
          label="Description"
          rows={4}
          wrapperClassName="create-reminder-form__field--wide"
          placeholder="Optional care notes for this reminder"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <div className="create-reminder-form__field create-reminder-form__field--wide">
          <span className="label-md">Attach report</span>
          <label className="create-reminder-upload">
            <input
              type="file"
              accept=".pdf,image/*"
              capture="environment"
              onChange={(event) => analyzeReport(event.target.files?.[0])}
            />
            <div>
              <strong>{reportBusy ? "Analyzing report..." : "Capture or upload a report"}</strong>
              <p>Use camera or gallery so this reminder can carry AI-generated report context.</p>
            </div>
            <span className="create-reminder-upload__icon">
              {reportBusy ? <LoaderCircle size={18} className="spin" /> : <Camera size={18} />}
            </span>
          </label>
        </div>

        {reportPreview || reportSummary ? (
          <div className="create-reminder-report create-reminder-form__field--wide">
            {reportPreview ? <img src={reportPreview} alt={reportFileName || "Report preview"} loading="lazy" /> : null}
            <div>
              <span className="badge badge--primary">
                <Sparkles size={14} />
                AI summary
              </span>
              <strong>{reportFileName || "Attached report"}</strong>
              <p>{reportSummary || "Summary will appear here after processing."}</p>
            </div>
          </div>
        ) : null}

        <Checkbox
          className="create-reminder-form__field--wide"
          label="Also open Google Calendar after saving"
          helperText="Useful when you want the same care task both in the app and in your device calendar."
          checked={syncToCalendar}
          onChange={(event) => setSyncToCalendar(event.target.checked)}
        />
      </div>

      <div className="create-reminder-form__actions">
        <Button variant="secondary" onClick={cancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          leftIcon={<CalendarPlus size={16} />}
          onClick={handleSubmit}
          loading={saving}
        >
          {existing ? "Update reminder" : "Create reminder"}
        </Button>
      </div>
    </div>
  );
};

export default CreateReminder;
