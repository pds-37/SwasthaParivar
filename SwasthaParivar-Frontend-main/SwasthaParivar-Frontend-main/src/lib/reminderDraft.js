export const REMINDER_DRAFT_KEY = "swastha_reminder_draft";

export const toLocalDateTimeValue = (value) => {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);

  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(Date.now() + 60 * 60 * 1000);
    return toLocalDateTimeValue(fallback);
  }

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
};

export const saveReminderDraft = ({
  title,
  description = "",
  category = "medicine",
  frequency = "daily",
  selectedMembers = [],
  memberName = "",
  nextRunAt,
} = {}) => {
  if (typeof window === "undefined") return;

  const draft = {
    title: String(title || "").trim(),
    description: String(description || "").trim(),
    category,
    frequency,
    selectedMembers: Array.isArray(selectedMembers) ? selectedMembers.filter(Boolean) : [],
    memberName: String(memberName || "").trim(),
    nextRunAt: toLocalDateTimeValue(nextRunAt),
  };

  window.localStorage.setItem(REMINDER_DRAFT_KEY, JSON.stringify(draft));
};

export const readReminderDraft = () => {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(REMINDER_DRAFT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(REMINDER_DRAFT_KEY);
    return null;
  }
};

export const clearReminderDraft = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(REMINDER_DRAFT_KEY);
};
