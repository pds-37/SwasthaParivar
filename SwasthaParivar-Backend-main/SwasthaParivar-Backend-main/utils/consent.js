import appConfig from "../config/AppConfig.js";
import Consent from "../models/Consent.js";
import { logger } from "./logger.js";

export const DEFAULT_CONSENT_PURPOSES = [
  "health_data_storage",
  "ai_processing",
  "push_notifications",
];

const resolveIpAddress = (req) =>
  String(
    req?.headers?.["x-forwarded-for"] ||
      req?.ip ||
      req?.socket?.remoteAddress ||
      ""
  )
    .split(",")[0]
    .trim();

export async function logConsentIfMissing({
  userId,
  req,
  purposes = DEFAULT_CONSENT_PURPOSES,
} = {}) {
  if (!userId || !appConfig.privacyPolicyVersion) {
    return null;
  }

  const existing = await Consent.findOne({
    userId,
    version: appConfig.privacyPolicyVersion,
  });

  if (existing) {
    return existing;
  }

  try {
    return await Consent.create({
      userId,
      version: appConfig.privacyPolicyVersion,
      givenAt: new Date(),
      ipAddress: resolveIpAddress(req),
      userAgent: String(req?.get?.("user-agent") || req?.headers?.["user-agent"] || ""),
      purposes,
    });
  } catch (error) {
    logger.warn(
      {
        route: "consent-log",
        userId: String(userId),
        error: {
          message: error?.message || "Could not record consent",
        },
      },
      "Consent logging failed"
    );
    return null;
  }
}

export default logConsentIfMissing;
