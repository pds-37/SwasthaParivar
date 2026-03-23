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

export async function sendPush(user, title, body) {
  if (!pushEnabled || !user?.pushSubscription) return;

  const payload = JSON.stringify({ title, body });

  try {
    await webpush.sendNotification(user.pushSubscription, payload);
  } catch (err) {
    console.error("Push Error:", err);

    if (err.statusCode === 410 || err.statusCode === 404) {
      user.pushSubscription = null;
      await user.save();
    }
  }
}

export default webpush;
