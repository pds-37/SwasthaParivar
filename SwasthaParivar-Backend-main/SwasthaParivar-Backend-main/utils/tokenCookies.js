import jwt from "jsonwebtoken";
import appConfig from "../config/AppConfig.js";

export const ACCESS_COOKIE_NAME = "sp_access";
export const REFRESH_COOKIE_NAME = "sp_refresh";

const baseCookieOptions = {
  httpOnly: true,
  secure: appConfig.isProduction,
  sameSite: appConfig.cookieSameSite,
};

export const getCookieOptions = (maxAge, path = "/") => ({
  ...baseCookieOptions,
  maxAge,
  path,
});

export const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie(
    ACCESS_COOKIE_NAME,
    accessToken,
    getCookieOptions(appConfig.accessTokenMaxAgeMs, "/")
  );
  res.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken,
    getCookieOptions(appConfig.refreshTokenMaxAgeMs, "/api/auth")
  );
};

export const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE_NAME, getCookieOptions(0, "/"));
  res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions(0, "/api/auth"));
};

export const getAccessTokenFromRequest = (req) => {
  const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization || req.headers.Authorization;
  if (header?.startsWith?.("Bearer ")) {
    return header.split(" ")[1];
  }

  return null;
};

export const getRefreshTokenFromRequest = (req) => req.cookies?.[REFRESH_COOKIE_NAME] || null;

export const verifyJwt = (token) => jwt.verify(token, appConfig.jwtSecret, { issuer: "swasthaparivar" });
