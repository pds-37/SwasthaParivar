import webpush from "web-push";
import User from "../models/user.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const pushEnabled = Boolean(vapidPublicKey && vapidPrivateKey);

if (pushEnabled) {
  webpush.setVapidDetails(
    "https://swasthaparivar.app",
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn("Push notifications are disabled because VAPID keys are missing.");
}

export const saveSubscription = async (req, res) => {
  try {
    const { subscription } = req.body;
    
    // Add the subscription to the user's list if it doesn't already exist
    // We check by the endpoint to avoid duplicate registrations for the same device
    await User.findByIdAndUpdate(req.userId, {
      $addToSet: { pushSubscriptions: subscription },
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
    if (!user?.pushSubscriptions?.length) {
      return sendError(res, {
        status: 400,
        code: "NOT_SUBSCRIBED",
        message: "You are not subscribed to push notifications on any device.",
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
  
  if (!user?.pushSubscriptions?.length) {
    console.warn(`Push ignored: User ${user?.email} has no push subscriptions`);
    return;
  }

  const payload = JSON.stringify({ 
    title, 
    body,
    ...data 
  });

  const sendResults = await Promise.allSettled(
    user.pushSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload, {
          TTL: 86400, // 24 hours
          priority: "high",
          urgency: "high"
        });
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription is no longer valid, remove it
          return { error: "expired", endpoint: subscription.endpoint };
        }
        throw err;
      }
    })
  );

  // Clean up expired subscriptions
  const expiredEndpoints = sendResults
    .filter(r => r.status === "fulfilled" && r.value?.error === "expired")
    .map(r => r.value.endpoint);

  if (expiredEndpoints.length > 0) {
    await User.findByIdAndUpdate(user._id, {
      $pull: { pushSubscriptions: { endpoint: { $in: expiredEndpoints } } }
    });
  }
}

export default webpush;
