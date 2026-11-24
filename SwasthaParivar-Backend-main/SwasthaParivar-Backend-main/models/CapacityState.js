import mongoose from "mongoose";

const essentialMedicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: "general" },
    stockDaysRemaining: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ["adequate", "low", "critical_stockout"],
      default: "adequate",
    },
  },
  { _id: false }
);

const capacityStateSchema = new mongoose.Schema(
  {
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HealthcareFacility",
      default: null,
      index: true,
    },
    facilityCode: {
      type: String,
      default: "",
    },
    district: {
      type: String,
      required: true,
      index: true,
    },
    pincode: {
      type: String,
      required: true,
      index: true,
    },
    totalBeds: {
      type: Number,
      default: 30,
      min: 0,
    },
    availableBeds: {
      type: Number,
      default: 15,
      min: 0,
    },
    icuBedsTotal: {
      type: Number,
      default: 4,
      min: 0,
    },
    icuBedsAvailable: {
      type: Number,
      default: 2,
      min: 0,
    },
    doctorsOnDuty: {
      type: Number,
      default: 3,
      min: 0,
    },
    nursesOnDuty: {
      type: Number,
      default: 6,
      min: 0,
    },
    ambulancesAvailable: {
      type: Number,
      default: 1,
      min: 0,
    },
    diagnosticCapacityPerDay: {
      type: Number,
      default: 50,
      min: 0,
    },
    criticalMedicineStockIndex: {
      type: Number,
      default: 0.85,
      min: 0,
      max: 1,
    },
    essentialMedicines: [essentialMedicineSchema],
    currentPatientLoad: {
      type: Number,
      default: 20,
      min: 0,
    },
    effectiveCapacityScore: {
      type: Number,
      default: 0.75,
      min: 0,
      max: 1,
    },
    capacityDeficitIndex: {
      type: Number,
      default: 0.25,
      min: 0,
      max: 1,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

capacityStateSchema.index({ district: 1, pincode: 1, recordedAt: -1 });

export default mongoose.model("CapacityState", capacityStateSchema);
