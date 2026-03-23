import React, { useState } from "react";
import { ShieldPlus, UserRound } from "lucide-react";
import notify from "../lib/notify";
import { Button, Checkbox, Input, Modal, Select, Textarea } from "./ui";
import "./AddMemberModal.css";

const validateForm = (form) => {
  const nextErrors = {};

  if (!form.name.trim()) {
    nextErrors.name = "Name is required.";
  } else if (form.name.trim().length < 2) {
    nextErrors.name = "Name must be at least 2 characters.";
  }

  if (!form.age) {
    nextErrors.age = "Age is required.";
  } else if (Number(form.age) < 0 || Number(form.age) > 120) {
    nextErrors.age = "Age must be between 0 and 120.";
  }

  return nextErrors;
};

const AddMemberModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({
    name: "",
    relation: "",
    age: "",
    gender: "male",
    conditions: "",
    allergies: "",
    medications: "",
    childSensitive: false,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
  };

  const submit = async () => {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      notify.error("Please fix the highlighted member details");
      return;
    }

    await onSave(form);
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      className="member-modal"
      title="Add family member"
      description="Create a profile to organize records, reminders, and personalized care suggestions."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Save Member
          </Button>
        </>
      }
    >
      <div className="member-modal__header">
        <div className="member-modal__icon">
          <ShieldPlus size={20} />
        </div>

        <div>
          <p className="member-modal__eyebrow">Household Profile</p>
          <p className="member-modal__copy">
            Capture the care details that make reminders, records, and AI guidance feel truly family-aware.
          </p>
        </div>
      </div>

      <form
        className="member-modal__form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <section className="member-modal__section">
          <div className="member-modal__section-head">
            <div>
              <h3>Profile basics</h3>
              <p>Capture the essentials so health records stay organized by person.</p>
            </div>
          </div>

          <div className="member-modal__grid member-modal__grid--wide">
            <Input
              label="Name"
              placeholder="Enter full name"
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
              leftIcon={<UserRound size={18} />}
              error={errors.name}
            />

            <Input
              label="Relation"
              placeholder="Mother, Father, Child, Self..."
              value={form.relation}
              onChange={(event) => handleChange("relation", event.target.value)}
            />
          </div>

          <div className="member-modal__grid">
            <Input
              label="Age"
              type="number"
              min="0"
              placeholder="Enter age"
              value={form.age}
              onChange={(event) => handleChange("age", event.target.value)}
              error={errors.age}
            />

            <Select
              label="Gender"
              value={form.gender}
              onChange={(event) => handleChange("gender", event.target.value)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>
        </section>

        <section className="member-modal__section">
          <div className="member-modal__section-head">
            <div>
              <h3>Care context</h3>
              <p>Add the details that help reminders and AI guidance stay safer and more personalized.</p>
            </div>
            <span className="member-modal__hint">Separate items with commas</span>
          </div>

          <Textarea
            label="Conditions"
            placeholder="Diabetes, asthma, acidity..."
            value={form.conditions}
            onChange={(event) => handleChange("conditions", event.target.value)}
          />

          <div className="member-modal__grid">
            <Textarea
              label="Allergies"
              placeholder="Pollen, milk, penicillin..."
              value={form.allergies}
              onChange={(event) => handleChange("allergies", event.target.value)}
            />

            <Textarea
              label="Medications"
              placeholder="Metformin, insulin, iron..."
              value={form.medications}
              onChange={(event) => handleChange("medications", event.target.value)}
            />
          </div>

          <Checkbox
            label="Mark as sensitive profile"
            helperText="Useful for children or members who need extra caution in care suggestions."
            checked={form.childSensitive}
            onChange={(event) => handleChange("childSensitive", event.target.checked)}
          />
        </section>
      </form>
    </Modal>
  );
};

export default AddMemberModal;
