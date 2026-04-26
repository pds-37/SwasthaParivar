import { getEffectivePlan } from "../utils/planState.js";

export const FLAGS = {
  STREAMING_AI: { enabled: true, plans: ["free", "pro", "family"] },
  REPORT_AI_ANALYSIS: { enabled: true, plans: ["free", "pro", "family"] },
  TREND_ALERTS: { enabled: true, plans: ["free", "pro", "family"] },
  WEEKLY_DIGEST: { enabled: true, plans: ["free", "pro", "family"] },
  WEARABLE_SYNC: { enabled: false, plans: ["pro", "family"] },
  COMMUNITY: { enabled: false, plans: ["pro", "family"] },
  HINDI_AI: { enabled: true, plans: ["free", "pro", "family"] },
  VOICE_INPUT: { enabled: true, plans: ["free", "pro", "family"] },
};

export function isEnabled(flagName, userPlan = "free") {
  const flag = FLAGS[flagName];
  if (!flag) {
    return false;
  }

  return Boolean(flag.enabled && flag.plans.includes(String(userPlan || "free").toLowerCase()));
}

export function getResolvedFlags(userOrPlan = "free") {
  const plan =
    typeof userOrPlan === "string"
      ? userOrPlan
      : getEffectivePlan(userOrPlan);

  return Object.fromEntries(
    Object.keys(FLAGS).map((flagName) => [flagName, isEnabled(flagName, plan)])
  );
}

export default FLAGS;
