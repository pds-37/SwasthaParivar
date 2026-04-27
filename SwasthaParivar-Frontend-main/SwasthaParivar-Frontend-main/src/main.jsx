import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { HelmetProvider } from "react-helmet-async";
import { initSentry } from "./lib/sentry";

initSentry();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    let refreshedAfterSwUpdate = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshedAfterSwUpdate) return;
      refreshedAfterSwUpdate = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        await registration.update();

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        console.log("SW Registered");
      })
      .catch((err) => console.log("SW Fail:", err));
  });
}
