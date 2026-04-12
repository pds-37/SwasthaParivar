import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      default: null,
      index: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyMember",
      required: true,
      index: true,
    },
    reportType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    notes: {
      type: String,
      default: "",
      maxlength: 500,
    },
    aiSummary: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    originalName: {
      type: String,
      required: true,
      maxlength: 255,
    },
    storedFileName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      max: 10 * 1024 * 1024,
    },
    fileBuffer: {
      type: Buffer,
      required: true,
      select: false,
    },
  },
  { timestamps: true }
);

reportSchema.index({ ownerId: 1, createdAt: -1 });
reportSchema.index({ householdId: 1, createdAt: -1 });

export default mongoose.models.Report || mongoose.model("Report", reportSchema);
