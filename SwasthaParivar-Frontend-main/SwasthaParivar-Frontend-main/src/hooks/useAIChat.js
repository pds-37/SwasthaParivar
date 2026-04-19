import { useMemo } from "react";
import useSWR from "swr";

import api from "../lib/api";

export const useAIChat = () => {
  const swr = useSWR("/ai/memory", () => api.get("/ai/memory"));

  const threads = useMemo(() => {
    if (Array.isArray(swr.data?.threads)) return swr.data.threads;
    if (Array.isArray(swr.data?.data?.threads)) return swr.data.data.threads;
    return [];
  }, [swr.data]);

  const saveMemory = async (payload) => {
    const res = await api.post("/ai/memory", payload);
    swr.mutate();
    return res;
  };

  const deleteThread = async (id) => {
    await api.delete(`/ai/memory/${id}`);
    swr.mutate();
  };

  return {
    threads,
    loading: swr.isLoading,
    error: swr.error,
    mutate: swr.mutate,
    saveMemory,
    deleteThread,
  };
};

export default useAIChat;
