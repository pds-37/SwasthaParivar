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
  location: {
    pincode: { type: String, default: "201306", index: true },
    district: { type: String, default: "Gautam Buddha Nagar", index: true },
    state: { type: String, default: "Uttar Pradesh" },
    ward: { type: String, default: "Knowledge Park III" },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [77.4977, 28.4744],
    },
  },
}, { timestamps: true });

householdSchema.index({ createdByUserId: 1, createdAt: -1 });

export default mongoose.models.Household ||
  mongoose.model("Household", householdSchema);
