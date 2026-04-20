import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './utils/db.js';
import User from './models/user.js';
import HouseholdService from './services/household/HouseholdService.js';

async function main() {
  mongoose.set('debug', true);
  try {
    await connectDB(process.env.MONGO_URI);
    const user = await User.findOne();
    if (!user) {
      console.error('No user found in database. Please create a user first.');
      process.exit(0);
    }
    console.log('Testing with user:', user.email, user._id);
    try {
      const context = await HouseholdService.ensureUserHouseholdContext(user._id);
      console.log('Success!', !!context);
      if (context) {
        console.log('Household ID:', context.household._id);
        console.log('Self Member ID:', context.selfMember._id);
      }
    } catch (e) {
      console.error('Error during context initialization:', e);
    }
  } catch (error) {
    console.error('Error in ensureUserHouseholdContext:', error);
  } finally {
    process.exit(0);
  }
}

main();
