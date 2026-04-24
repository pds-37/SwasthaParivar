import { useMemo } from "react";
import useSWR from "swr";

import api from "../lib/api";
import { apiRetryConfig } from "../lib/swr";

const DEFAULT_FLAGS = {
  STREAMING_AI: false,
  REPORT_AI_ANALYSIS: false,
  TREND_ALERTS: false,
  WEEKLY_DIGEST: false,
  WEARABLE_SYNC: false,
  COMMUNITY: false,
  HINDI_AI: false,
  VOICE_INPUT: false,
};

const fetchFeatureFlags = () => api.get("/config/flags");

export function useFeatureFlags() {
  const swr = useSWR("feature-flags", fetchFeatureFlags, apiRetryConfig);

  const flags = useMemo(
    () => ({
      ...DEFAULT_FLAGS,
      ...(swr.data?.flags || {}),
    }),
    [swr.data]
  );

  return {
    flags,
    plan: swr.data?.plan || "free",
    privacyPolicyVersion: swr.data?.privacyPolicyVersion || "v1.0",
    loading: swr.isLoading,
    error: swr.error,
    mutate: swr.mutate,
    isEnabled: (flagName) => Boolean(flags[flagName]),
  };
}

export default useFeatureFlags;
