import webpush from "web-push";
import User from "../models/user.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const pushEnabled = Boolean(vapidPublicKey && vapidPrivateKey);

if (pushEnabled) {
  webpush.setVapidDetails(
    "mailto:you@example.com",
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn("Push notifications are disabled because VAPID keys are missing.");
}

export const saveSubscription = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      $set: { pushSubscription: req.body.subscription },
    });

    return sendSuccess(res, {
      data: { subscribed: true },
    });
  } catch (err) {
    return sendError(res, {
      status: 500,
      code: "NOTIFICATION_SUBSCRIBE_FAILED",
      message: "Could not save push subscription",
      details: err.message,
    });
  }
};

export const testNotification = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.pushSubscription) {
      return sendError(res, {
        status: 400,
        code: "NOT_SUBSCRIBED",
        message: "You are not subscribed to push notifications on this device.",
      });
    }

    await sendPush(
      user,
      "Test Notification 🔔",
      "If you see this, your SwasthaParivar notifications are working perfectly!",
      {
        url: "/settings",
        image: "https://swasthaparivar.app/og-preview.png",
      }
    );

    return sendSuccess(res, { message: "Test notification sent" });
  } catch (err) {
    return sendError(res, {
      status: 500,
      message: "Failed to send test notification",
      details: err.message,
    });
  }
};

export async function sendPush(user, title, body, data = {}) {
  if (!pushEnabled) {
    console.warn("Push ignored: VAPID keys missing in env");
    return;
  }
  
  if (!user?.pushSubscription) {
    console.warn(`Push ignored: User ${user?.email} has no push subscription`);
    return;
  }

  const payload = JSON.stringify({ 
    title, 
    body,
    ...data 
  });

  try {
    await webpush.sendNotification(user.pushSubscription, payload, {
      TTL: 60,
      priority: "high",
      urgency: "high"
    });
  } catch (err) {
    console.error("Push Error:", err);

    if (err.statusCode === 410 || err.statusCode === 404) {
      user.pushSubscription = null;
      await user.save();
    }
  }
}

export default webpush;
