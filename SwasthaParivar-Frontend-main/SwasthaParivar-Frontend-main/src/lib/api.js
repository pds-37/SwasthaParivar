import axios from "axios";
import notify from "./notify";
import { captureFrontendError } from "./sentry";
import { getFriendlyError } from "../utils/errorHandler";

const sanitizePath = (value = "") => {
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
};

const sanitizeBaseUrl = (value) => {
  if (!value) return "/api";

  const normalizedValue = value.endsWith("/") ? value.slice(0, -1) : value;

  // Accept either a full API base (https://host/api) or a backend origin
  // (https://host) to reduce deploy-time env mistakes.
  if (/^https?:\/\//i.test(normalizedValue)) {
    try {
      const url = new URL(normalizedValue);
      const pathname = url.pathname.replace(/\/+$/, "");

      if (!pathname || pathname === "/") {
        url.pathname = "/api";
        return url.toString().replace(/\/$/, "");
      }

      if (!pathname.endsWith("/api")) {
        url.pathname = `${pathname}/api`;
      }

      return url.toString().replace(/\/$/, "");
    } catch {
      return normalizedValue;
    }
  }

  return normalizedValue;
};

export const API_BASE_URL = sanitizeBaseUrl(import.meta.env.VITE_API_URL || "/api");
export const buildApiUrl = (endpoint = "") => `${API_BASE_URL}${sanitizePath(endpoint)}`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let refreshPromise = null;

apiClient.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  const skipAuth = nextConfig.headers?.["x-skip-auth"];

  // Always attempt to use a stored bearer token if available
  const token = localStorage.getItem("token");

  if (!skipAuth && token && !nextConfig.headers?.Authorization) {
    nextConfig.headers = {
      ...nextConfig.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  if (skipAuth && nextConfig.headers) {
    delete nextConfig.headers["x-skip-auth"];
  }

  return nextConfig;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config || {};
    const upgradeRequired = Boolean(error?.response?.data?.upgradeRequired);
    const blockedFeature = error?.response?.data?.feature || "";
    const serverMessage =
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      "Request failed";
    const friendlyMessage = getFriendlyError(error);

    const isRefreshRequest = originalRequest.url?.includes("/auth/refresh");
    const isAuthBootstrap = originalRequest.url?.includes("/auth/session");
    const isAuthEntry = originalRequest.url?.includes("/auth/login") || originalRequest.url?.includes("/auth/signup");

    if (
      status === 401 &&
      !originalRequest.__retry &&
      !isRefreshRequest &&
      !isAuthEntry &&
      !isAuthBootstrap
    ) {
      originalRequest.__retry = true;

      try {
        refreshPromise =
          refreshPromise ||
          apiClient.post(
            "/auth/refresh",
            {},
            {
              headers: { "x-skip-auth": "true" },
            }
          );

        await refreshPromise;
        refreshPromise = null;
        return apiClient(originalRequest);
      } catch {
        refreshPromise = null;
      }
    }

    if (
      status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/auth") &&
      !isAuthBootstrap
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.assign("/auth");
    }

    if (upgradeRequired && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("show-upgrade-prompt", {
          detail: { feature: blockedFeature },
        })
      );
    }

    if (status === 429) {
      notify.error(friendlyMessage);
    }

    if (
      status &&
      status !== 401 &&
      status !== 429 &&
      !(upgradeRequired && status === 403) &&
      !originalRequest.suppressErrorToast
    ) {
      notify.error(friendlyMessage);
    }

    if (status >= 500) {
      captureFrontendError(error, {
        source: "api-interceptor",
        status,
        url: originalRequest.url,
      });
    }

    const nextError = new Error(friendlyMessage);
    nextError.status = status;
    nextError.data = error?.response?.data;
    nextError.serverMessage = serverMessage;
    return Promise.reject(nextError);
  }
);

const request = async (endpoint, options = {}) => {
  const { body, skipAuth, ...rest } = options;

  const response = await apiClient.request({
    url: sanitizePath(endpoint),
    data: body,
    headers: {
      ...(skipAuth ? { "x-skip-auth": "true" } : {}),
      ...rest.headers,
    },
    ...rest,
  });

  const payload = response?.data ?? null;
  if (payload && typeof payload === "object" && "success" in payload) {
    if (!payload.success) {
      const error = new Error(payload.error?.message || payload.message || "Request failed");
      error.data = payload.data;
      error.status = response.status;
      throw error;
    }
    return payload.data ?? null;
  }

  return payload;
};

const api = {
  request,
  get(endpoint, options = {}) {
    return request(endpoint, { ...options, method: "GET" });
  },
  post(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: "POST", body });
  },
  put(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: "PUT", body });
  },
  patch(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: "PATCH", body });
  },
  delete(endpoint, options = {}) {
    return request(endpoint, { ...options, method: "DELETE" });
  },
};

export default api;
