import mongoose from "mongoose";

const medicationEntrySchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, default: "" },
  timing: { type: String, default: "" },
  doctor: { type: String, default: "" },
}, { _id: false });

const medicationProfileSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FamilyMember",
    required: true,
    unique: true,
    index: true,
  },
  activeMedications: {
    type: [medicationEntrySchema],
    default: [],
  },
  knownInteractions: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

export default mongoose.models.MedicationProfile ||
  mongoose.model("MedicationProfile", medicationProfileSchema);
