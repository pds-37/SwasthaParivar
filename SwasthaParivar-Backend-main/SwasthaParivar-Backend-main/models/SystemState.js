import mongoose from "mongoose";

const systemStateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  { timestamps: true }
);

const SystemState = mongoose.model("SystemState", systemStateSchema);

export default SystemState;
