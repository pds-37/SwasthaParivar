import { useMemo } from "react";
import useSWR from "swr";

import api from "../lib/api";

const fetchReports = () => api.get("/reports");

export const useReports = () => {
  const swr = useSWR("reports", fetchReports, {
    revalidateOnFocus: false,
  });

  const reports = useMemo(() => {
    if (Array.isArray(swr.data)) return swr.data;
    if (Array.isArray(swr.data?.reports)) return swr.data.reports;
    if (Array.isArray(swr.data?.data)) return swr.data.data;
    return [];
  }, [swr.data]);

  const uploadReport = async (formData) => {
    const created = await api.post("/reports/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    await swr.mutate((previous) => {
      const current = Array.isArray(previous) ? previous : previous?.reports || [];
      return [created, ...current];
    }, false);

    swr.mutate();
    return created;
  };

  return {
    reports,
    loading: swr.isLoading,
    error: swr.error,
    mutate: swr.mutate,
    uploadReport,
  };
};

export default useReports;
