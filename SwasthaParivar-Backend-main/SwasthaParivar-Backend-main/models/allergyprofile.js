import mongoose from "mongoose";

const allergenSchema = new mongoose.Schema({
  name: { type: String, required: true },
  reactionType: { type: String, default: "" },
  severity: {
    type: String,
    enum: ["low", "moderate", "high"],
    default: "moderate",
  },
}, { _id: false });

const allergyProfileSchema = new mongoose.Schema({
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
  allergens: {
    type: [allergenSchema],
    default: [],
  },
}, { timestamps: true });

export default mongoose.models.AllergyProfile ||
  mongoose.model("AllergyProfile", allergyProfileSchema);
