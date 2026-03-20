import webpush from "web-push";
import User from "../models/user.js";

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
    if (!req.body?.subscription) {
      return res.status(400).json({ error: "subscription is required" });
    }

    await User.findByIdAndUpdate(req.userId, {
      $set: { pushSubscription: req.body.subscription },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Save subscription error:", err);
    res.status(500).json({ error: err.message });
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
