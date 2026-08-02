import mongoose from "mongoose";

const securityEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null // Null if an anonymous IP
    },
    eventType: {
      type: String,
      required: true,
      index: true
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true
    },
    scoreDelta: {
      type: Number,
      required: true,
      default: 0
    },
    ipAddress: {
      type: String,
      required: true,
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    resolved: {
      type: Boolean,
      default: false
    }
  },
  { 
    timestamps: { createdAt: "timestamp", updatedAt: false }, // append-only semantics
    capped: false // Can be capped if needed, but append-only log is requested
  }
);

const SecurityEvent = mongoose.model("SecurityEvent", securityEventSchema);

export default SecurityEvent;
