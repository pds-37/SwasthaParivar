import { VAPID_PUBLIC_KEY } from "../lib/pushKeys";
import api from "../lib/api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function subscribePush() {
  if (!VAPID_PUBLIC_KEY) {
    alert("Push notifications are not configured for this deployment yet.");
    return;
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    alert("Push notifications are not supported in this browser.");
    return;
  }

  // Permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    alert("Notification permission denied.");
    return;
  }

  const reg = await navigator.serviceWorker.ready;

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Send to backend
  await api.post("/notifications/subscribe", { subscription });

  alert("Push Notifications Enabled! 🔔");
}
