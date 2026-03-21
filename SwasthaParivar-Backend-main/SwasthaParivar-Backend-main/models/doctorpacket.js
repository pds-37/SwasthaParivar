import mongoose from "mongoose";

const doctorPacketSchema = new mongoose.Schema({
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
    index: true,
  },
  episodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SymptomEpisode",
    required: true,
    index: true,
  },
  summary: { type: String, required: true },
  symptomTimeline: { type: [String], default: [] },
  remediesTried: { type: [String], default: [] },
  warningsTriggered: { type: [String], default: [] },
  latestVitals: { type: mongoose.Schema.Types.Mixed, default: {} },
  exportedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.DoctorPacket ||
  mongoose.model("DoctorPacket", doctorPacketSchema);
