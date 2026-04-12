import { useMemo } from "react";
import useSWR from "swr";

import api from "../lib/api";
import { apiRetryConfig } from "../lib/swr";

const fetchHousehold = () => api.get("/households/me");

export const useHousehold = () => {
  const swr = useSWR("household", fetchHousehold, apiRetryConfig);

  const household = useMemo(() => swr.data?.household || null, [swr.data]);
  const selfMember = useMemo(() => swr.data?.selfMember || null, [swr.data]);
  const memberships = useMemo(
    () => (Array.isArray(swr.data?.memberships) ? swr.data.memberships : []),
    [swr.data]
  );
  const pendingInvites = useMemo(
    () => (Array.isArray(swr.data?.pendingInvites) ? swr.data.pendingInvites : []),
    [swr.data]
  );

  const createInvite = async (payload) => {
    const created = await api.post("/households/invitations", payload);
    await swr.mutate();
    return created;
  };

  const acceptInvite = async (code) => {
    const accepted = await api.post("/households/invitations/accept", { code });
    await swr.mutate();
    return accepted;
  };

  return {
    household,
    selfMember,
    memberships,
    pendingInvites,
    loading: swr.isLoading,
    error: swr.error,
    mutate: swr.mutate,
    createInvite,
    acceptInvite,
  };
};

export default useHousehold;
