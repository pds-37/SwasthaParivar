import { useMemo } from "react";
import useSWR from "swr";

import api from "../lib/api";
import { apiRetryConfig } from "../lib/swr";

const fetchMembers = () => api.get("/members");

export const useMembers = () => {
  const swr = useSWR("members", fetchMembers, apiRetryConfig);

  const members = useMemo(() => {
    if (Array.isArray(swr.data)) return swr.data;
    if (Array.isArray(swr.data?.members)) return swr.data.members;
    if (Array.isArray(swr.data?.data)) return swr.data.data;
    return [];
  }, [swr.data]);

  const createMember = async (payload) => {
    const created = await api.post("/members", payload);
    await swr.mutate((previous) => {
      const current = Array.isArray(previous) ? previous : previous?.members || [];
      return [created, ...current];
    }, false);
    swr.mutate();
    return created;
  };

  const deleteMember = async (memberId) => {
    await api.delete(`/members/${memberId}`);
    await swr.mutate((previous) => {
      const current = Array.isArray(previous) ? previous : previous?.members || [];
      return current.filter((member) => member._id !== memberId);
    }, false);
    swr.mutate();
  };

  return {
    members,
    loading: swr.isLoading,
    error: swr.error,
    mutate: swr.mutate,
    createMember,
    deleteMember,
  };
};

export default useMembers;
