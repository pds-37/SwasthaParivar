import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const clearCache = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("No MONGO_URI or MONGODB_URI found in .env");
    return;
  }
  await mongoose.connect(mongoUri);
  const AIInsight = (await import("./models/aiinsightmodel.js")).default;
  const res = await AIInsight.deleteMany({ sourceMessage: { $regex: /^remedy:/ } });
  console.log("Deleted remedy cache:", res.deletedCount);
  await mongoose.disconnect();
};

clearCache().catch(console.error);
