import mongoose from "mongoose";

const libraryRemedySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  symptoms: { type: String, default: "" },
  ingredients: { type: [String], default: [] },
  steps: { type: [String], default: [] },
  rating: { type: Number, default: 4.8 },
  tags: { type: [String], default: [] },
  timeMins: { type: Number, default: 10 },
  difficulty: { type: String, default: "Easy" },
  ayurveda: { type: String, default: "" },
  bestFor: { type: [String], default: [] },
  colorFrom: { type: String, default: "#1f9c90" },
  colorTo: { type: String, default: "#0d6a65" },
}, { timestamps: true });

export default mongoose.models.LibraryRemedy || mongoose.model("LibraryRemedy", libraryRemedySchema);
