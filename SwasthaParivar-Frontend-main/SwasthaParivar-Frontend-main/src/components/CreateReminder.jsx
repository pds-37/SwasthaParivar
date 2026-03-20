import React, { useEffect, useState } from "react";
import api from "../lib/api";
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

  const resetForm = () => {
    setTitle(EMPTY_FORM.title);
    setDescription(EMPTY_FORM.description);
    setCategory(EMPTY_FORM.category);
    setMemberId(EMPTY_FORM.memberId);
    setFrequency(EMPTY_FORM.frequency);
    setTime(EMPTY_FORM.time);
    setNextRunAt(EMPTY_FORM.nextRunAt);
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
    };

    if (existing?._id) {
      await api.put(`/reminders/${existing._id}`, payload);
    } else {
      await api.post("/reminders", payload);
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
            Keep medicines, vaccinations, and checkups cleanly scheduled for every family member.
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
