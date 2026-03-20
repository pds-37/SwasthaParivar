import mongoose from "mongoose";

const HealthRecordSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FamilyMember",
    required: true,
  },
  date: { type: Date, required: true },
  bloodPressure: { type: Number, required: true },
  heartRate: { type: Number, required: true },
  bloodSugar: { type: Number, required: true },
  weight: { type: Number, required: false },
  sleep: { type: Number, required: false },
  steps: { type: Number, required: false },
});

export default mongoose.model("HealthRecord", HealthRecordSchema);
