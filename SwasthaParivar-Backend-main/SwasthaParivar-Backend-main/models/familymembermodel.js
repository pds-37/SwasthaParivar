import mongoose from "mongoose";

const metricEntrySchema = new mongoose.Schema({
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  date: { type: String, required: true },
}, { _id: false });

const healthSchema = new mongoose.Schema({
  bloodPressure: [metricEntrySchema],
  heartRate: [metricEntrySchema],
  bloodSugar: [metricEntrySchema],
  weight: [metricEntrySchema],
  sleep: [metricEntrySchema],
  steps: [metricEntrySchema],
}, { _id: false });

const baselinePreferencesSchema = new mongoose.Schema({
  preferredFormats: [{ type: String }],
  avoidedIngredients: [{ type: String }],
  clinicianName: { type: String, default: "" },
  notes: { type: String, default: "" },
}, { _id: false });

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  phone: { type: String, default: "" },
  relation: { type: String, default: "" },
}, { _id: false });

const familyMemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  age: { type: Number, default: 0 },
  gender: { type: String, enum: ["male", "female", "other"], default: "other" },
  avatar: { type: String },
  relation: { type: String, default: "" },

  // Embedded health snapshots power household-level risk scoring.
  health: { type: healthSchema, default: () => ({}) },

  conditions: [{ type: String }],
  allergies: [{ type: String }],
  medications: [{ type: String }],
  pregnancyStatus: {
    type: String,
    enum: ["not_applicable", "not_pregnant", "pregnant", "postpartum"],
    default: "not_applicable",
  },
  childSensitive: { type: Boolean, default: false },
  careRoles: [{ type: String }],
  baselinePreferences: { type: baselinePreferencesSchema, default: () => ({}) },
  emergencyContact: { type: emergencyContactSchema, default: () => ({}) },
}, { timestamps: true });

export default mongoose.models.FamilyMember ||
  mongoose.model("FamilyMember", familyMemberSchema);
