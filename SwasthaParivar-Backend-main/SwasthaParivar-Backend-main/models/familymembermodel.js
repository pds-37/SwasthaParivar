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

const sharingPreferencesSchema = new mongoose.Schema({
  visibility: {
    type: String,
    enum: ["private", "summary", "full"],
    default: "summary",
  },
  allowFamilySummary: {
    type: Boolean,
    default: true,
  },
  allowCaregiverDetails: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const inviteContactSchema = new mongoose.Schema({
  email: { type: String, default: "", trim: true, lowercase: true },
  phone: { type: String, default: "", trim: true },
}, { _id: false });

const familyMemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  householdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Household",
    required: true,
    index: true,
  },
  linkedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  },
  managedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 80,
  },
  age: { type: Number, default: 0, min: 0, max: 120 },
  gender: { type: String, enum: ["male", "female", "other"], default: "other" },
  avatar: { type: String, trim: true, maxlength: 200 },
  relation: { type: String, default: "", trim: true, maxlength: 40 },

  // Embedded health snapshots power household-level risk scoring.
  health: { type: healthSchema, default: () => ({}) },

  conditions: [{ type: String, trim: true, maxlength: 60 }],
  allergies: [{ type: String, trim: true, maxlength: 60 }],
  medications: [{ type: String, trim: true, maxlength: 80 }],
  pregnancyStatus: {
    type: String,
    enum: ["not_applicable", "not_pregnant", "pregnant", "postpartum"],
    default: "not_applicable",
  },
  childSensitive: { type: Boolean, default: false },
  careRoles: [{ type: String }],
  profileType: {
    type: String,
    enum: ["self", "adult", "dependent"],
    default: "dependent",
    index: true,
  },
  profileStatus: {
    type: String,
    enum: ["active", "invited", "archived"],
    default: "active",
    index: true,
  },
  sharingPreferences: { type: sharingPreferencesSchema, default: () => ({}) },
  connectionStatus: {
    type: String,
    enum: ["not_connected", "pending", "connected", "revoked", "error"],
    default: "not_connected",
  },
  inviteContact: { type: inviteContactSchema, default: () => ({}) },
  baselinePreferences: { type: baselinePreferencesSchema, default: () => ({}) },
  emergencyContact: { type: emergencyContactSchema, default: () => ({}) },
}, { timestamps: true });

familyMemberSchema.index({ user: 1, createdAt: -1 });
familyMemberSchema.index({ householdId: 1, createdAt: -1 });
familyMemberSchema.index({ linkedUserId: 1, profileType: 1 });

export default mongoose.models.FamilyMember ||
  mongoose.model("FamilyMember", familyMemberSchema);
