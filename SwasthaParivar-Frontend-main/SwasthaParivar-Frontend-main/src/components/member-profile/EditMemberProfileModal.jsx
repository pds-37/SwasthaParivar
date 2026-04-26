import React, { useState } from "react";
import { ShieldPlus, UserRound } from "lucide-react";

import notify from "../../lib/notify";
import { useFamilyStore } from "../../store/family-store";
import AvatarUploadField from "../common/AvatarUploadField";
import { Button, Checkbox, Input, Modal, Select, Textarea } from "../ui";
import "../AddMemberModal.css";

const listToText = (items) => (Array.isArray(items) ? items.join(", ") : "");

const relationshipOptions = [
  { value: "", label: "Select relationship" },
  { value: "Self", label: "Self" },
  { value: "Spouse", label: "Spouse" },
  { value: "Child", label: "Child" },
  { value: "Parent", label: "Parent" },
  { value: "Mother", label: "Mother" },
  { value: "Father", label: "Father" },
  { value: "Sibling", label: "Sibling" },
  { value: "Grandparent", label: "Grandparent" },
  { value: "Care recipient", label: "Care recipient" },
  { value: "Other", label: "Other" },
];

const buildInitialForm = (member = {}) => ({
  name: member.name || "",
  relation: member.relation || "",
  age: member.age || "",
  gender: member.gender || "other",
  avatar: member.avatar || "",
  conditions: listToText(member.conditions),
  allergies: listToText(member.allergies),
  medications: listToText(member.medications),
  childSensitive: Boolean(member.childSensitive),
});

const isSelfRelation = (value = "") => String(value || "").trim().toLowerCase() === "self";

const validateForm = (form, { hasReservedSelfProfile = false } = {}) => {
  const nextErrors = {};

  if (!form.name.trim()) {
    nextErrors.name = "Name is required.";
  } else if (form.name.trim().length < 2) {
    nextErrors.name = "Name must be at least 2 characters.";
  }

  if (form.age === "" || form.age === null || form.age === undefined) {
    nextErrors.age = "Age is required.";
  } else if (Number(form.age) < 0 || Number(form.age) > 120) {
    nextErrors.age = "Age must be between 0 and 120.";
  }

  if (isSelfRelation(form.relation) && hasReservedSelfProfile) {
    nextErrors.relation = "Self is reserved for the connected personal profile.";
  }

  return nextErrors;
};

const EditMemberProfileModal = ({ member, saving = false, onClose, onSave }) => {
  const { members = [], selfMember } = useFamilyStore();
  const [form, setForm] = useState(() => buildInitialForm(member));
  const [errors, setErrors] = useState({});
  const hasReservedSelfProfile =
    Boolean(selfMember?._id && selfMember?._id !== member?._id) ||
    members.some((entry) => entry._id !== member?._id && isSelfRelation(entry?.relation));

  const handleChange = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
  };

  const submit = async () => {
    const nextErrors = validateForm(form, { hasReservedSelfProfile });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      notify.error("Please fix the highlighted profile details");
      return;
    }

    await onSave({
      name: form.name,
      relation: form.relation,
      age: Number(form.age),
      gender: form.gender,
      avatar: form.avatar,
      conditions: form.conditions,
      allergies: form.allergies,
      medications: form.medications,
      childSensitive: form.childSensitive,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      className="member-modal"
      title="Edit family profile"
      description="Keep this member's identity, care context, and profile photo up to date so reminders, records, and AI stay relevant."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="member-modal__header">
        <div className="member-modal__icon">
          <ShieldPlus size={20} />
        </div>

        <div>
          <p className="member-modal__eyebrow">Member Profile</p>
          <p className="member-modal__copy">
            Update the core details that shape this member&apos;s care timeline, reminders, and household context.
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
              <p>Refresh the essentials so the profile stays recognizable and well organized.</p>
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

            <Select
              label="Relation"
              value={form.relation}
              onChange={(event) => handleChange("relation", event.target.value)}
              error={errors.relation}
            >
              {relationshipOptions.map((option) => (
                <option key={option.value || "empty"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
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

          <AvatarUploadField
            name={form.name}
            value={form.avatar}
            onChange={(value) => handleChange("avatar", value)}
            helperText="Upload directly from this device. If removed, the avatar falls back to initials."
          />
        </section>

        <section className="member-modal__section">
          <div className="member-modal__section-head">
            <div>
              <h3>Care context</h3>
              <p>Keep the profile clinically useful by updating known conditions, allergies, and ongoing medications.</p>
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
            helperText="Use this when the member needs extra caution in shared care suggestions."
            checked={form.childSensitive}
            onChange={(event) => handleChange("childSensitive", event.target.checked)}
          />
        </section>
      </form>
    </Modal>
  );
};

export default EditMemberProfileModal;
