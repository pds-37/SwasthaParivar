import cron from "node-cron";
import Reminder from "../models/remindermodel.js";
import User from "../models/user.js";
import { sendPush } from "../controllers/notificationController.js";

// Runs every minute
cron.schedule("* * * * *", async () => {
  const now = new Date();

  try {
    // Find reminders that are due RIGHT NOW or earlier
    const reminders = await Reminder.find({
      active: true,
      deletedAt: null,
      nextRunAt: { $lte: now }
    });

    for (const r of reminders) {
      const user = await User.findById(r.ownerId);
      if (!user) continue;

      // --- SEND PUSH ---
      await sendPush(
        user,
        `⏰ ${r.title}`,
        `It's time for your ${r.category} reminder`
      );

      // --- RESCHEDULE ---
      if (r.frequency === "once") {
        r.active = false; // deactivate one-time reminders
      }

      if (r.frequency === "daily") {
        r.nextRunAt.setDate(r.nextRunAt.getDate() + 1);
      }

      if (r.frequency === "weekly") {
        r.nextRunAt.setDate(r.nextRunAt.getDate() + 7);
      }

      if (r.frequency === "monthly") {
        r.nextRunAt.setMonth(r.nextRunAt.getMonth() + 1);
      }

      if (r.frequency === "yearly") {
        r.nextRunAt.setFullYear(r.nextRunAt.getFullYear() + 1);
      }

      await r.save();
    }

  } catch (err) {
    console.error("CRON ERROR:", err);
  }
});

console.log("⏳ Reminder Cron Job is running every 1 minute...");
