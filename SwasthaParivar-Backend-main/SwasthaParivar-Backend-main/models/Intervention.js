import mongoose from "mongoose";

const postInterventionFeedbackSchema = new mongoose.Schema(
  {
    evaluatedAt: { type: Date, default: null },
    baselineSeverity: { type: Number, default: 0 },
    postInterventionSeverity: { type: Number, default: 0 },
    outcome: {
      type: String,
      enum: ["PENDING", "IMPROVED", "DETERIORATED", "INSUFFICIENT_CHANGE"],
      default: "PENDING",
    },
    responseScore: { type: Number, default: 0 },
    actionTaken: {
      type: String,
      enum: ["NONE", "DE_ESCALATED", "ESCALATED_FURTHER", "MAINTAINED"],
      default: "NONE",
    },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const interventionSchema = new mongoose.Schema(
  {
    healthStateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HealthState",
      required: true,
      index: true,
    },
    targetLevel: {
      type: String,
      enum: ["household", "community", "facility", "district", "state"],
      required: true,
    },
    targetScope: {
      pincode: { type: String, index: true },
      district: { type: String, index: true },
      ward: { type: String },
      facilityId: { type: String },
    },
    interventionType: {
      type: String,
      required: true,
      enum: [
        "ASHA_FIELD_SCREENING",
        "MOBILE_CAMP_DEPLOYMENT",
        "MEDICINE_REPLENISHMENT",
        "DOCTOR_REALLOCATION",
        "TELEMEDICINE_ESCALATION",
        "AMBULANCE_DISPATCH",
        "PUBLIC_HEALTH_ADVISORY",
      ],
      index: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "EMERGENCY"],
      default: "MEDIUM",
    },
    title: {
      type: String,
      required: true,
    },
    recommendations: [
      {
        type: String,
      },
    ],
    allocatedResources: {
      personnelAssigned: { type: Number, default: 0 },
      medicineKits: { type: Number, default: 0 },
      ambulanceUnits: { type: Number, default: 0 },
      specialistDoctorRequired: { type: Boolean, default: false },
    },
    assignedRoles: [
      {
        type: String,
        enum: ["asha_worker", "medical_officer", "district_magistrate", "pharmacist", "caregiver"],
      },
    ],
    status: {
      type: String,
      enum: ["DISPATCHED", "IN_PROGRESS", "COMPLETED", "EVALUATED"],
      default: "DISPATCHED",
      index: true,
    },
    dispatchedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    postInterventionFeedback: {
      type: postInterventionFeedbackSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

interventionSchema.index({ "targetScope.district": 1, status: 1 });

export default mongoose.model("Intervention", interventionSchema);
