import mongoose from "mongoose";

const promptLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null
    },
    rawPrompt: {
      type: String,
      required: true
    },
    normalizedPrompt: {
      type: String,
      required: true
    },
    contextProvided: {
      type: Boolean,
      default: false
    },
    riskScore: {
      type: Number,
      required: true,
      default: 0
    },
    matchedRules: [
      {
        rule: { type: String, required: true },
        scoreDelta: { type: Number, required: true }
      }
    ],
    classifierVerdict: {
      type: String,
      enum: ["safe", "suspicious", "malicious", "not_run"],
      default: "not_run"
    },
    decision: {
      type: String,
      enum: ["allow", "flag", "block"],
      required: true
    },
    promptVersion: {
      type: String,
      default: "v1.0"
    }
  },
  { timestamps: true }
);

const PromptLog = mongoose.model("PromptLog", promptLogSchema);

export default PromptLog;
