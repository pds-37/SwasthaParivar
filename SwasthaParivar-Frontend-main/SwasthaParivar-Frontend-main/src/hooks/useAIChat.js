import { useMemo } from "react";
import useSWR from "swr";

import api from "../lib/api";

export const useAIChat = (memberContext) => {
  const swr = useSWR(
    memberContext ? `ai-memory-${memberContext}` : null,
    () => api.get(`/ai/memory?member=${encodeURIComponent(memberContext)}`),
    { revalidateOnFocus: false }
  );

  const messages = useMemo(() => {
    if (Array.isArray(swr.data?.messages)) return swr.data.messages;
    if (Array.isArray(swr.data?.data?.messages)) return swr.data.data.messages;
    return [];
  }, [swr.data]);

  const saveMemory = async (payload) => {
    await api.post("/ai/memory", payload);
    swr.mutate();
  };

  return {
    messages,
    loading: swr.isLoading,
    error: swr.error,
    mutate: swr.mutate,
    saveMemory,
  };
};

export default useAIChat;
