import mongoose from "mongoose";

const symptomItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  severity: { type: Number, min: 1, max: 5, default: 2 },
  notes: { type: String, default: "" },
}, { _id: false });

const contextSchema = new mongoose.Schema({
  notes: { type: String, default: "" },
  weather: { type: String, default: "" },
  sleepHours: { type: Number, default: null },
  travel: { type: Boolean, default: false },
  season: { type: String, default: "" },
  sharedHouseholdOutbreak: { type: Boolean, default: false },
  hydration: { type: String, default: "" },
  onsetHours: { type: Number, default: null },
}, { _id: false });

const symptomEpisodeSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  householdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Household",
    default: null,
    index: true,
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FamilyMember",
    required: true,
    index: true,
  },
  startedAt: { type: Date, default: Date.now },
  symptoms: {
    type: [symptomItemSchema],
    default: [],
  },
  severity: {
    type: String,
    enum: ["mild", "moderate", "severe"],
    default: "mild",
  },
  suspectedTriggers: {
    type: [String],
    default: [],
  },
  context: { type: contextSchema, default: () => ({}) },
  redFlags: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ["open", "monitoring", "escalated", "resolved"],
    default: "open",
    index: true,
  },
  resolvedAt: { type: Date, default: null },
  sourceMessage: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.models.SymptomEpisode ||
  mongoose.model("SymptomEpisode", symptomEpisodeSchema);
