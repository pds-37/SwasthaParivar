import mongoose from "mongoose";

const healthcareFacilitySchema = new mongoose.Schema(
  {
    facilityId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tier: {
      type: String,
      required: true,
      enum: ["SubCenter", "PHC", "CHC", "DistrictHospital", "StateMedicalCollege"],
      default: "PHC",
    },
    district: {
      type: String,
      required: true,
      index: true,
    },
    state: {
      type: String,
      default: "Uttar Pradesh",
    },
    pincode: {
      type: String,
      required: true,
      index: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [77.4977, 28.4744],
    },
    contactPhone: {
      type: String,
      default: "",
    },
    operationalStatus: {
      type: String,
      enum: ["active", "overflow", "restricted", "emergency_surge"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

healthcareFacilitySchema.index({ district: 1, pincode: 1 });

export default mongoose.model("HealthcareFacility", healthcareFacilitySchema);
