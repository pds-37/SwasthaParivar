import authService from "../services/auth/AuthService.js";
import appConfig from "../config/AppConfig.js";
import { logConsentIfMissing } from "../utils/consent.js";
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
const GOOGLE_RETURN_PATH_COOKIE = "sp_google_return_path";
const GOOGLE_COOKIE_PATH = "/api/auth";
const GOOGLE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

const getGoogleCookieOptions = (maxAge) => ({
  ...getCookieOptions(maxAge, GOOGLE_COOKIE_PATH),
  sameSite: appConfig.isProduction ? "none" : "lax",
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

const normalizeClientPath = (value = "") => {
  const text = String(value || "").trim();

  if (!text.startsWith("/") || text.startsWith("//")) {
    return "";
  }

  try {
    const url = new URL(text, "https://swasthaparivar.local");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
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

const normalizeAbsoluteUrl = (value = "") => {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
};

const resolveServerOrigin = (req) => {
  const forwardedProto = String(req.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim();
  const forwardedHost = String(req.get("x-forwarded-host") || "")
    .split(",")[0]
    .trim();
  const host = forwardedHost || String(req.get("host") || "").split(",")[0].trim();
  const protocol = forwardedProto || req.protocol || "http";

  if (!host) {
    return "";
  }

  return normalizeOrigin(`${protocol}://${host}`);
};

const resolveGoogleRedirectUri = (req) => {
  const requestOrigin = resolveServerOrigin(req);
  const requestRedirectUri = requestOrigin
    ? normalizeAbsoluteUrl(new URL("/api/auth/google/callback", requestOrigin).toString())
    : "";
  const configuredRedirectUri = normalizeAbsoluteUrl(appConfig.googleRedirectUri);

  if (!configuredRedirectUri) {
    return requestRedirectUri;
  }

  if (!requestRedirectUri) {
    return configuredRedirectUri;
  }

  if (configuredRedirectUri === requestRedirectUri) {
    return configuredRedirectUri;
  }

  return requestRedirectUri;
};

const normalizeAuthErrorCode = (error, fallback = "google_auth_failed") => {
  const code = String(error?.code || "").trim();
  return code ? code.toLowerCase() : fallback;
};

const clearGoogleCookies = (res) => {
  res.clearCookie(GOOGLE_STATE_COOKIE, getGoogleCookieOptions(0));
  res.clearCookie(GOOGLE_RETURN_COOKIE, getGoogleCookieOptions(0));
  res.clearCookie(GOOGLE_RETURN_PATH_COOKIE, getGoogleCookieOptions(0));
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

    await logConsentIfMissing({
      userId: result.data?.user?.id,
      req,
    });
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

    await logConsentIfMissing({
      userId: result.data?.user?.id,
      req,
    });
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
    await logConsentIfMissing({
      userId: req.userId,
      req,
    });
    return sendSuccess(res, {
      status: 200,
      data: {
        user: req.safeUser || req.user,
      },
    });
  }

  async googleStart(req, res) {
    const clientOrigin = resolveClientOrigin(req, req.query.returnTo);
    const returnPath = normalizeClientPath(req.query.returnPath) || "/dashboard";
    const googleRedirectUri = resolveGoogleRedirectUri(req);

    if (!authService.isGoogleAuthConfigured() || !googleRedirectUri) {
      return res.redirect(
        buildClientUrl(clientOrigin, "/auth", {
          authError: "google_not_configured",
          from: returnPath !== "/dashboard" ? returnPath : "",
        })
      );
    }

    const state = authService.createGoogleState();
    res.cookie(GOOGLE_STATE_COOKIE, state, getGoogleCookieOptions(GOOGLE_COOKIE_MAX_AGE_MS));
    res.cookie(
      GOOGLE_RETURN_COOKIE,
      clientOrigin,
      getGoogleCookieOptions(GOOGLE_COOKIE_MAX_AGE_MS)
    );
    res.cookie(
      GOOGLE_RETURN_PATH_COOKIE,
      returnPath,
      getGoogleCookieOptions(GOOGLE_COOKIE_MAX_AGE_MS)
    );

    return res.redirect(authService.buildGoogleAuthUrl({ state, redirectUri: googleRedirectUri }));
  }

  async googleCallback(req, res) {
    const clientOrigin = resolveClientOrigin(req, req.cookies?.[GOOGLE_RETURN_COOKIE]);
    const returnPath = normalizeClientPath(req.cookies?.[GOOGLE_RETURN_PATH_COOKIE]) || "/dashboard";
    const googleRedirectUri = resolveGoogleRedirectUri(req);
    const fail = (authError) => {
      clearGoogleCookies(res);
      clearAuthCookies(res);
      return res.redirect(
        buildClientUrl(clientOrigin, "/auth", {
          authError,
          from: returnPath !== "/dashboard" ? returnPath : "",
        })
      );
    };

    if (!authService.isGoogleAuthConfigured() || !googleRedirectUri) {
      return fail("google_not_configured");
    }

    if (req.query.error) {
      return fail("google_cancelled");
    }

    if (!req.query.state || req.query.state !== req.cookies?.[GOOGLE_STATE_COOKIE]) {
      return fail("google_state_invalid");
    }

    clearGoogleCookies(res);

    try {
      const result = await authService.loginWithGoogle({
        code: req.query.code,
        redirectUri: googleRedirectUri,
      });
      if (result.error) {
        return fail(normalizeAuthErrorCode(result.error));
      }

      await logConsentIfMissing({
        userId: result.data?.user?.id,
        req,
      });
      setAuthCookies(res, result.data);
      return res.redirect(buildClientUrl(clientOrigin, returnPath));
    } catch (error) {
      return fail(normalizeAuthErrorCode(error));
    }
  }
}

const authController = new AuthController();

export default authController;
