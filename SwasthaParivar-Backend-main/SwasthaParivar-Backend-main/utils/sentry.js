import * as Sentry from "@sentry/node";

const BACKEND_IGNORE_ERRORS = [
  "Not allowed by CORS",
  "Route not found",
];

export const initSentry = (config) => {
  if (!config.sentryDsn) return false;

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.sentryEnvironment,
    release: config.appVersion,
    tracesSampleRate: config.isProduction ? 0.1 : 0,
    ignoreErrors: BACKEND_IGNORE_ERRORS,
    beforeSend(event, hint) {
      const message =
        hint?.originalException?.message ||
        hint?.originalException ||
        event?.exception?.values?.[0]?.value ||
        "";

      if (
        typeof message === "string" &&
        BACKEND_IGNORE_ERRORS.some((pattern) => message.includes(pattern))
      ) {
        return null;
      }

      return event;
    },
  });

  return true;
};

export const captureServerError = (error, context = {}) => {
  if (!Sentry.getClient()) return;

  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      if (value !== undefined) {
        scope.setExtra(key, value);
      }
    });

    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
};

export const flushSentry = async (timeout = 2000) => {
  if (!Sentry.getClient()) return;
  await Sentry.flush(timeout);
};
