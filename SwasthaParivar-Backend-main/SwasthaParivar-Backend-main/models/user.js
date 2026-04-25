// models/user.js
import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    trim: true,
    maxlength: 40,
  },
  label: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  desc: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  earnedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

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
    unique: true,
    sparse: true,
  },
  avatarUrl: {
    type: String,
    default: null,
  },
  onboardingComplete: {
    type: Boolean,
    default: false,
  },
  plan: {
    type: String,
    enum: ["free", "pro", "family"],
    default: "free",
    index: true,
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    maxlength: 12,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  referralCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  proExpiresAt: {
    type: Date,
    default: null,
  },
  preferences: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
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
  badges: {
    type: [badgeSchema],
    default: [],
  },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model("User", userSchema);
