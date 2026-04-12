import mongoose from "mongoose";

const householdSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  slug: {
    type: String,
    default: "",
    trim: true,
    lowercase: true,
    maxlength: 140,
    index: true,
  },
  createdByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active",
    index: true,
  },
}, { timestamps: true });

householdSchema.index({ createdByUserId: 1, createdAt: -1 });

export default mongoose.models.Household ||
  mongoose.model("Household", householdSchema);
