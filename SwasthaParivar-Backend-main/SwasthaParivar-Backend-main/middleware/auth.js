import User from "../models/user.js";
import householdService from "../services/household/HouseholdService.js";
import { sendError } from "../utils/apiResponse.js";
import { getAccessTokenFromRequest, verifyJwt } from "../utils/tokenCookies.js";

export default async function auth(req, res, next) {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      return sendError(res, {
        status: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const payload = verifyJwt(token);
    if (payload.type !== "access") {
      return sendError(res, {
        status: 401,
        code: "INVALID_TOKEN",
        message: "Invalid access token",
      });
    }

    req.userId = payload.id;
    req.user = await User.findById(payload.id).select("-password").lean();
    if (!req.user) {
      return sendError(res, {
        status: 401,
        code: "UNAUTHORIZED",
        message: "User no longer exists",
      });
    }

    const householdContext = await householdService.ensureUserHouseholdContext(payload.id);
    req.householdContext = householdContext;
    req.safeUser = householdContext?.safeUser || householdService.buildSafeUser(req.user);

    if (householdContext?.household?._id) {
      req.user.activeHouseholdId = householdContext.household._id;
    }

    if (householdContext?.selfMember?._id) {
      req.user.primaryMemberProfileId = householdContext.selfMember._id;
    }

    next();
  } catch (err) {
    return sendError(res, {
      status: 401,
      code: "INVALID_TOKEN",
      message: "Invalid or expired token",
    });
  }
}
