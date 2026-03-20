import mongoose from "mongoose";

export async function connectDB(uri) {
  if (!uri) {
    throw new Error("MONGO_URI not provided");
  }

  try {
    await mongoose.connect(uri, {
      family: 4, // ✅ FORCE IPv4 (THIS FIXES YOUR ERROR)
    });

    console.log("🔥 MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Error:", err);
    throw err;
  }
}