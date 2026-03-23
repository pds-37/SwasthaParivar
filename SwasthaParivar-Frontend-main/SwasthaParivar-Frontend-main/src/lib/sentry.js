import * as Sentry from "@sentry/react";

const FRONTEND_IGNORE_ERRORS = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  "Non-Error promise rejection captured",
  "AbortError",
];

export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || "frontend@local",
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    ignoreErrors: FRONTEND_IGNORE_ERRORS,
    beforeSend(event, hint) {
      const message = hint?.originalException?.message || hint?.originalException || "";

      if (
        typeof message === "string" &&
        FRONTEND_IGNORE_ERRORS.some((pattern) => message.includes(pattern))
      ) {
        return null;
      }

      return event;
    },
  });
};

export const captureFrontendError = (error, context = {}) => {
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });

    Sentry.captureException(error);
  });
};
