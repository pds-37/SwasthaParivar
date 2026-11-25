import webpush from "web-push";
import User from "../models/user.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { logger } from "../utils/logger.js";

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

export function isValidPushSubscription(subscription) {
  if (!subscription || typeof subscription !== "object") return false;
  if (typeof subscription.endpoint !== "string" || !subscription.endpoint.trim()) return false;

  try {
    const parsed = new URL(subscription.endpoint);
    if (!["https:", "http:"].includes(parsed.protocol)) return false;
  } catch {
    return false;
  }

  return Boolean(
    subscription.keys &&
      typeof subscription.keys.auth === "string" &&
      subscription.keys.auth.length > 0 &&
      typeof subscription.keys.p256dh === "string" &&
      subscription.keys.p256dh.length > 0
  );
}

export function deduplicateSubscriptions(subscriptions = []) {
  const seen = new Set();
  const valid = [];
  const invalidEndpoints = [];

  for (const sub of Array.isArray(subscriptions) ? subscriptions : []) {
    if (!isValidPushSubscription(sub)) {
      if (sub?.endpoint) invalidEndpoints.push(sub.endpoint);
      continue;
    }
    if (seen.has(sub.endpoint)) continue;
    seen.add(sub.endpoint);
    valid.push(sub);
  }

  return { valid, invalidEndpoints };
}

export const saveSubscription = async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!isValidPushSubscription(subscription)) {
      return sendError(res, {
        status: 400,
        code: "INVALID_SUBSCRIPTION",
        message: "Push subscription endpoint or keys are invalid",
      });
    }

    // Deduplicate by endpoint atomically
    await User.findByIdAndUpdate(req.userId, {
      $pull: { pushSubscriptions: { endpoint: subscription.endpoint } },
    });
    await User.findByIdAndUpdate(req.userId, {
      $push: { pushSubscriptions: subscription },
    });

    return sendSuccess(res, {
      data: { subscribed: true },
    });
  } catch (err) {
    logger.error({ err: err.message, userId: String(req.userId || "") }, "Failed to save push subscription");
    return sendError(res, {
      status: 500,
      code: "NOTIFICATION_SUBSCRIBE_FAILED",
      message: "Could not save push subscription",
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

    const result = await sendPush(
      user,
      "Test Notification",
      "If you see this, your SwasthaParivar notifications are working properly.",
      {
        url: "/settings",
        image: "https://swasthaparivar.app/og-preview.png",
      }
    );

    return sendSuccess(res, {
      data: {
        sent: result.delivered > 0,
        ...result,
      },
    });
  } catch (err) {
    logger.error({ err: err.message, userId: String(req.userId || "") }, "Failed to send test notification");
    return sendError(res, {
      status: 500,
      code: "TEST_NOTIFICATION_FAILED",
      message: "Failed to send test notification",
    });
  }
};

export async function sendPush(user, title, body, data = {}, options = {}) {
  const isPushActive = options.pushEnabledOverride ?? pushEnabled;
  const transport = options.transport || webpush;

  if (!isPushActive) {
    return { attempted: 0, delivered: 0, failed: 0, expiredRemoved: 0, skipped: true, reason: "VAPID_MISSING" };
  }

  if (user?.preferences?.notificationsEnabled === false) {
    return { attempted: 0, delivered: 0, failed: 0, expiredRemoved: 0, skipped: true, reason: "USER_OPT_OUT" };
  }

  if (!user?.pushSubscriptions?.length) {
    return { attempted: 0, delivered: 0, failed: 0, expiredRemoved: 0, skipped: true, reason: "NO_SUBSCRIPTIONS" };
  }

  const { valid, invalidEndpoints } = deduplicateSubscriptions(user.pushSubscriptions);
  const payload = JSON.stringify({
    title,
    body,
    ...data,
  });

  const sendResults = await Promise.allSettled(
    valid.map(async (subscription) => {
      try {
        await transport.sendNotification(subscription, payload, {
          TTL: 86400,
          priority: "high",
          urgency: "high",
        });
        return { ok: true };
      } catch (err) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          return { ok: false, expired: true, endpoint: subscription.endpoint };
        }
        logger.warn(
          { userId: String(user._id || ""), statusCode: err?.statusCode, err: err?.message },
          "Web Push delivery attempt failed"
        );
        return { ok: false, expired: false, error: err?.message || "PUSH_ERROR" };
      }
    })
  );

  let delivered = 0;
  let failed = 0;
  const expiredEndpoints = [...invalidEndpoints];

  for (const resItem of sendResults) {
    if (resItem.status === "fulfilled" && resItem.value?.ok) {
      delivered += 1;
    } else {
      failed += 1;
      if (resItem.status === "fulfilled" && resItem.value?.expired && resItem.value.endpoint) {
        expiredEndpoints.push(resItem.value.endpoint);
      }
    }
  }

  if (expiredEndpoints.length > 0 && user._id) {
    try {
      await User.findByIdAndUpdate(user._id, {
        $pull: { pushSubscriptions: { endpoint: { $in: expiredEndpoints } } },
      });
    } catch (cleanupErr) {
      logger.warn({ err: cleanupErr.message, userId: String(user._id) }, "Failed to prune expired push subscriptions");
    }
  }

  return {
    attempted: valid.length,
    delivered,
    failed,
    expiredRemoved: expiredEndpoints.length,
    skipped: false,
  };
}

export default webpush;
