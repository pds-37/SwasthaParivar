import mongoose from "mongoose";

const healthStateSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ["individual", "household", "community", "facility", "district", "state", "national"],
      required: true,
      index: true,
    },
    nodeId: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "METABOLIC_CHRONIC",
        "ACUTE_RESPIRATORY_SURGE",
        "WATERBORNE_CLUSTER",
        "CARDIAC_ANOMALY",
        "FEBRILE_ILLNESS",
        "MATERNAL_CHILD_ALERT",
        "GENERAL_STABLE",
      ],
      default: "GENERAL_STABLE",
      index: true,
    },
    severity: {
      type: String,
      enum: ["LOW", "MODERATE", "HIGH", "CRITICAL"],
      default: "LOW",
    },
    severityScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.1,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.5,
    },
    evidenceCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    sources: [
      {
        type: String,
        enum: ["household", "asha_worker", "phc_clinic", "pharmacy_demand", "diagnostic_lab"],
      },
    ],
    anomalyMetrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    spatialScope: {
      pincode: { type: String, index: true },
      ward: { type: String },
      district: { type: String, index: true },
      state: { type: String, default: "Uttar Pradesh" },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [77.4977, 28.4744], // Default Greater Noida coords
      },
    },
    stateStatus: {
      type: String,
      enum: ["ACTIVE", "MAINTAINED", "ESCALATED", "DE_ESCALATED", "RESOLVED"],
      default: "ACTIVE",
      index: true,
    },
    activeInterventionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Intervention",
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

healthStateSchema.index({ "spatialScope.pincode": 1, category: 1, createdAt: -1 });
healthStateSchema.index({ level: 1, stateStatus: 1 });

export default mongoose.model("HealthState", healthStateSchema);
