import mongoose from "mongoose";

const aiChatLogSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    feature: {
      type: String,
      default: "aiChat",
      trim: true,
      maxlength: 40,
    },
    route: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
  },
  { timestamps: true }
);

aiChatLogSchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.models.AIChatLog ||
  mongoose.model("AIChatLog", aiChatLogSchema);

