const isBrowser = typeof window !== "undefined";
const isProd = import.meta.env.MODE === "production";
const posthogKey = import.meta.env.VITE_POSTHOG_KEY || "";
const distinctIdStorageKey = "sp_posthog_distinct_id";
const userTraitsStorageKey = "sp_posthog_traits";
const captureEndpoint = "https://app.posthog.com/capture/";
let initialized = false;

const createAnonymousId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `sp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const readStoredJson = (key, fallback) => {
  if (!isBrowser) {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const writeStoredJson = (key, value) => {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota issues in analytics helpers.
  }
};

const getDistinctId = () => {
  if (!isBrowser) {
    return "";
  }

  const existing = window.localStorage.getItem(distinctIdStorageKey);
  if (existing) {
    return existing;
  }

  const nextId = createAnonymousId();
  window.localStorage.setItem(distinctIdStorageKey, nextId);
  return nextId;
};

const sendCapture = (payload) => {
  if (!isBrowser) {
    return;
  }

  const serialized = JSON.stringify(payload);

  if (typeof navigator.sendBeacon === "function") {
    const blob = new Blob([serialized], { type: "application/json" });
    navigator.sendBeacon(captureEndpoint, blob);
    return;
  }

  fetch(captureEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: serialized,
    keepalive: true,
  }).catch(() => {
    // Ignore analytics delivery failures.
  });
};

export function initAnalytics() {
  if (!isBrowser || initialized || !isProd || !posthogKey) {
    return initialized;
  }

  getDistinctId();
  initialized = true;
  return true;
}

export function identifyAnalyticsUser(user) {
  if (!user?.id || !initAnalytics()) {
    return;
  }

  window.localStorage.setItem(distinctIdStorageKey, String(user.id));
  writeStoredJson(userTraitsStorageKey, {
    email: user.email || "",
    full_name: user.fullName || "",
    plan: user.plan || "free",
  });
}

export function resetAnalytics() {
  if (!isBrowser) {
    return;
  }

  window.localStorage.removeItem(userTraitsStorageKey);
  window.localStorage.setItem(distinctIdStorageKey, createAnonymousId());
}

export function trackEvent(eventName, properties = {}) {
  if (!eventName || !initAnalytics()) {
    return;
  }

  const userTraits = readStoredJson(userTraitsStorageKey, {});
  sendCapture({
    api_key: posthogKey,
    event: eventName,
    properties: {
      distinct_id: getDistinctId(),
      $current_url: window.location.href,
      $pathname: window.location.pathname,
      $host: window.location.host,
      $lib: "swasthaparivar-web",
      ...userTraits,
      ...properties,
    },
  });
}

export default trackEvent;
