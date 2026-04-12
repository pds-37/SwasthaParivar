import mongoose from "mongoose";

const deviceConnectionSchema = new mongoose.Schema({
  householdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Household",
    required: true,
    index: true,
  },
  memberProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FamilyMember",
    required: true,
    index: true,
  },
  linkedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  provider: {
    type: String,
    enum: ["healthkit", "health_connect", "fitbit", "manual"],
    required: true,
  },
  status: {
    type: String,
    enum: ["not_connected", "pending", "connected", "revoked", "error"],
    default: "not_connected",
    index: true,
  },
  externalAccountId: {
    type: String,
    default: "",
    trim: true,
    maxlength: 180,
  },
  sharingScope: {
    type: String,
    enum: ["private", "summary", "full"],
    default: "summary",
  },
  lastSyncedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

deviceConnectionSchema.index({ memberProfileId: 1, provider: 1 }, { unique: true });

export default mongoose.models.DeviceConnection ||
  mongoose.model("DeviceConnection", deviceConnectionSchema);
