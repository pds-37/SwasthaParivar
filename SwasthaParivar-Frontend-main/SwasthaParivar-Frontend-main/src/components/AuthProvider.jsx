import React, { useEffect, useReducer } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { AuthContext } from "./auth-context";
import AppLoader from "./AppLoader";
import { identifyAnalyticsUser, resetAnalytics } from "../utils/analytics";

const parseStoredUser = () => {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return { user: null };
  }

  try {
    return {
      user: JSON.parse(storedUser),
    };
  } catch {
    localStorage.removeItem("user");
    return { user: null };
  }
};

const authReducer = (state, action) => {
  switch (action.type) {
    case "AUTH_SET":
      return {
        ...state,
        user: action.payload.user,
        token: null,
      };
    case "AUTH_CLEAR":
      return {
        ...state,
        user: null,
        token: null,
      };
    case "AUTH_LOADING":
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
};

const SESSION_BOOTSTRAP_DELAYS_MS = [0, 1200, 2200, 3500, 5000, 7000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRecoverableBootstrapError = (error) => {
  const status = error?.status || error?.response?.status;

  return (
    status === undefined ||
    status === null ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, null, () => {
    const stored = parseStoredUser();
    return {
      user: stored.user,
      token: null,
      loading: true,
    };
  });
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      dispatch({ type: "AUTH_LOADING", payload: true });

      const hasStoredUser = Boolean(parseStoredUser().user);

      for (let attempt = 0; attempt < SESSION_BOOTSTRAP_DELAYS_MS.length; attempt += 1) {
        if (cancelled) {
          return;
        }

        if (attempt > 0) {
          await sleep(SESSION_BOOTSTRAP_DELAYS_MS[attempt]);
          if (cancelled) {
            return;
          }
        }

        try {
          const data = await api.get("/auth/session", { skipAuth: true });
          if (!cancelled && data?.user) {
            localStorage.removeItem("token");
            localStorage.setItem("user", JSON.stringify(data.user));
            dispatch({
              type: "AUTH_SET",
              payload: {
                user: data.user,
              },
            });
          }
          recoverableFailure = false;
          if (!cancelled) {
            dispatch({ type: "AUTH_LOADING", payload: false });
          }
          return;
        } catch (error) {
          if (
            isRecoverableBootstrapError(error) &&
            hasStoredUser &&
            attempt < SESSION_BOOTSTRAP_DELAYS_MS.length - 1
          ) {
            continue;
          }

          if (!cancelled) {
            if (!(isRecoverableBootstrapError(error) && hasStoredUser)) {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              dispatch({ type: "AUTH_CLEAR" });
            }

            dispatch({ type: "AUTH_LOADING", payload: false });
          }

          return;
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state.user?.id) {
      identifyAnalyticsUser(state.user);
      return;
    }

    resetAnalytics();
  }, [state.user]);

  const resolveRedirectPath = (value) =>
    typeof value === "string" && value.startsWith("/") ? value : "/dashboard";

  const setAuthenticatedState = (data) => {
    localStorage.removeItem("token");
    localStorage.setItem("user", JSON.stringify(data.user));
    dispatch({
      type: "AUTH_SET",
      payload: {
        user: data.user,
      },
    });
  };

  const updateUser = (nextUserOrUpdater) => {
    const nextUser =
      typeof nextUserOrUpdater === "function"
        ? nextUserOrUpdater(state.user)
        : {
            ...(state.user || {}),
            ...(nextUserOrUpdater || {}),
          };

    if (!nextUser) {
      return;
    }

    localStorage.setItem("user", JSON.stringify(nextUser));
    dispatch({
      type: "AUTH_SET",
      payload: {
        user: nextUser,
      },
    });
  };

  const login = async (credentials, options = {}) => {
    try {
      const data = await api.post("/auth/login", credentials);
      setAuthenticatedState(data);
      navigate(resolveRedirectPath(options.redirectTo), { replace: true });
    } catch (error) {
      console.error("Login failed", error);
      throw error; 
    }
  };

  const signup = async (userData, options = {}) => {
    try {
      const data = await api.post("/auth/signup", userData);
      setAuthenticatedState(data);
      navigate(resolveRedirectPath(options.redirectTo), { replace: true });
    } catch (error) {
      console.error("Signup failed", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout", {}, { skipAuth: true });
    } catch {
      // Clear client state even if the request fails.
    }

    localStorage.removeItem("user");
    localStorage.removeItem("token");
    resetAnalytics();
    dispatch({ type: "AUTH_CLEAR" });
    navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        isAuthenticated: Boolean(state.user),
        loading: state.loading,
        login,
        signup,
        logout,
        updateUser,
      }}
    >
      {state.loading ? <AppLoader /> : children}
    </AuthContext.Provider>
  );
};
