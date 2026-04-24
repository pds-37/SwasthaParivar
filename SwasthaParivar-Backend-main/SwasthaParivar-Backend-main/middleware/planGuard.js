import AIChatLog from "../models/aichatlog.js";
import FamilyMember from "../models/familymembermodel.js";
import { getEffectivePlan, getPlanLimits } from "../utils/planState.js";

const ACTIVE_PROFILE_FILTER = { $ne: "archived" };

const sendPlanError = (
  res,
  {
    status = 403,
    code = "UPGRADE_REQUIRED",
    message = "Upgrade required",
    feature = "",
    upgradeRequired = true,
  } = {}
) =>
  res.status(status).json({
    success: false,
    data: null,
    error: {
      code,
      message,
    },
    meta: null,
    upgradeRequired,
    feature,
  });

const countBillableMembers = async (req) => {
  const householdId = req.householdContext?.household?._id || req.user?.activeHouseholdId || null;

  if (householdId) {
    return FamilyMember.countDocuments({
      householdId,
      profileStatus: ACTIVE_PROFILE_FILTER,
    });
  }

  return FamilyMember.countDocuments({
    $or: [{ user: req.userId }, { linkedUserId: req.userId }, { managedByUserId: req.userId }],
    profileStatus: ACTIVE_PROFILE_FILTER,
  });
};

export function requireFeature(feature) {
  return async (req, res, next) => {
    const plan = getEffectivePlan(req.user);
    const limits = getPlanLimits(plan);

    if (feature === "reportAiAnalysis" && !limits.reportAiAnalysis) {
      return sendPlanError(res, {
        status: 403,
        message: "Report AI analysis is a Pro feature.",
        feature,
      });
    }

    if (feature === "addMember" && Number.isFinite(limits.maxMembers)) {
      const count = await countBillableMembers(req);
      if (count >= limits.maxMembers) {
        return sendPlanError(res, {
          status: 403,
          message: `Free plan is limited to ${limits.maxMembers} family members.`,
          feature,
        });
      }
    }

    if (feature === "aiChat" && Number.isFinite(limits.aiChatsPerDay)) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const count = await AIChatLog.countDocuments({
        ownerId: req.userId,
        feature,
        createdAt: { $gte: startOfDay },
      });

      if (count >= limits.aiChatsPerDay) {
        return sendPlanError(res, {
          status: 429,
          code: "AI_CHAT_LIMIT_REACHED",
          message: `You've used all ${limits.aiChatsPerDay} AI chats for today.`,
          feature,
          upgradeRequired: plan === "free",
        });
      }

      await AIChatLog.create({
        ownerId: req.userId,
        feature,
        route: req.originalUrl || req.path || "",
      });
    }

    return next();
  };
}

export default requireFeature;

