import mongoose from "mongoose";

const consentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    version: {
      type: String,
      required: true,
      trim: true,
      maxlength: 24,
    },
    givenAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    purposes: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

consentSchema.index({ userId: 1, version: 1 }, { unique: true });

export default mongoose.models.Consent || mongoose.model("Consent", consentSchema);
