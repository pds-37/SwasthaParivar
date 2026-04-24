import express from "express";

import User from "../models/user.js";
import householdService from "../services/household/HouseholdService.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

const router = express.Router();
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

router.post("/apply/:code", async (req, res) => {
  const referralCode = String(req.params.code || "").trim().toUpperCase();

  if (!referralCode) {
    return sendError(res, {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Referral code is required.",
    });
  }

  const currentUser = await User.findById(req.userId);
  if (!currentUser) {
    return sendError(res, {
      status: 404,
      code: "USER_NOT_FOUND",
      message: "User not found.",
    });
  }

  if (currentUser.referredBy) {
    return sendError(res, {
      status: 400,
      code: "REFERRAL_ALREADY_USED",
      message: "You have already used a referral code.",
    });
  }

  const referrer = await User.findOne({ referralCode });
  if (!referrer) {
    return sendError(res, {
      status: 404,
      code: "REFERRAL_INVALID",
      message: "Invalid referral code.",
    });
  }

  if (String(referrer._id) === String(currentUser._id)) {
    return sendError(res, {
      status: 400,
      code: "REFERRAL_SELF",
      message: "You cannot use your own referral code.",
    });
  }

  const now = new Date();
  const referrerBaseDate =
    referrer.proExpiresAt && referrer.proExpiresAt.getTime() > now.getTime()
      ? referrer.proExpiresAt
      : now;

  currentUser.referredBy = referrer._id;
  currentUser.plan = "pro";
  currentUser.proExpiresAt = new Date(now.getTime() + ONE_MONTH_MS);

  referrer.referralCount = Number(referrer.referralCount || 0) + 1;
  referrer.plan = "pro";
  referrer.proExpiresAt = new Date(referrerBaseDate.getTime() + ONE_MONTH_MS);

  await Promise.all([currentUser.save(), referrer.save()]);

  const householdContext = await householdService.getOptionalUserHouseholdContext(
    currentUser,
    "applyReferral"
  );
  const safeUser = householdContext?.safeUser || householdService.buildSafeUser(currentUser);

  return sendSuccess(res, {
    data: {
      message: "Referral applied! Both you and your referrer get 1 month of Pro free.",
      user: safeUser,
    },
  });
});

export default router;

