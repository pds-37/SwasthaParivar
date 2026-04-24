import cron from "node-cron";

import User from "../models/user.js";
import FamilyMember from "../models/familymembermodel.js";
import Reminder from "../models/remindermodel.js";
import { sendPush } from "../controllers/notificationController.js";
import { sendEmail } from "../utils/email.js";
import { logger } from "../utils/logger.js";

const HEALTH_METRICS = [
  "bloodPressure",
  "heartRate",
  "bloodSugar",
  "weight",
  "sleep",
  "steps",
];

const ACTIVE_PROFILE_FILTER = { $ne: "archived" };
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const toDayKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const collectWeeklyHealthDays = (member, weekAgo) => {
  const dayKeys = new Set();

  HEALTH_METRICS.forEach((metric) => {
    const entries = Array.isArray(member?.health?.[metric]) ? member.health[metric] : [];
    entries.forEach((entry) => {
      const date = new Date(entry?.date);
      if (Number.isNaN(date.getTime()) || date < weekAgo) {
        return;
      }

      const key = toDayKey(date);
      if (key) {
        dayKeys.add(key);
      }
    });
  });

  return dayKeys.size;
};

const getMemberFilter = (user) =>
  user?.activeHouseholdId
    ? {
        householdId: user.activeHouseholdId,
        profileStatus: ACTIVE_PROFILE_FILTER,
      }
    : {
        $or: [{ user: user._id }, { linkedUserId: user._id }],
        profileStatus: ACTIVE_PROFILE_FILTER,
      };

async function generateDigest(user) {
  const weekAgo = new Date(Date.now() - WEEK_MS);
  const members = await FamilyMember.find(getMemberFilter(user)).select("name health").lean();

  if (!members.length) {
    return null;
  }

  const overdueReminderFilter = user?.activeHouseholdId
    ? {
        householdId: user.activeHouseholdId,
        active: true,
        deletedAt: null,
        nextRunAt: { $lt: new Date() },
      }
    : {
        ownerId: user._id,
        active: true,
        deletedAt: null,
        nextRunAt: { $lt: new Date() },
      };

  const overdueReminders = await Reminder.find(overdueReminderFilter)
    .select("memberId title")
    .lean();

  const lines = [];

  members.forEach((member) => {
    const weeklyRecordCount = collectWeeklyHealthDays(member, weekAgo);
    const memberOverdueReminders = overdueReminders.filter(
      (reminder) => String(reminder?.memberId || "") === String(member?._id || "")
    );

    if (weeklyRecordCount === 0 && memberOverdueReminders.length === 0) {
      return;
    }

    lines.push(`${member.name}:`);
    if (weeklyRecordCount > 0) {
      lines.push(`  - ${weeklyRecordCount} health record day(s) logged this week`);
    }
    if (memberOverdueReminders.length > 0) {
      lines.push(
        `  - ${memberOverdueReminders.length} overdue reminder(s): ${memberOverdueReminders
          .map((reminder) => reminder.title)
          .join(", ")}`
      );
    }
  });

  if (!lines.length) {
    return null;
  }

  return `Your family's health this week:\n\n${lines.join("\n")}`;
}

async function runWeeklyDigest() {
  logger.info({ route: "weekly-digest" }, "Weekly digest run started");

  const users = await User.find({}).select("email pushSubscription activeHouseholdId");

  for (const user of users) {
    try {
      const digest = await generateDigest(user);
      if (!digest) {
        continue;
      }

      await Promise.allSettled([
        sendPush(user, "SwasthaParivar - Weekly Health Digest", digest.split("\n")[0]),
        sendEmail({
          to: user.email,
          subject: "SwasthaParivar Weekly Health Digest",
          text: digest,
          html: `<pre style="font-family:inherit;white-space:pre-wrap">${digest}</pre>`,
        }),
      ]);
    } catch (error) {
      logger.error({
        route: "weekly-digest",
        userId: String(user?._id || ""),
        error: {
          message: error?.message || "Weekly digest failed",
          stack: error?.stack || null,
        },
      });
    }
  }

  logger.info({ route: "weekly-digest" }, "Weekly digest run completed");
}

cron.schedule("0 9 * * 1", runWeeklyDigest, {
  timezone: "Asia/Kolkata",
});

logger.info(
  { route: "weekly-digest", schedule: "0 9 * * 1", timezone: "Asia/Kolkata" },
  "Weekly digest cron job is registered"
);

export { generateDigest, runWeeklyDigest };
