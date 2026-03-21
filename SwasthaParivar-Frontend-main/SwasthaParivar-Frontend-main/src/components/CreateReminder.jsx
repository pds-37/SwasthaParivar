import React, { useEffect, useMemo, useState } from "react";
import { Camera, CalendarPlus, LoaderCircle, Sparkles } from "lucide-react";
import api from "../lib/api";
import { buildGoogleCalendarUrl } from "../lib/googleCalendar";
import "./CreateReminder.css";

const getInitialForm = (existing = null) => ({
  title: existing?.title || "",
  description: existing?.description || existing?.desc || existing?.note || "",
  category: existing?.category || "medicine",
  memberId: existing?.memberId || existing?.member?._id || "",
  frequency: existing?.frequency || existing?.recurring?.type || "once",
  time: existing?.options?.time || "09:00",
  nextRunAt: existing?.nextRunAt
    ? new Date(existing.nextRunAt).toISOString().slice(0, 16)
    : "",
});

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
        fileName: file.name,
      });
    };

    reader.onerror = () => reject(new Error("Could not read attachment"));
    reader.readAsDataURL(file);
  });

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "medicine",
  memberId: "",
  frequency: "once",
  time: "09:00",
  nextRunAt: "",
};

const CreateReminder = ({ existing = null, refresh, cancel }) => {
  const initialForm = getInitialForm(existing);
  const [title, setTitle] = useState(initialForm.title);
  const [description, setDescription] = useState(initialForm.description);
  const [category, setCategory] = useState(initialForm.category);
  const [memberId, setMemberId] = useState(initialForm.memberId);
  const [members, setMembers] = useState([]);
  const [frequency, setFrequency] = useState(initialForm.frequency);
  const [time, setTime] = useState(initialForm.time);
  const [nextRunAt, setNextRunAt] = useState(initialForm.nextRunAt);
  const [reportPreview, setReportPreview] = useState(existing?.meta?.reportPreview || "");
  const [reportSummary, setReportSummary] = useState(existing?.meta?.reportSummary || "");
  const [reportFileName, setReportFileName] = useState(existing?.meta?.reportFileName || "");
  const [reportBusy, setReportBusy] = useState(false);
  const [syncToCalendar, setSyncToCalendar] = useState(Boolean(existing?.meta?.syncToCalendar));

  const selectedMember = useMemo(
    () => members.find((member) => member._id === memberId),
    [memberId, members]
  );

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await api.get("/members");
        setMembers(Array.isArray(response) ? response : response?.members || []);
      } catch (error) {
        console.error("Failed to fetch members", error);
        setMembers([]);
      }
    };

    fetchMembers();
  }, []);

  useEffect(() => () => {
    if (reportPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(reportPreview);
    }
  }, [reportPreview]);

  const resetForm = () => {
    setTitle(EMPTY_FORM.title);
    setDescription(EMPTY_FORM.description);
    setCategory(EMPTY_FORM.category);
    setMemberId(EMPTY_FORM.memberId);
    setFrequency(EMPTY_FORM.frequency);
    setTime(EMPTY_FORM.time);
    setNextRunAt(EMPTY_FORM.nextRunAt);
    setReportPreview("");
    setReportSummary("");
    setReportFileName("");
    setSyncToCalendar(false);
  };

  const analyzeReport = async (file) => {
    if (!file) return;

    setReportBusy(true);
    setReportFileName(file.name);
    if (reportPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(reportPreview);
    }
    setReportPreview(URL.createObjectURL(file));

    try {
      const payload = await fileToBase64Payload(file);
      const response = await api.post("/ai/attachments", {
        imageData: payload.data,
        mimeType: payload.mimeType,
        fileName: payload.fileName,
        member: selectedMember?.name || "Family member",
      });

      const summary = response?.reply || "";
      setReportSummary(summary);

      if (!description) {
        setDescription(summary);
      }
    } catch (error) {
      console.error("Failed to analyze report", error);
      alert("Could not analyze the uploaded report right now.");
    } finally {
      setReportBusy(false);
    }
  };

  const submit = async () => {
    if (!title) return alert("Title required");
    if (!nextRunAt) return alert("Select next run date and time");
    if (!memberId) return alert("Select a family member");

    const payload = {
      title,
      description,
      category,
      memberId,
      frequency,
      options: { time },
      nextRunAt,
      meta: {
        reportSummary,
        reportFileName,
        syncToCalendar,
      },
    };

    if (existing?._id) {
      await api.put(`/reminders/${existing._id}`, payload);
    } else {
      await api.post("/reminders", payload);
    }

    if (syncToCalendar) {
      const googleUrl = buildGoogleCalendarUrl({
        title,
        description: [description, reportSummary].filter(Boolean).join("\n\n"),
        start: nextRunAt,
      });
      window.open(googleUrl, "_blank", "noopener,noreferrer");
    }

    resetForm();
    refresh();
  };

  return (
    <section className="create-reminder surface-card">
      <div className="create-reminder__head">
        <div>
          <p className="create-reminder__eyebrow">
            {existing ? "Edit Reminder" : "Create Reminder"}
          </p>
          <h2>{existing ? "Update scheduled care" : "Add a new care task"}</h2>
          <p className="muted-copy">
            Keep medicines, vaccinations, checkups, and report-driven follow-ups organized for every family member.
          </p>
        </div>
      </div>

      <div className="create-reminder__grid">
        <label className="create-reminder__field create-reminder__field--wide">
          <span>Title</span>
          <input
            type="text"
            placeholder="Vaccination dose 2"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="create-reminder__field create-reminder__field--wide">
          <span>Description</span>
          <textarea
            placeholder="Optional notes for the reminder"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <label className="create-reminder__field">
          <span>Reminder Type</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="medicine">Medicine</option>
            <option value="vaccination">Vaccination</option>
            <option value="checkup">Checkup</option>
            <option value="custom">Custom</option>
          </select>
        </label>

        <label className="create-reminder__field">
          <span>Family Member</span>
          <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
            <option value="">Select member</option>
            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className="create-reminder__field">
          <span>Frequency</span>
          <select value={frequency} onChange={(event) => setFrequency(event.target.value)}>
            <option value="once">One time</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>

        <label className="create-reminder__field">
          <span>Time</span>
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>

        <label className="create-reminder__field create-reminder__field--wide">
          <span>Next Run</span>
          <input
            type="datetime-local"
            value={nextRunAt}
            onChange={(event) => setNextRunAt(event.target.value)}
          />
        </label>

        <div className="create-reminder__field create-reminder__field--wide">
          <span>Attach a report from camera or gallery</span>
          <label className="create-reminder__upload">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => analyzeReport(event.target.files?.[0])}
            />
            <div className="create-reminder__upload-copy">
              <div className="create-reminder__upload-icon">
                {reportBusy ? <LoaderCircle size={18} className="spin" /> : <Camera size={18} />}
              </div>
              <div>
                <strong>{reportBusy ? "Analyzing report..." : "Capture or upload a report"}</strong>
                <p>
                  Save lab slips, prescriptions, or reports so AI can turn them into reminder context.
                </p>
              </div>
            </div>
          </label>
        </div>

        {(reportPreview || reportSummary) && (
          <div className="create-reminder__field create-reminder__field--wide">
            <span>AI report summary</span>
            <div className="create-reminder__report-panel">
              {reportPreview && (
                <img
                  src={reportPreview}
                  alt={reportFileName || "Uploaded report"}
                  className="create-reminder__report-preview"
                />
              )}
              <div className="create-reminder__report-copy">
                <div className="create-reminder__report-chip">
                  <Sparkles size={14} />
                  {reportFileName || "Report attached"}
                </div>
                <p>{reportSummary || "The uploaded report will be summarized here."}</p>
              </div>
            </div>
          </div>
        )}

        <label className="create-reminder__calendar-toggle create-reminder__field--wide">
          <input
            type="checkbox"
            checked={syncToCalendar}
            onChange={(event) => setSyncToCalendar(event.target.checked)}
          />
          <div>
            <strong>
              <CalendarPlus size={16} />
              Also open Google Calendar after save
            </strong>
            <span>Useful when you want the same reminder in both the app and calendar.</span>
          </div>
        </label>
      </div>

      <div className="create-reminder__actions">
        {cancel && (
          <button type="button" className="create-reminder__btn create-reminder__btn--ghost" onClick={cancel}>
            Cancel
          </button>
        )}
        <button type="button" className="create-reminder__btn create-reminder__btn--primary" onClick={submit}>
          {existing ? "Update Reminder" : "Create Reminder"}
        </button>
      </div>
    </section>
  );
};

export default CreateReminder;
