export const PLAN_LIMITS = {
  free: {
    maxMembers: 3,
    aiChatsPerDay: 10,
    recordHistoryDays: 30,
    reportAiAnalysis: false,
    trendAlerts: false,
  },
  pro: {
    maxMembers: Number.POSITIVE_INFINITY,
    aiChatsPerDay: Number.POSITIVE_INFINITY,
    recordHistoryDays: Number.POSITIVE_INFINITY,
    reportAiAnalysis: true,
    trendAlerts: true,
  },
  family: {
    maxMembers: Number.POSITIVE_INFINITY,
    aiChatsPerDay: Number.POSITIVE_INFINITY,
    recordHistoryDays: Number.POSITIVE_INFINITY,
    reportAiAnalysis: true,
    trendAlerts: true,
  },
};

const VALID_PLANS = new Set(Object.keys(PLAN_LIMITS));

export const normalizePlan = (value = "free") => {
  const plan = String(value || "").trim().toLowerCase();
  return VALID_PLANS.has(plan) ? plan : "free";
};

export const getEffectivePlan = (user = {}) => {
  const plan = normalizePlan(user?.plan);
  const expiresAt = user?.proExpiresAt ? new Date(user.proExpiresAt) : null;

  if (
    plan !== "free" &&
    expiresAt &&
    !Number.isNaN(expiresAt.getTime()) &&
    expiresAt.getTime() < Date.now()
  ) {
    return "free";
  }

  return plan;
};

export const getPlanLimits = (userOrPlan = "free") =>
  PLAN_LIMITS[
    typeof userOrPlan === "string"
      ? normalizePlan(userOrPlan)
      : getEffectivePlan(userOrPlan)
  ] || PLAN_LIMITS.free;

