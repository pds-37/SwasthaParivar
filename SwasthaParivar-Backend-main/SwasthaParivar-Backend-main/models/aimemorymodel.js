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

const triageSummarySchema = new mongoose.Schema(
  {
    tier: { type: String, default: "" },
    label: { type: String, default: "" },
    action: { type: String, default: "" },
    contextSignals: { type: [String], default: [] },
    profileGaps: { type: [String], default: [] },
    doctorPacket: { type: [String], default: [] },
    trendFlags: { type: [String], default: [] },
    sourceReferences: {
      type: [
        {
          title: { type: String, default: "" },
          source: { type: String, default: "" },
          url: { type: String, default: "" },
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

const intakeQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, default: "" },
    label: { type: String, default: "" },
    prompt: { type: String, default: "" },
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
    triageSummary: {
      type: triageSummarySchema,
      default: null,
    },
    intakeQuestions: {
      type: [intakeQuestionSchema],
      default: [],
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
    contextKey: {
      type: String,
      default: "",
      trim: true,
      index: true,
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
aiMemorySchema.index({ ownerId: 1, contextKey: 1, updatedAt: -1 });

export default mongoose.models.AIMemory ||
  mongoose.model("AIMemory", aiMemorySchema);
