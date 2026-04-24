/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

import { useThemeMode } from "../theme/theme-context";

const UIStoreContext = createContext(null);

const uiReducer = (state, action) => {
  switch (action.type) {
    case "SET_COLLAPSED":
      return { ...state, sidebarCollapsed: action.payload };
    case "SET_ACTIVE_THREAD":
      if (action.payload) {
        localStorage.setItem("swastha:last_thread_id", action.payload);
      } else {
        localStorage.removeItem("swastha:last_thread_id");
      }
      return { ...state, activeThreadId: action.payload };
    case "TOAST_PUSH":
      return { ...state, toasts: [action.payload, ...state.toasts].slice(0, 3) };
    case "TOAST_REMOVE":
      return { ...state, toasts: state.toasts.filter((toast) => toast.id !== action.payload) };
    default:
      return state;
  }
};

export const UIStoreProvider = ({ children }) => {
  const { mode, preference, setThemePreference } = useThemeMode();
  const [state, dispatch] = useReducer(uiReducer, {
    sidebarCollapsed: false,
    activeThreadId: typeof window !== "undefined" ? localStorage.getItem("swastha:last_thread_id") : null,
    toasts: [],
  });

  useEffect(() => {
    const onToastEvent = (event) => {
      if (event.detail?.type === "push") {
        dispatch({ type: "TOAST_PUSH", payload: event.detail.toast });
      }

      if (event.detail?.type === "remove") {
        dispatch({ type: "TOAST_REMOVE", payload: event.detail.id });
      }
    };

    window.addEventListener("swastha:toast", onToastEvent);
    return () => window.removeEventListener("swastha:toast", onToastEvent);
  }, []);

  const value = useMemo(
    () => ({
      theme: preference,
      resolvedTheme: mode,
      sidebarCollapsed: state.sidebarCollapsed,
      activeThreadId: state.activeThreadId,
      toasts: state.toasts,
      setSidebarCollapsed: (nextValue) => dispatch({ type: "SET_COLLAPSED", payload: nextValue }),
      setActiveThreadId: (id) => dispatch({ type: "SET_ACTIVE_THREAD", payload: id }),
      setTheme: setThemePreference,
    }),
    [mode, preference, setThemePreference, state.sidebarCollapsed, state.activeThreadId, state.toasts]
  );

  return <UIStoreContext.Provider value={value}>{children}</UIStoreContext.Provider>;
};

export const useUIStore = () => {
  const context = useContext(UIStoreContext);
  if (!context) throw new Error("useUIStore must be used within UIStoreProvider");
  return context;
};
