/**
 * Consolidated compatibility shim pointing to utils/reminderCron.js
 * Ensures only a single authoritative reminder scheduler runs in production.
 */
export {
  computeNextRun,
  runDueReminders,
  startReminderScheduler,
} from "./reminderCron.js";
