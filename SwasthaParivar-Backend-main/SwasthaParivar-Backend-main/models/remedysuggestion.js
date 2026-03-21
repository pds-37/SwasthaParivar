import mongoose from "mongoose";

const candidateRemedySchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  score: { type: Number, default: 0 },
  safetyStatus: {
    type: String,
    enum: ["safe", "use_with_caution", "avoid"],
    default: "safe",
  },
  reason: { type: String, default: "" },
}, { _id: false });

const selectedRemedySchema = new mongoose.Schema({
  id: { type: String, default: "" },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  ingredients: { type: [String], default: [] },
  steps: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  substitutes: { type: [String], default: [] },
}, { _id: false });

const remedySuggestionSchema = new mongoose.Schema({
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
  generatedBy: { type: String, default: "care-orchestrator" },
  recommendedIngredients: { type: [String], default: [] },
  blockedIngredients: { type: [String], default: [] },
  warnings: { type: [String], default: [] },
  confidenceScore: { type: Number, min: 0, max: 1, default: 0.5 },
  reasoningSummary: { type: String, default: "" },
  safetyChecksPassed: { type: [String], default: [] },
  safetyChecksFailed: { type: [String], default: [] },
  candidateRemedies: { type: [candidateRemedySchema], default: [] },
  selectedRemedy: { type: selectedRemedySchema, required: true },
  toolTrace: { type: [String], default: [] },
  status: {
    type: String,
    enum: ["suggested", "accepted", "dismissed", "escalated"],
    default: "suggested",
  },
}, { timestamps: true });

export default mongoose.models.RemedySuggestion ||
  mongoose.model("RemedySuggestion", remedySuggestionSchema);
