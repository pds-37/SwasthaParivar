const ERROR_MESSAGES = {
  400: "Something doesn't look right. Please check your input.",
  401: "Your session has expired. Please log in again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "This already exists.",
  413: "That file is too large. Please upload something under 10MB.",
  422: "Some fields are missing or incorrect.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our end. We've been notified.",
  503: "Service is temporarily unavailable. Please try again shortly.",
};

export function getFriendlyError(error) {
  if (!error?.response) {
    return "No internet connection. Please check your network.";
  }

  const status = error.response?.status;
  const serverMessage =
    error.response?.data?.message ||
    error.response?.data?.error?.message ||
    error.response?.data?.error;

  if (
    typeof serverMessage === "string" &&
    serverMessage.length < 120 &&
    !serverMessage.includes(" at ") &&
    !serverMessage.includes("\n")
  ) {
    return serverMessage;
  }

  return ERROR_MESSAGES[status] || "Something went wrong. Please try again.";
}
