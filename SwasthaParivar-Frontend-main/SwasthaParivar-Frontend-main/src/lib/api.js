import axios from "axios";
import notify from "./notify";
import { captureFrontendError } from "./sentry";

const sanitizePath = (value = "") => {
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
};

const sanitizeBaseUrl = (value) => {
  if (!value) return "/api";
  return value.endsWith("/") ? value.slice(0, -1) : value;
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

  // Cookie auth is the primary path; only fall back to a stored bearer token
  // when a request explicitly disables credentials.
  const token =
    nextConfig.withCredentials === false
      ? localStorage.getItem("token")
      : null;

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
    const message =
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      "Request failed";

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

    if (status === 429) {
      notify.error("Slow down", message);
    }

    if (status >= 500) {
      const serverTitle = status === 503 ? "Server is restarting" : "Server error";
      const serverDescription =
        status === 503
          ? message
          : "Please try again in a moment.";
      notify.error(serverTitle, serverDescription);
      captureFrontendError(error, {
        source: "api-interceptor",
        status,
        url: originalRequest.url,
      });
    }

    const nextError = new Error(message);
    nextError.status = status;
    nextError.data = error?.response?.data;
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
