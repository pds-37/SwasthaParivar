import { useMemo } from "react";
import useSWR from "swr";

import api from "../lib/api";

const fetchReminders = () => api.get("/reminders");

export const useReminders = () => {
  const swr = useSWR("reminders", fetchReminders, {
    revalidateOnFocus: false,
  });

  const reminders = useMemo(() => {
    if (Array.isArray(swr.data)) return swr.data;
    if (Array.isArray(swr.data?.reminders)) return swr.data.reminders;
    if (Array.isArray(swr.data?.data)) return swr.data.data;
    return [];
  }, [swr.data]);

  const createReminder = async (payload) => {
    const created = await api.post("/reminders", payload);
    swr.mutate((previous) => {
      const current = Array.isArray(previous) ? previous : previous?.reminders || [];
      return [created, ...current];
    }, false);
    swr.mutate();
    return created;
  };

  const deleteReminder = async (reminderId) => {
    await api.delete(`/reminders/${reminderId}`);
    swr.mutate((previous) => {
      const current = Array.isArray(previous) ? previous : previous?.reminders || [];
      return current.filter((reminder) => reminder._id !== reminderId);
    }, false);
    swr.mutate();
  };

  return {
    reminders,
    loading: swr.isLoading,
    error: swr.error,
    mutate: swr.mutate,
    createReminder,
    deleteReminder,
  };
};

export default useReminders;
