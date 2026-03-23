import authService from "../services/auth/AuthService.js";
import appConfig from "../config/AppConfig.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import {
  clearAuthCookies,
  getAccessTokenFromRequest,
  getCookieOptions,
  getRefreshTokenFromRequest,
  setAuthCookies,
} from "../utils/tokenCookies.js";

const GOOGLE_STATE_COOKIE = "sp_google_state";
const GOOGLE_RETURN_COOKIE = "sp_google_return_to";
const GOOGLE_COOKIE_PATH = "/api/auth";
const GOOGLE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

const getGoogleCookieOptions = (maxAge) => ({
  ...getCookieOptions(maxAge, GOOGLE_COOKIE_PATH),
  sameSite: "lax",
});

const normalizeOrigin = (value = "") => {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
};

const isAllowedClientOrigin = (origin) =>
  Boolean(origin) && appConfig.matchesAllowedOrigin(origin);

const resolveClientOrigin = (req, candidate = "") => {
  const normalizedCandidate = normalizeOrigin(candidate);
  if (isAllowedClientOrigin(normalizedCandidate)) {
    return normalizedCandidate;
  }

  const refererOrigin = normalizeOrigin(req.get("referer") || "");
  if (isAllowedClientOrigin(refererOrigin)) {
    return refererOrigin;
  }

  const originHeader = normalizeOrigin(req.get("origin") || "");
  if (isAllowedClientOrigin(originHeader)) {
    return originHeader;
  }

  return appConfig.defaultClientUrl;
};

const buildClientUrl = (origin, pathname, params = {}) => {
  const url = new URL(pathname, origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

const clearGoogleCookies = (res) => {
  res.clearCookie(GOOGLE_STATE_COOKIE, getGoogleCookieOptions(0));
  res.clearCookie(GOOGLE_RETURN_COOKIE, getGoogleCookieOptions(0));
};

class AuthController {
  async signup(req, res) {
    const result = await authService.register(req.body);
    if (result.error) {
      return sendError(res, {
        status: result.status,
        code: result.error.code,
        message: result.error.message,
      });
    }

    setAuthCookies(res, result.data);
    return sendSuccess(res, {
      status: result.status,
      data: {
        user: result.data.user,
      },
    });
  }

  async login(req, res) {
    const result = await authService.login(req.body);
    if (result.error) {
      return sendError(res, {
        status: result.status,
        code: result.error.code,
        message: result.error.message,
      });
    }

    setAuthCookies(res, result.data);
    return sendSuccess(res, {
      status: result.status,
      data: {
        user: result.data.user,
      },
    });
  }

  async refresh(req, res) {
    const result = await authService.refreshSession(getRefreshTokenFromRequest(req));

    if (result.error) {
      clearAuthCookies(res);
      return sendError(res, {
        status: result.status,
        code: result.error.code,
        message: result.error.message,
      });
    }

    setAuthCookies(res, result.data);
    return sendSuccess(res, {
      status: 200,
      data: {
        user: result.data.user,
      },
    });
  }

  async logout(req, res) {
    const result = await authService.logout({
      accessToken: getAccessTokenFromRequest(req),
      refreshToken: getRefreshTokenFromRequest(req),
    });

    clearAuthCookies(res);
    return sendSuccess(res, {
      status: result.status,
      data: result.data,
    });
  }

  async session(req, res) {
    return sendSuccess(res, {
      status: 200,
      data: {
        user: req.user,
      },
    });
  }

  async googleStart(req, res) {
    const clientOrigin = resolveClientOrigin(req, req.query.returnTo);

    if (!authService.isGoogleAuthConfigured()) {
      return res.redirect(
        buildClientUrl(clientOrigin, "/auth", { authError: "google_not_configured" })
      );
    }

    const state = authService.createGoogleState();
    res.cookie(GOOGLE_STATE_COOKIE, state, getGoogleCookieOptions(GOOGLE_COOKIE_MAX_AGE_MS));
    res.cookie(
      GOOGLE_RETURN_COOKIE,
      clientOrigin,
      getGoogleCookieOptions(GOOGLE_COOKIE_MAX_AGE_MS)
    );

    return res.redirect(authService.buildGoogleAuthUrl({ state }));
  }

  async googleCallback(req, res) {
    const clientOrigin = resolveClientOrigin(req, req.cookies?.[GOOGLE_RETURN_COOKIE]);
    const fail = (authError) => {
      clearGoogleCookies(res);
      clearAuthCookies(res);
      return res.redirect(buildClientUrl(clientOrigin, "/auth", { authError }));
    };

    if (req.query.error) {
      return fail("google_cancelled");
    }

    if (!req.query.state || req.query.state !== req.cookies?.[GOOGLE_STATE_COOKIE]) {
      return fail("google_state_invalid");
    }

    clearGoogleCookies(res);

    const result = await authService.loginWithGoogle({ code: req.query.code });
    if (result.error) {
      return fail(result.error.code.toLowerCase());
    }

    setAuthCookies(res, result.data);
    return res.redirect(buildClientUrl(clientOrigin, "/dashboard"));
  }
}

const authController = new AuthController();

export default authController;
