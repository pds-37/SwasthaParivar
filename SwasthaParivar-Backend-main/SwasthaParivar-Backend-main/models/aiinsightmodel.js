import mongoose from "mongoose";

const aiInsightSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyMember",
      default: null,
      index: true,
    },
    memberLabel: {
      type: String,
      default: "",
      trim: true,
    },
    sourceMessage: {
      type: String,
      default: "",
    },
    adviceSummary: {
      type: String,
      default: "",
    },
    symptoms: {
      type: [String],
      default: [],
    },
    remedies: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

aiInsightSchema.index({ ownerId: 1, memberId: 1, createdAt: -1 });

export default mongoose.models.AIInsight || mongoose.model("AIInsight", aiInsightSchema);
