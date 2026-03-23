import cron from "node-cron";
import mongoose from "mongoose";
import Reminder from "../models/remindermodel.js";
import User from "../models/user.js";
import { sendPush } from "../controllers/notificationController.js";
import { logger } from "./logger.js";

function computeNextRun(currentDate = new Date(), frequency, options = {}) {
  const next = new Date(currentDate);

  if (options.time) {
    const [hh, mm] = options.time.split(":").map(Number);
    next.setHours(hh ?? 9, mm ?? 0, 0, 0);
  }

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly": {
      const target = typeof options.weekday === "number" ? options.weekday : next.getDay();
      const delta = (target - next.getDay() + 7) % 7 || 7;
      next.setDate(next.getDate() + delta);
      break;
    }
    case "monthly": {
      const dom = options.dayOfMonth || next.getDate();
      next.setMonth(next.getMonth() + 1);
      const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(dom, daysInMonth));
      break;
    }
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      break;
  }

  return next;
}

cron.schedule("* * * * *", async () => {
  const now = new Date();

  try {
    const reminders = await Reminder.find({
      active: true,
      deletedAt: null,
      nextRunAt: mongoose.trusted({ $lte: now }),
    })
      .limit(200)
      .exec();

    if (!reminders.length) {
      return;
    }

    for (const reminder of reminders) {
      const user = await User.findById(reminder.ownerId);
      if (!user) continue;

      await sendPush(
        user,
        `Reminder: ${reminder.title}`,
        `It's time for your ${reminder.category} reminder`
      );

      reminder.lastTriggeredAt = now;

      if (reminder.frequency && reminder.frequency !== "once") {
        reminder.nextRunAt = computeNextRun(
          reminder.nextRunAt || now,
          reminder.frequency,
          reminder.options || {}
        );
      } else {
        reminder.active = false;
      }

      await reminder.save();
    }
  } catch (error) {
    logger.error({
      route: "reminder-cron",
      error: {
        message: error?.message || "Reminder cron failed",
        stack: error?.stack || null,
      },
    });
  }
});

logger.info({ route: "reminder-cron" }, "Reminder cron job is running every minute");
