import mongoose from "mongoose";

const threatScoreSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    currentScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    history: [
      {
        scoreDelta: { type: Number, required: true },
        reason: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    lastDecayAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

const ThreatScore = mongoose.model("ThreatScore", threatScoreSchema);

export default ThreatScore;
