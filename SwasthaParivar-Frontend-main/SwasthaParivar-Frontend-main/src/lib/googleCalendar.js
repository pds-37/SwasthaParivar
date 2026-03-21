const formatCalendarDate = (value) =>
  new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

export const buildGoogleCalendarUrl = ({
  title,
  description,
  start,
  durationMinutes = 30,
}) => {
  const startDate = new Date(start);
  const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title || "SwasthaParivar reminder",
    details: description || "Reminder created from SwasthaParivar",
    dates: `${formatCalendarDate(startDate)}/${formatCalendarDate(endDate)}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
