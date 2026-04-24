import { useMemo } from "react";
import useSWR from "swr";

import api from "../lib/api";
import { apiRetryConfig } from "../lib/swr";

const fetchReports = () => api.get("/reports");

export const useReports = () => {
  const swr = useSWR("reports", fetchReports, apiRetryConfig);

  const reports = useMemo(() => {
    if (Array.isArray(swr.data)) return swr.data;
    if (Array.isArray(swr.data?.reports)) return swr.data.reports;
    if (Array.isArray(swr.data?.data)) return swr.data.data;
    return [];
  }, [swr.data]);

  const uploadReport = async (formData) => {
    const created = await api.post("/reports/upload", formData, {
      suppressErrorToast: true,
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

  const analyzeReport = async (reportId) => {
    const analyzed = await api.post(`/reports/${reportId}/analyse`, {}, { suppressErrorToast: true });
    await swr.mutate((previous) => {
      const current = Array.isArray(previous) ? previous : previous?.reports || [];
      return current.map((report) => (report.id === analyzed.id ? analyzed : report));
    }, false);
    swr.mutate();
    return analyzed;
  };

  return {
    reports,
    loading: swr.isLoading,
    error: swr.error,
    mutate: swr.mutate,
    uploadReport,
    analyzeReport,
  };
};

export default useReports;
