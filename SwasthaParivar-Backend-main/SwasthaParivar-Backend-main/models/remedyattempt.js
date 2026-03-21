import mongoose from "mongoose";

const remedyAttemptSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FamilyMember",
    required: true,
    index: true,
  },
  symptomEpisodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SymptomEpisode",
    required: true,
    index: true,
  },
  remedySuggestionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RemedySuggestion",
    required: true,
    index: true,
  },
  actualIngredientsUsed: { type: [String], default: [] },
  startedAt: { type: Date, default: Date.now },
  adherence: {
    type: String,
    enum: ["low", "partial", "full"],
    default: "partial",
  },
  beforeSeverity: { type: Number, min: 1, max: 5, required: true },
  afterSeverity6h: { type: Number, min: 1, max: 5, default: null },
  afterSeverity24h: { type: Number, min: 1, max: 5, default: null },
  afterSeverity48h: { type: Number, min: 1, max: 5, default: null },
  sideEffects: { type: [String], default: [] },
  stoppedReason: { type: String, default: "" },
  userFeedback: { type: String, default: "" },
  clinicianReviewed: { type: Boolean, default: false },
  followupStatus: {
    due6hAt: { type: Date, default: null },
    due24hAt: { type: Date, default: null },
    due48hAt: { type: Date, default: null },
    completed6hAt: { type: Date, default: null },
    completed24hAt: { type: Date, default: null },
    completed48hAt: { type: Date, default: null },
  },
}, { timestamps: true });

export default mongoose.models.RemedyAttempt ||
  mongoose.model("RemedyAttempt", remedyAttemptSchema);
