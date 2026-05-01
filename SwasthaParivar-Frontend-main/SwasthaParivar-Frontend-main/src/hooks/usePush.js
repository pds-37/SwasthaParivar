import { VAPID_PUBLIC_KEY } from "../lib/pushKeys";
import api from "../lib/api";
import notify from "../lib/notify";

function urlBase64ToUint8Array(base64String) {
  if (!base64String) return new Uint8Array(0);

  // Remove potential hidden characters, whitespace and ensure URL-safe base64 is converted
  const cleanBase64 = base64String.trim().replace(/\s/g, "");
  const padding = "=".repeat((4 - (cleanBase64.length % 4)) % 4);
  const base64 = (cleanBase64 + padding).replace(/-/g, "+").replace(/_/g, "/");

  try {
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (error) {
    console.error("VAPID key decoding failed:", error, "String was:", base64);
    throw new Error("Invalid VAPID public key format");
  }
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
  if (permission === "denied") {
    notify.error("Notification permission denied. Please reset permissions in your browser settings to enable reminders.");
    return;
  }
  
  if (permission !== "granted") {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if we already have a subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Only send to backend if it's a new subscription or endpoint changed
    if (!existingSubscription || existingSubscription.endpoint !== subscription.endpoint) {
      await api.post("/notifications/subscribe", { subscription });
    }
    
    notify.success("Push notifications enabled.");
    return "subscribed";
  } catch (error) {
    console.error("Push Subscription Error:", error);
    notify.error(error.message || "Failed to enable notifications. Try refreshing the page.");
    return "failed";
  }
}

export async function testPush() {
  try {
    await api.get("/notifications/test");
    notify.info("Test notification requested. It should arrive in a few seconds.");
  } catch (error) {
    notify.error(error.message || "Failed to send test notification");
  }
}

export async function getSubscriptionStatus() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      return "unsubscribed";
    }

    const permission = Notification.permission;
    return permission === "granted" ? "subscribed" : "denied";
  } catch {
    return "error";
  }
}
