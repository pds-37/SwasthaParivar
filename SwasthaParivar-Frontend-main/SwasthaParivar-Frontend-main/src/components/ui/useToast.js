import { createElement, useMemo } from "react";
import { toast } from "react-hot-toast";
import Toast from "./Toast";

const MAX_TOASTS = 3;
const activeToasts = [];

const buildToastKey = ({ type, title, description }) =>
  [type, title, description || ""].join("::");

const showToast = ({ type = "info", title, description, duration = 3200 }) => {
  const toastKey = buildToastKey({ type, title, description });
  const existingToast = activeToasts.find((entry) => entry.key === toastKey);
  if (existingToast) {
    return existingToast.id;
  }

  while (activeToasts.length >= MAX_TOASTS) {
    const oldestToast = activeToasts.shift();
    if (oldestToast?.id) {
      toast.dismiss(oldestToast.id);
    }
  }

  const id = toast.custom((toastState) => createElement(Toast, { id: toastState.id, type, title, description }), {
    duration,
    position: typeof window !== "undefined" && window.innerWidth < 768 ? "bottom-center" : "bottom-right",
  });

  activeToasts.push({ id, key: toastKey });
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("swastha:toast", {
        detail: {
          type: "push",
          toast: { id, toastType: type, title, description },
        },
      })
    );
  }

  setTimeout(() => {
    const index = activeToasts.findIndex((entry) => entry.id === id);
    if (index >= 0) activeToasts.splice(index, 1);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("swastha:toast", {
          detail: {
            type: "remove",
            id,
          },
        })
      );
    }
  }, duration + 200);

  return id;
};

export const useToast = () =>
  useMemo(
    () => ({
      success: (title, description, options) =>
        showToast({ type: "success", title, description, ...options }),
      error: (title, description, options) =>
        showToast({ type: "error", title, description, ...options }),
      warning: (title, description, options) =>
        showToast({ type: "warning", title, description, ...options }),
      info: (title, description, options) =>
        showToast({ type: "info", title, description, ...options }),
    }),
    []
  );

export default showToast;
