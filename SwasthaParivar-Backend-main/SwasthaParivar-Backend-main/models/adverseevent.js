import mongoose from "mongoose";

const adverseEventSchema = new mongoose.Schema({
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
  sourceType: {
    type: String,
    enum: ["remedy_attempt", "remedy_suggestion", "manual"],
    required: true,
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  ingredient: { type: String, required: true },
  reaction: { type: String, required: true },
  severity: {
    type: String,
    enum: ["mild", "moderate", "severe"],
    default: "moderate",
  },
  occurredAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.AdverseEvent ||
  mongoose.model("AdverseEvent", adverseEventSchema);
