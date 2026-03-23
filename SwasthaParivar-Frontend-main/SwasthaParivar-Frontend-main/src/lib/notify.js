import showToast from "../components/ui/useToast";

export const notify = {
  success(message, description) {
    showToast({ type: "success", title: message, description });
  },
  error(message, description) {
    showToast({ type: "error", title: message, description });
  },
  warning(message, description) {
    showToast({ type: "warning", title: message, description });
  },
  info(message, description) {
    showToast({ type: "info", title: message, description });
  },
};

export default notify;
