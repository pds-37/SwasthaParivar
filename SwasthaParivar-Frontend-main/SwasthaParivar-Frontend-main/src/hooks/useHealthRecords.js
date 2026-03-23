import { useMemo } from "react";
import useSWR from "swr";

import api from "../lib/api";

export const useHealthRecords = (memberId) => {
  const swr = useSWR(
    memberId ? `health-${memberId}` : null,
    () => api.get(`/health/${memberId}`),
    { revalidateOnFocus: false }
  );

  const records = useMemo(() => {
    if (Array.isArray(swr.data)) return swr.data;
    if (Array.isArray(swr.data?.records)) return swr.data.records;
    if (Array.isArray(swr.data?.data)) return swr.data.data;
    return [];
  }, [swr.data]);

  return {
    records,
    loading: swr.isLoading,
    error: swr.error,
    mutate: swr.mutate,
  };
};

export default useHealthRecords;
