import mongoose from "mongoose";

const householdInviteSchema = new mongoose.Schema({
  householdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Household",
    required: true,
    index: true,
  },
  createdByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  acceptedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  inviteType: {
    type: String,
    enum: ["adult_invite", "link_existing"],
    required: true,
    index: true,
  },
  email: {
    type: String,
    default: "",
    trim: true,
    lowercase: true,
    index: true,
  },
  name: {
    type: String,
    default: "",
    trim: true,
    maxlength: 120,
  },
  relation: {
    type: String,
    default: "",
    trim: true,
    maxlength: 40,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "expired", "cancelled"],
    default: "pending",
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  acceptedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

householdInviteSchema.index({ householdId: 1, status: 1, createdAt: -1 });

export default mongoose.models.HouseholdInvite ||
  mongoose.model("HouseholdInvite", householdInviteSchema);
