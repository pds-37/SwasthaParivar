import mongoose from "mongoose";
import User from "../models/user.js";
import dotenv from "dotenv";

dotenv.config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");
    
    const targetEmail = "aiagentuse@gmail.com";
    const found = await User.findOne({ email: targetEmail });
    if (found) {
      console.log(`FOUND: ${targetEmail}`);
      console.log(found);
    } else {
      console.log(`NOT FOUND: ${targetEmail}`);
    }
    
    const count = await User.countDocuments();
    console.log(`Total users: ${count}`);
    
    const users = await User.find({}, { email: 1, referralCode: 1, googleId: 1 }).limit(10);
    console.log("Last 10 users:");
    users.forEach(u => console.log(`- ${u.email} (Ref: ${u.referralCode}, Google: ${u.googleId})`));
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkUsers();
