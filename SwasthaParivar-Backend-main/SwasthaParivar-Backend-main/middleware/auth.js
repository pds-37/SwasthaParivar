import User from "../models/user.js";
import Session from "../models/Session.js";
import householdService from "../services/household/HouseholdService.js";
import { sendError } from "../utils/apiResponse.js";
import { getAccessTokenFromRequest, verifyJwt } from "../utils/tokenCookies.js";
import { logError } from "../utils/logger.js";

export default async function auth(req, res, next) {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    return sendError(res, {
      status: 401,
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  let payload;
  try {
    payload = verifyJwt(token);
  } catch {
    return sendError(res, {
      status: 401,
      code: "INVALID_TOKEN",
      message: "Invalid or expired token",
    });
  }

  if (payload.type !== "access") {
    return sendError(res, {
      status: 401,
      code: "INVALID_TOKEN",
      message: "Invalid access token",
    });
  }

  try {
    const session = await Session.findById(payload.sessionId);
    if (!session || !session.isActive()) {
      return sendError(res, {
        status: 401,
        code: "SESSION_REVOKED",
        message: "Your session has expired or been revoked.",
      });
    }

    req.sessionId = session._id;
    req.userId = payload.id;
    req.user = await User.findById(payload.id).select("-password").lean();
    if (!req.user) {
      return sendError(res, {
        status: 401,
        code: "UNAUTHORIZED",
        message: "User no longer exists",
      });
    }

    try {
      const householdContext = await householdService.ensureUserHouseholdContext(payload.id);
      req.householdContext = householdContext;
      req.safeUser = householdContext?.safeUser || householdService.buildSafeUser(req.user);

      if (householdContext?.household?._id) {
        req.user.activeHouseholdId = householdContext.household._id;
      }

      if (householdContext?.selfMember?._id) {
        req.user.primaryMemberProfileId = householdContext.selfMember._id;
      }
    } catch (error) {
      req.householdContext = null;
      req.safeUser = householdService.buildSafeUser(req.user);
      logError(error, req, {
        statusCode: 500,
        context: {
          source: "auth.householdContext",
        },
      });
    }

    return next();
  } catch (err) {
    logError(err, req, {
      statusCode: 500,
      context: {
        source: "auth.userLookup",
      },
    });
    return sendError(res, {
      status: 500,
      code: "AUTH_SESSION_FAILED",
      message: "Could not load your session. Please try again.",
    });
  }
}
