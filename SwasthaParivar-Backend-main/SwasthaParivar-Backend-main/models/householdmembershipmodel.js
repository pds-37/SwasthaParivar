import mongoose from "mongoose";

const householdMembershipSchema = new mongoose.Schema({
  householdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Household",
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ["owner", "adult", "caregiver", "viewer"],
    default: "owner",
  },
  status: {
    type: String,
    enum: ["active", "invited", "left"],
    default: "active",
    index: true,
  },
  permissions: {
    canInvite: { type: Boolean, default: true },
    canManageDependents: { type: Boolean, default: true },
    canViewFamilyDetails: { type: Boolean, default: true },
  },
}, { timestamps: true });

householdMembershipSchema.index({ householdId: 1, userId: 1 }, { unique: true });

export default mongoose.models.HouseholdMembership ||
  mongoose.model("HouseholdMembership", householdMembershipSchema);
