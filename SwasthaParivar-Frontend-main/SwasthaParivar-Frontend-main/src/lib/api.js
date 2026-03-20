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

const parseResponse = async (response) => {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
};

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem("token");
    const {
      body,
      headers: customHeaders = {},
      skipAuth = false,
      ...rest
    } = options;

    const isFormData = body instanceof FormData;
    const headers = { ...customHeaders };

    if (!skipAuth && token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (!isFormData && body !== undefined && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(buildApiUrl(endpoint), {
      ...rest,
      headers,
      body:
        body === undefined
          ? undefined
          : isFormData || typeof body === "string"
            ? body
            : JSON.stringify(body),
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      const message =
        data?.message || data?.error || `Request failed with status ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: "POST", body });
  },

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: "PUT", body });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  },
};

export default api;
