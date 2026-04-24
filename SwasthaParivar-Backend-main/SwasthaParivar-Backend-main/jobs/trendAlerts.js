import cron from "node-cron";

import { sendPush } from "../controllers/notificationController.js";
import { getResolvedFlags } from "../config/featureFlags.js";
import AIInsight from "../models/aiinsightmodel.js";
import FamilyMember from "../models/familymembermodel.js";
import User from "../models/user.js";
import { logger } from "../utils/logger.js";

const ACTIVE_PROFILE_FILTER = { $ne: "archived" };
const ALERT_LOOKBACK_WINDOW_MS = 24 * 60 * 60 * 1000;

const METRIC_THRESHOLDS = {
  bloodPressureSystolic: { high: 130, low: 90, unit: "mmHg", label: "blood pressure (systolic)" },
  bloodPressureDiastolic: { high: 80, low: 60, unit: "mmHg", label: "blood pressure (diastolic)" },
  bloodSugar: { high: 140, low: 70, unit: "mg/dL", label: "blood sugar" },
  heartRate: { high: 100, low: 55, unit: "bpm", label: "heart rate" },
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

const parseBloodPressure = (value) => {
  const match = String(value || "").match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (!match) {
    return null;
  }

  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
};

const getMetricValues = (member, metricName) => {
  if (metricName === "bloodPressureSystolic" || metricName === "bloodPressureDiastolic") {
    const entries = Array.isArray(member?.health?.bloodPressure) ? member.health.bloodPressure : [];
    return entries
      .map((entry) => {
        const parsed = parseBloodPressure(entry?.value);
        const value =
          metricName === "bloodPressureSystolic" ? parsed?.systolic : parsed?.diastolic;

        return Number.isFinite(value)
          ? {
              date: entry?.date,
              value,
            }
          : null;
      })
      .filter(Boolean)
      .slice(-5);
  }

  const key = metricName === "heartRate" ? "heartRate" : "bloodSugar";
  const entries = Array.isArray(member?.health?.[key]) ? member.health[key] : [];

  return entries
    .map((entry) => {
      const value = Number(entry?.value);
      return Number.isFinite(value)
        ? {
            date: entry?.date,
            value,
          }
        : null;
    })
    .filter(Boolean)
    .slice(-5);
};

const evaluateTrend = (values, threshold) => {
  if (values.length < 3) {
    return null;
  }

  const allHigh = values.every((entry) => entry.value > threshold.high);
  const allLow = values.every((entry) => entry.value < threshold.low);

  if (!allHigh && !allLow) {
    return null;
  }

  return {
    direction: allHigh ? "above normal" : "below normal",
    readingCount: values.length,
  };
};

async function saveTrendInsight(user, member, message, metricKey) {
  const existing = await AIInsight.findOne({
    ownerId: user._id,
    memberId: member._id,
    adviceSummary: message,
    createdAt: {
      $gte: new Date(Date.now() - ALERT_LOOKBACK_WINDOW_MS),
    },
  });

  if (existing) {
    return existing;
  }

  return AIInsight.create({
    ownerId: user._id,
    memberId: member._id,
    memberLabel: member.name,
    sourceMessage: "trend-alert",
    adviceSummary: message,
    symptoms: [metricKey],
    remedies: [],
  });
}

export async function runTrendAlerts() {
  logger.info({ route: "trend-alerts" }, "Trend alerts run started");

  const users = await User.find({ plan: { $in: ["pro", "family"] } }).select(
    "plan pushSubscription activeHouseholdId"
  );

  for (const user of users) {
    if (!getResolvedFlags(user).TREND_ALERTS) {
      continue;
    }

    const members = await FamilyMember.find(getMemberFilter(user)).select("name health").lean();

    for (const member of members) {
      for (const [metricKey, threshold] of Object.entries(METRIC_THRESHOLDS)) {
        const values = getMetricValues(member, metricKey);
        const trend = evaluateTrend(values, threshold);

        if (!trend) {
          continue;
        }

        const message = `${member.name}'s ${threshold.label} has been ${trend.direction} for ${trend.readingCount} consecutive readings.`;
        await saveTrendInsight(user, member, message, metricKey);
        await sendPush(user, `Health Alert - ${member.name}`, message);
      }
    }
  }

  logger.info({ route: "trend-alerts" }, "Trend alerts run completed");
}

cron.schedule("0 8 * * *", runTrendAlerts, {
  timezone: "Asia/Kolkata",
});

logger.info(
  { route: "trend-alerts", schedule: "0 8 * * *", timezone: "Asia/Kolkata" },
  "Trend alert cron job is registered"
);

export default runTrendAlerts;
