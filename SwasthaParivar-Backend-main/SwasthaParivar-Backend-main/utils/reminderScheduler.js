import cron from "node-cron";
import Reminder from "../models/Reminder.js";

/**
 * This scheduler runs every minute (for dev) or once per day (for prod).
 * For production set schedule to '0 7 * * *' to run every day at 07:00 server time.
 *
 * We'll implement a safe worker:
 *  - find active reminders where nextRunAt <= now
 *  - for each reminder: "deliver" it (store log/mark lastTriggeredAt)
 *  - compute nextRunAt based on frequency and save
 *
 * Delivery: currently we only update DB. Later you can call push services.
 */

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
      const target = (typeof options.weekday === "number") ? options.weekday : next.getDay();
      const delta = (target - next.getDay() + 7) % 7 || 7;
      next.setDate(next.getDate() + delta);
      break;
    }
    case "monthly": {
      const dom = options.dayOfMonth || next.getDate();
      next.setMonth(next.getMonth() + 1);
      const days = new Date(next.getFullYear(), next.getMonth()+1, 0).getDate();
      next.setDate(Math.min(dom, days));
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

export function startReminderScheduler({ env = "dev" } = {}) {
  // dev: run every minute -> quick testing
  // prod: run at 07:00 every day -> '0 7 * * *'
  const schedule = env === "prod" ? "0 7 * * *" : "*/1 * * * *"; // every minute in dev

  console.log("Reminder scheduler starting with schedule:", schedule);

  cron.schedule(schedule, async () => {
    const now = new Date();
    try {
      // Find active reminders due now or earlier
      const due = await Reminder.find({
        active: true,
        nextRunAt: { $lte: now },
      }).limit(200).exec();

      if (!due.length) return;

      console.log(`Reminder Scheduler: found ${due.length} due reminders`);

      for (const rem of due) {
        // "deliver" — for now we update lastTriggeredAt; later push to notification collection or service
        try {
          // TODO: integrate real push here (websocket, push notifications, emails)
          console.log("Triggering reminder:", rem._id.toString(), rem.title);

          rem.lastTriggeredAt = new Date();

          if (rem.frequency && rem.frequency !== "once") {
            rem.nextRunAt = computeNextRun(rem.nextRunAt || new Date(), rem.frequency, rem.options || {});
          } else {
            rem.active = false;
          }

          await rem.save();

          // Optionally write to a Notification collection (not implemented here)
        } catch (e) {
          console.error("Reminder trigger failed for", rem._id, e);
        }
      }
    } catch (err) {
      console.error("Reminder Scheduler error:", err);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // optional, set to your timezone
  });
}
