import mongoose from "mongoose";

const mlPredictionAuditSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    prediction: {
      type: String,
      enum: ["LOW_RISK", "MEDIUM_RISK", "HIGH_RISK", "MODEL_NOT_READY", "FALLBACK"],
      required: true,
    },
    probability: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
    },
    decisionPath: {
      type: [String],
      default: [],
    },
    inferenceTimeMs: {
      type: Number,
      required: true,
      default: 0,
    },
    modelVersion: {
      type: String,
      required: true,
      default: "v2.6.0-production-leak-free-audited",
    },
    clinicalOverrideStatus: {
      type: String,
      enum: ["ACCEPTED", "UPGRADED", "DOWNGRADED", "OVERRIDDEN", "NOT_APPLICABLE"],
      default: "ACCEPTED",
    },
    rawFeatureVector: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "mlpredictionaudits",
  }
);

// Indexes for rapid clinical audit lookups and operational latency monitoring
mlPredictionAuditSchema.index({ patientId: 1, createdAt: -1 });
mlPredictionAuditSchema.index({ clinicalOverrideStatus: 1, createdAt: -1 });
// Automated TTL index for 90-day audit retention (7,776,000 seconds)
mlPredictionAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

const MLPredictionAudit = mongoose.model("MLPredictionAudit", mlPredictionAuditSchema);

export default MLPredictionAudit;
