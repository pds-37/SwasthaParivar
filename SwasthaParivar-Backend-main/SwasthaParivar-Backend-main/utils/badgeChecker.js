import AIMemory from "../models/aimemorymodel.js";
import FamilyMember from "../models/familymembermodel.js";
import HouseholdInvite from "../models/householdinvitemodel.js";
import Reminder from "../models/remindermodel.js";
import Report from "../models/reportmodel.js";
import User from "../models/user.js";

const HEALTH_METRICS = [
  "bloodPressure",
  "heartRate",
  "bloodSugar",
  "weight",
  "sleep",
  "steps",
];

const BADGES = [
  {
    id: "first_record",
    label: "First Step",
    desc: "Logged your first health record",
    check: async (userId) => (await getUniqueHealthDays(userId)).length >= 1,
  },
  {
    id: "week_streak",
    label: "7-Day Streak",
    desc: "Logged records for 7 days in a row",
    check: async (userId) => checkHealthStreak(userId, 7),
  },
  {
    id: "month_streak",
    label: "30-Day Streak",
    desc: "Logged records for 30 days in a row",
    check: async (userId) => checkHealthStreak(userId, 30),
  },
  {
    id: "family_builder",
    label: "Family Builder",
    desc: "Added 3 or more family members",
    check: async (userId) =>
      FamilyMember.countDocuments({
        managedByUserId: userId,
        profileType: "dependent",
        profileStatus: { $ne: "archived" },
      }).then((count) => count >= 3),
  },
  {
    id: "report_uploader",
    label: "Report Ready",
    desc: "Uploaded your first medical report",
    check: async (userId) => Report.countDocuments({ ownerId: userId }).then((count) => count >= 1),
  },
  {
    id: "reminder_setter",
    label: "On Schedule",
    desc: "Created 5 or more reminders",
    check: async (userId) =>
      Reminder.countDocuments({ ownerId: userId, deletedAt: null }).then((count) => count >= 5),
  },
  {
    id: "ai_user",
    label: "Health Curious",
    desc: "Asked the AI 10 health questions",
    check: async (userId) => {
      const threads = await AIMemory.find({ ownerId: userId }).select("messages").lean();
      const questionCount = threads.reduce(
        (count, thread) =>
          count +
          (Array.isArray(thread?.messages)
            ? thread.messages.filter((message) => message?.sender === "user").length
            : 0),
        0
      );
      return questionCount >= 10;
    },
  },
  {
    id: "inviter",
    label: "Family First",
    desc: "Invited a family member",
    check: async (userId) =>
      HouseholdInvite.exists({
        createdByUserId: userId,
        acceptedByUserId: { $ne: null },
      }).then(Boolean),
  },
];

const toDayKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const getAccessibleHealthMembers = async (userId) =>
  FamilyMember.find({
    $or: [{ user: userId }, { linkedUserId: userId }, { managedByUserId: userId }],
    profileStatus: { $ne: "archived" },
  })
    .select("health")
    .lean();

const collectMemberHealthDays = (member = {}) => {
  const dayKeys = new Set();

  HEALTH_METRICS.forEach((metric) => {
    const entries = Array.isArray(member?.health?.[metric]) ? member.health[metric] : [];
    entries.forEach((entry) => {
      const key = toDayKey(entry?.date);
      if (key) {
        dayKeys.add(key);
      }
    });
  });

  return dayKeys;
};

async function getUniqueHealthDays(userId) {
  const members = await getAccessibleHealthMembers(userId);
  const uniqueDays = new Set();

  members.forEach((member) => {
    collectMemberHealthDays(member).forEach((dayKey) => uniqueDays.add(dayKey));
  });

  return Array.from(uniqueDays).sort((left, right) => right.localeCompare(left));
}

async function checkHealthStreak(userId, days) {
  const uniqueDays = await getUniqueHealthDays(userId);
  if (uniqueDays.length < days) {
    return false;
  }

  let streak = 0;
  let previousDate = null;

  for (const dayKey of uniqueDays) {
    const currentDate = new Date(dayKey);
    if (Number.isNaN(currentDate.getTime())) {
      continue;
    }

    if (!previousDate) {
      previousDate = currentDate;
      streak = 1;
    } else {
      const diffDays = Math.round((previousDate - currentDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak += 1;
        previousDate = currentDate;
      } else if (diffDays === 0) {
        previousDate = currentDate;
      } else {
        break;
      }
    }

    if (streak >= days) {
      return true;
    }
  }

  return streak >= days;
}

export async function checkAndAwardBadges(userId) {
  const user = await User.findById(userId).select("badges");
  if (!user) {
    return [];
  }

  const existingIds = new Set((user.badges || []).map((badge) => badge.id));
  const newBadges = [];

  for (const badge of BADGES) {
    if (existingIds.has(badge.id)) {
      continue;
    }

    try {
      const earned = await badge.check(userId);
      if (earned) {
        newBadges.push({
          id: badge.id,
          label: badge.label,
          desc: badge.desc,
          earnedAt: new Date(),
        });
      }
    } catch {
      // Individual badge checks should not block the request path.
    }
  }

  if (newBadges.length > 0) {
    await User.findByIdAndUpdate(userId, {
      $push: {
        badges: {
          $each: newBadges,
        },
      },
    });
  }

  return newBadges;
}

export default checkAndAwardBadges;
