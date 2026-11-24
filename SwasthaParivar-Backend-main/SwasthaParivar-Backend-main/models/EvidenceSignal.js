import mongoose from "mongoose";

const evidenceSignalSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      required: true,
      enum: ["household", "asha_worker", "phc_clinic", "pharmacy_demand", "diagnostic_lab"],
      index: true,
    },
    sourceIdentifier: {
      type: String,
      required: true,
      trim: true,
    },
    spatialScope: {
      pincode: { type: String, required: true, index: true },
      ward: { type: String, default: "" },
      district: { type: String, required: true, index: true },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [77.4977, 28.4744],
      },
    },
    signalType: {
      type: String,
      required: true,
      enum: [
        "SYMPTOM_REPORT",
        "VITAL_ANOMALY",
        "DRUG_SALES_SURGE",
        "LAB_CONFIRMATION",
        "FIELD_SURVEY",
      ],
      index: true,
    },
    category: {
      type: String,
      enum: [
        "METABOLIC_CHRONIC",
        "ACUTE_RESPIRATORY_SURGE",
        "WATERBORNE_CLUSTER",
        "CARDIAC_ANOMALY",
        "FEBRILE_ILLNESS",
        "MATERNAL_CHILD_ALERT",
        "GENERAL_STABLE",
      ],
      default: "FEBRILE_ILLNESS",
    },
    payload: {
      symptoms: [{ type: String }],
      affectedCount: { type: Number, default: 1 },
      severityScore: { type: Number, default: 0.5 },
      notes: { type: String, default: "" },
      metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    confidenceWeight: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.6,
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

evidenceSignalSchema.index({ "spatialScope.pincode": 1, category: 1, timestamp: -1 });

export default mongoose.model("EvidenceSignal", evidenceSignalSchema);
