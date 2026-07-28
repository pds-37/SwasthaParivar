const isBrowser = typeof window !== "undefined";

export function initAnalytics() {
  if (!isBrowser || !window.posthog) {
    return false;
  }
  return true;
}

export function identifyAnalyticsUser(user) {
  if (!user?.id || !initAnalytics()) {
    return;
  }

  window.posthog.identify(String(user.id), {
    email: user.email || "",
    full_name: user.fullName || "",
    plan: user.plan || "free",
  });
}

export function resetAnalytics() {
  if (!initAnalytics()) {
    return;
  }
  window.posthog.reset();
}

export function trackEvent(eventName, properties = {}) {
  if (!eventName || !initAnalytics()) {
    return;
  }

  window.posthog.capture(eventName, {
    $lib: "swasthaparivar-web",
    ...properties,
  });
}

export default trackEvent;
