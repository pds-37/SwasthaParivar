import React, { useState } from "react";
import { Link2, Mail, ShieldPlus, UserRound, Users } from "lucide-react";
import notify from "../lib/notify";
import { Button, Checkbox, Input, Modal, Radio, Select, Textarea } from "./ui";
import "./AddMemberModal.css";

const validateForm = (form) => {
  const nextErrors = {};

  if (form.mode === "dependent") {
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
  } else if (!form.email.trim()) {
    nextErrors.email = "Email is required.";
  }

  return nextErrors;
};

const AddMemberModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({
    mode: "dependent",
    name: "",
    email: "",
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
      title="Add to household"
      description="Choose whether you are adding a dependent profile or inviting another adult into the shared family workspace."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            {form.mode === "dependent" ? "Save Member" : "Create Invite"}
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
            Dependents stay caregiver-managed. Adult members join with their own accounts inside the same household.
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
              <h3>How do you want to add them?</h3>
              <p>Choose the path that matches the person you are bringing into this household.</p>
            </div>
          </div>

          <div className="member-modal__choices">
            <Radio
              name="member-mode"
              checked={form.mode === "dependent"}
              onChange={() => handleChange("mode", "dependent")}
              label="Add dependent"
              helperText="For a child, elder, or someone without their own app login."
            />
            <Radio
              name="member-mode"
              checked={form.mode === "adult_invite"}
              onChange={() => handleChange("mode", "adult_invite")}
              label="Invite adult family member"
              helperText="Send an invite so they can join the household with their own account."
            />
            <Radio
              name="member-mode"
              checked={form.mode === "link_existing"}
              onChange={() => handleChange("mode", "link_existing")}
              label="Link existing app user"
              helperText="Use this when they already have an account and only need household access."
            />
          </div>
        </section>

        {form.mode === "dependent" ? (
          <>
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
          </>
        ) : (
          <section className="member-modal__section">
            <div className="member-modal__section-head">
              <div>
                <h3>Invite details</h3>
                <p>
                  We will generate a household invite code. They can accept it after signing in with their own account.
                </p>
              </div>
              <span className="member-modal__hint">
                {form.mode === "link_existing" ? "Existing user" : "Adult invite"}
              </span>
            </div>

            <div className="member-modal__grid member-modal__grid--wide">
              <Input
                label="Name"
                placeholder="Optional name"
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                leftIcon={<Users size={18} />}
              />

              <Input
                label="Relation"
                placeholder="Brother, Sister, Spouse..."
                value={form.relation}
                onChange={(event) => handleChange("relation", event.target.value)}
              />
            </div>

            <Input
              label="Email"
              placeholder="Enter their email address"
              value={form.email}
              onChange={(event) => handleChange("email", event.target.value)}
              leftIcon={form.mode === "link_existing" ? <Link2 size={18} /> : <Mail size={18} />}
              error={errors.email}
            />
          </section>
        )}
      </form>
    </Modal>
  );
};

export default AddMemberModal;
