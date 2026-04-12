// models/user.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"],
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 120,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
  },
  googleId: {
    type: String,
    default: null,
    unique: true,
    sparse: true,
  },
  avatarUrl: {
    type: String,
    default: null,
  },
  refreshTokenHash: {
    type: String,
    default: null,
    select: false,
  },
  refreshTokenExpiresAt: {
    type: Date,
    default: null,
    select: false,
  },
  pushSubscription: { type: mongoose.Schema.Types.Mixed, default: null },
  activeHouseholdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Household",
    default: null,
    index: true,
  },
  primaryMemberProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FamilyMember",
    default: null,
  },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model("User", userSchema);
