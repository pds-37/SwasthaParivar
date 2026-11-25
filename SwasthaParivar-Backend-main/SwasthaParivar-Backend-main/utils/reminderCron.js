import cron from "node-cron";
import mongoose from "mongoose";
import Reminder from "../models/remindermodel.js";
import User from "../models/user.js";
import { sendPush } from "../controllers/notificationController.js";
import { logger } from "./logger.js";

const MAX_DELIVERY_RETRIES = 2;

export function computeNextRun(currentDate = new Date(), frequency, options = {}) {
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
    case "once":
    default:
      break;
  }

  return next;
}

let isReminderCycleRunning = false;

export async function runDueReminders(now = new Date()) {
  if (isReminderCycleRunning) {
    logger.warn({ route: "reminder-cron" }, "Skipping overlapping reminder cycle");
    return { skipped: true, processed: 0 };
  }

  if (mongoose.connection.readyState !== 1) {
    return { skipped: true, reason: "DB_NOT_CONNECTED", processed: 0 };
  }

  isReminderCycleRunning = true;
  let processed = 0;

  try {
    const reminders = await Reminder.find({
      active: true,
      deletedAt: null,
      nextRunAt: mongoose.trusted({ $lte: now }),
    })
      .limit(200)
      .exec();

    if (!reminders.length) {
      return { skipped: false, processed: 0 };
    }

    for (const reminder of reminders) {
      try {
        const user = await User.findById(reminder.ownerId).select(
          "email pushSubscriptions preferences"
        );

        let shouldAdvance = true;

        if (user && user.preferences?.reminderNotifications !== false) {
          const delivery = await sendPush(
            user,
            `Reminder: ${reminder.title}`,
            reminder.description || `It's time for your ${reminder.category} reminder`,
            {
              tag: `reminder-${reminder._id}`,
              url: "/reminders",
              data: { reminderId: String(reminder._id) },
              actions: [
                { action: "view", title: "View details" },
                { action: "dismiss", title: "Dismiss" },
              ],
            }
          );

          const retryCount = Number(reminder.meta?.retryCount || 0);
          if (!delivery.skipped && delivery.delivered === 0 && delivery.failed > 0 && retryCount < MAX_DELIVERY_RETRIES) {
            reminder.meta = { ...(reminder.meta || {}), retryCount: retryCount + 1, lastDeliveryErrorAt: now.toISOString() };
            reminder.nextRunAt = new Date(now.getTime() + 60 * 1000);
            shouldAdvance = false;
          } else {
            reminder.meta = { ...(reminder.meta || {}), retryCount: 0 };
          }
        }

        if (shouldAdvance) {
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
        }

        await reminder.save();
        processed += 1;
      } catch (itemError) {
        logger.error(
          { route: "reminder-cron", reminderId: String(reminder._id || ""), err: itemError?.message },
          "Failed processing individual reminder"
        );
      }
    }

    return { skipped: false, processed };
  } catch (error) {
    logger.error(
      {
        route: "reminder-cron",
        error: {
          message: error?.message || "Reminder cron failed",
          stack: error?.stack || null,
        },
      },
      "Reminder cron cycle failed"
    );
    return { skipped: false, processed, error: error?.message };
  } finally {
    isReminderCycleRunning = false;
  }
}

let scheduledTask = null;

export function startReminderScheduler() {
  if (scheduledTask) {
    return scheduledTask;
  }

  scheduledTask = cron.schedule("* * * * *", () => runDueReminders(new Date()), {
    scheduled: true,
    timezone: "Asia/Kolkata",
  });

  logger.info(
    { route: "reminder-cron", timezone: "Asia/Kolkata" },
    "Authoritative reminder cron scheduler is active"
  );
  return scheduledTask;
}

export function stopReminderScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

// Automatically initialize once when imported by server.js (unless inside unit tests)
if (process.env.NODE_ENV !== "test" && !process.env.NODE_TEST_CONTEXT) {
  startReminderScheduler();
}
