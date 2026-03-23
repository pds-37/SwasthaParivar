import { VAPID_PUBLIC_KEY } from "../lib/pushKeys";
import api from "../lib/api";
import notify from "../lib/notify";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

export async function subscribePush() {
  if (!VAPID_PUBLIC_KEY) {
    notify.error("Push notifications are not configured for this deployment yet.");
    return;
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    notify.error("Push notifications are not supported in this browser.");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    notify.info("Notification permission denied.");
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  await api.post("/notifications/subscribe", { subscription });
  notify.success("Push notifications enabled.");
}
