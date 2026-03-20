import mongoose from "mongoose";

const metricEntrySchema = new mongoose.Schema({
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  date: { type: String, required: true }
}, { _id: false });

const healthSchema = new mongoose.Schema({
  bloodPressure: [metricEntrySchema],
  heartRate: [metricEntrySchema],
  bloodSugar: [metricEntrySchema],
  weight: [metricEntrySchema],
  sleep: [metricEntrySchema],
  steps: [metricEntrySchema]
}, { _id: false });

const familyMemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  age: { type: Number, default: 0 },
  gender: { type: String, enum: ["male", "female", "other"], default: "other" },
  avatar: { type: String },

  // ⭐ HEALTH FIELD
  health: { type: healthSchema, default: () => ({}) },

  conditions: [String]
}, { timestamps: true });

export default mongoose.models.FamilyMember ||
  mongoose.model("FamilyMember", familyMemberSchema);
