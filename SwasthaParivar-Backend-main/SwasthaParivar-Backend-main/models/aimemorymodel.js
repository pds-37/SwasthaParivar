import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "ai"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      default: "",
    },
    ts: {
      type: Number,
      default: () => Date.now(),
    },
    attachment: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const aiMemorySchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    member: {
      type: String,
      required: true,
      trim: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

aiMemorySchema.index({ ownerId: 1, member: 1 }, { unique: true });

export default mongoose.models.AIMemory ||
  mongoose.model("AIMemory", aiMemorySchema);
