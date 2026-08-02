import mongoose from "mongoose";
import dotenv from "dotenv";
import { generateRemedy } from "./SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/controllers/remedyController.js";
dotenv.config({ path: "./SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/.env" });

const req = {
  body: { query: "Priyanshu Tiwari profile check", memberId: "family" },
  userId: "662b2e8d7f8d6a001b3f9b8c" // fake
};
const res = {
  status: (code) => ({
    json: (data) => console.log(JSON.stringify({code, data}, null, 2))
  }),
  json: (data) => console.log(JSON.stringify(data, null, 2))
};

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/swasthaparivar")
  .then(() => generateRemedy(req, res))
  .catch(console.error)
  .finally(() => mongoose.disconnect());
