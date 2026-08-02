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
    index: true,
    default: null,
  },
  source: { type: String, enum: ["ai_chat", "symptom_episode", "manual"], default: "ai_chat" },
  triageTier: { type: String, default: "" },
  riskLevel: { type: String, default: "" },
  summary: { type: String, required: true },
  userConcern: { type: String, default: "" },
  symptomTimeline: { type: [String], default: [] },
  remediesTried: { type: [String], default: [] },
  warningsTriggered: { type: [String], default: [] },
  contextChecked: { type: [String], default: [] },
  missingContext: { type: [String], default: [] },
  doctorNotes: { type: [String], default: [] },
  latestVitals: { type: mongoose.Schema.Types.Mixed, default: {} },
  trendFlags: { type: [String], default: [] },
  randomForestRisk: { type: String, default: "NOT_EVALUATED" },
  logisticProbability: { type: Number, default: 0.0 },
  decisionTreeReasoning: { type: [String], default: [] },
  clinicalRulesVerdict: { type: String, default: "NOT_APPLICABLE" },
  geminiSummary: { type: String, default: "" },
  sourceReferences: {
    type: [
      {
        title: { type: String, default: "" },
        source: { type: String, default: "" },
        url: { type: String, default: "" },
      },
    ],
    default: [],
  },
  exportedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.DoctorPacket ||
  mongoose.model("DoctorPacket", doctorPacketSchema);
