import React, { useState } from "react";
import "./AddMemberModal.css";

const AddMemberModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "male",
  });

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const submit = () => {
    if (!form.name.trim()) return alert("Name is required");
    if (!form.age) return alert("Age is required");

    onSave(form);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Add Family Member</h2>

        <label>Name</label>
        <input
          type="text"
          placeholder="Enter full name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />

        <label>Age</label>
        <input
          type="number"
          placeholder="Enter age"
          value={form.age}
          onChange={(e) => handleChange("age", e.target.value)}
        />

        <label>Gender</label>
        <select
          value={form.gender}
          onChange={(e) => handleChange("gender", e.target.value)}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>

        <div className="modal-actions">
          <button className="cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="save" onClick={submit}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
