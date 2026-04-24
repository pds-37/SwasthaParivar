import mongoose from "mongoose";

const suggestedReminderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "ai"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      default: "",
    },
    ts: {
      type: Number,
      default: () => Date.now(),
    },
    attachment: {
      type: String,
      default: null,
    },
    riskLevel: {
      type: String,
      default: null,
    },
    followUpPrompt: {
      type: String,
      default: null,
    },
    suggestedReminder: {
      type: suggestedReminderSchema,
      default: null,
    },
  },
  { _id: false }
);

const aiMemorySchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    member: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      default: "New chat",
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Index allows finding all threads for a specific member efficiently
aiMemorySchema.index({ ownerId: 1, member: 1 });

export default mongoose.models.AIMemory ||
  mongoose.model("AIMemory", aiMemorySchema);
