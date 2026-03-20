// models/user.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  password: { type: String, required: true },
  pushSubscription: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model("User", userSchema);
