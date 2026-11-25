export const sanitizePath = (value = "") => {
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
};

export const sanitizeBaseUrl = (value) => {
  if (!value) return "/api";

  const normalizedValue = value.endsWith("/") ? value.slice(0, -1) : value;

  // Accept either a full API base (https://host/api) or a backend origin (https://host)
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

export const buildApiUrl = (baseUrl, endpoint = "") => `${baseUrl}${sanitizePath(endpoint)}`;

export function shouldAttemptTokenRefresh(status, originalRequest = {}) {
  const url = String(originalRequest.url || "");
  const isRefreshRequest = url.includes("/auth/refresh");
  const isAuthEntry = url.includes("/auth/login") || url.includes("/auth/signup");
  return status === 401 && !originalRequest.__retry && !isRefreshRequest && !isAuthEntry;
}

export function shouldRedirectToAuth(status, originalRequest = {}, pathname = "/") {
  const url = String(originalRequest.url || "");
  const isAuthBootstrap = url.includes("/auth/session");
  return status === 401 && !pathname.startsWith("/auth") && !isAuthBootstrap;
}
