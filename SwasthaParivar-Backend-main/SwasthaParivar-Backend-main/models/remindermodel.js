import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FamilyMember",
    required: false,
  },

  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  title: { type: String, required: true },
  description: { type: String, default: "" },

  category: {
    type: String,
    enum: ["medicine", "vaccination", "checkup", "custom", "followup", "adverse_check", "doctor_handoff"],
    default: "custom",
  },

  frequency: {
    type: String,
    enum: ["once", "daily", "weekly", "monthly", "yearly"],
    default: "once",
  },

  options: {
    weekday: { type: Number },
    dayOfMonth: { type: Number },
    time: { type: String },
  },

  nextRunAt: { type: Date, required: true },

  active: { type: Boolean, default: true },

  meta: { type: mongoose.Schema.Types.Mixed },

  createdAt: { type: Date, default: Date.now },
  lastTriggeredAt: { type: Date },

  deletedAt: { type: Date, default: null },
});

// Index for fast upcoming queries
reminderSchema.index({ ownerId: 1, active: 1, deletedAt: 1, nextRunAt: 1 });

// ⭐ FIX OverwriteModelError
export default mongoose.models.Reminder ||
  mongoose.model("Reminder", reminderSchema);
