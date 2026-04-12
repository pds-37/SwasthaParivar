import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import User from "../../models/user.js";
import appConfig from "../../config/AppConfig.js";
import householdService from "../household/HouseholdService.js";

class AuthService {
  isGoogleAuthConfigured() {
    return appConfig.hasGoogleAuth;
  }

  createGoogleState() {
    return crypto.randomUUID();
  }

  normalizeEmail(email = "") {
    return String(email).trim().toLowerCase();
  }

  normalizeName(fullName = "") {
    return String(fullName).trim().replace(/\s+/g, " ");
  }

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  issueAccessToken(userId) {
    return jwt.sign({ id: userId, type: "access" }, appConfig.jwtSecret, {
      expiresIn: appConfig.accessTokenTtl,
      issuer: "swasthaparivar",
      subject: String(userId),
      audience: "swasthaparivar-client",
      jwtid: crypto.randomUUID(),
      header: { typ: "JWT" },
    });
  }

  issueRefreshToken(userId) {
    return jwt.sign({ id: userId, type: "refresh" }, appConfig.jwtSecret, {
      expiresIn: appConfig.refreshTokenTtl,
      issuer: "swasthaparivar",
      subject: String(userId),
      audience: "swasthaparivar-client",
      jwtid: crypto.randomUUID(),
    });
  }

  hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  buildGoogleAuthUrl({ state }) {
    const params = new URLSearchParams({
      client_id: appConfig.googleClientId,
      redirect_uri: appConfig.googleRedirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "select_account",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeGoogleCode(code) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: appConfig.googleClientId,
        client_secret: appConfig.googleClientSecret,
        redirect_uri: appConfig.googleRedirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google token exchange failed: ${body || response.statusText}`);
    }

    return response.json();
  }

  async fetchGoogleProfile(accessToken) {
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google profile lookup failed: ${body || response.statusText}`);
    }

    return response.json();
  }

  async persistRefreshToken(userId, refreshToken) {
    await User.findByIdAndUpdate(userId, {
      $set: {
        refreshTokenHash: this.hashToken(refreshToken),
        refreshTokenExpiresAt: new Date(Date.now() + appConfig.refreshTokenMaxAgeMs),
      },
    });
  }

  async clearRefreshToken(userId) {
    if (!userId) return;

    await User.findByIdAndUpdate(userId, {
      $set: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
  }

  async buildSession(user) {
    const accessToken = this.issueAccessToken(user._id);
    const refreshToken = this.issueRefreshToken(user._id);
    await this.persistRefreshToken(user._id, refreshToken);
    const householdContext = await householdService.ensureUserHouseholdContext(user);

    return {
      accessToken,
      refreshToken,
      user: householdContext?.safeUser || householdService.buildSafeUser(user),
    };
  }

  async register(payload) {
    const email = this.normalizeEmail(payload?.email);
    const fullName = this.normalizeName(payload?.fullName);
    const password = String(payload?.password || "");

    if (!email || !fullName || !password) {
      return { status: 400, error: { code: "VALIDATION_ERROR", message: "All fields are required" } };
    }

    if (!this.validateEmail(email)) {
      return {
        status: 400,
        error: { code: "VALIDATION_ERROR", message: "Please provide a valid email address" },
      };
    }

    if (password.length < 8) {
      return {
        status: 400,
        error: { code: "VALIDATION_ERROR", message: "Password must be at least 8 characters" },
      };
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return { status: 409, error: { code: "USER_EXISTS", message: "User already exists" } };
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      fullName,
      password: hashedPassword,
    });

    const session = await this.buildSession(user);

    return {
      status: 201,
      data: session,
    };
  }

  async login(payload) {
    const email = this.normalizeEmail(payload?.email);
    const password = String(payload?.password || "");

    if (!email || !password) {
      return { status: 400, error: { code: "VALIDATION_ERROR", message: "Missing credentials" } };
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return { status: 400, error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } };
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return { status: 400, error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } };
    }

    return { status: 200, data: await this.buildSession(user) };
  }

  async loginWithGoogle({ code }) {
    if (!this.isGoogleAuthConfigured()) {
      return {
        status: 503,
        error: { code: "GOOGLE_AUTH_NOT_CONFIGURED", message: "Google sign-in is not configured" },
      };
    }

    if (!code) {
      return {
        status: 400,
        error: { code: "GOOGLE_CODE_MISSING", message: "Google authorization code is missing" },
      };
    }

    const tokenPayload = await this.exchangeGoogleCode(code);
    const profile = await this.fetchGoogleProfile(tokenPayload.access_token);

    const email = this.normalizeEmail(profile?.email);
    const fullName = this.normalizeName(profile?.name || email.split("@")[0] || "Google user");
    const googleId = String(profile?.sub || "");

    if (!email || !googleId || profile?.email_verified === false) {
      return {
        status: 400,
        error: { code: "GOOGLE_PROFILE_INVALID", message: "Google account details are incomplete" },
      };
    }

    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (!user) {
      const generatedPassword = await bcrypt.hash(`${crypto.randomUUID()}::${email}`, 12);
      user = await User.create({
        email,
        fullName,
        password: generatedPassword,
        googleId,
        avatarUrl: profile?.picture || null,
      });
    } else {
      const updates = {};

      if (!user.googleId) {
        updates.googleId = googleId;
      }

      if (profile?.picture && user.avatarUrl !== profile.picture) {
        updates.avatarUrl = profile.picture;
      }

      if (fullName && user.fullName !== fullName) {
        updates.fullName = fullName;
      }

      if (Object.keys(updates).length > 0) {
        Object.assign(user, updates);
        await user.save();
      }
    }

    return { status: 200, data: await this.buildSession(user) };
  }

  async refreshSession(refreshToken) {
    if (!refreshToken) {
      return { status: 401, error: { code: "UNAUTHORIZED", message: "Refresh token missing" } };
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, appConfig.jwtSecret, {
        issuer: "swasthaparivar",
        audience: "swasthaparivar-client",
      });
    } catch {
      return { status: 401, error: { code: "INVALID_REFRESH_TOKEN", message: "Refresh token is invalid or expired" } };
    }

    if (payload.type !== "refresh") {
      return { status: 401, error: { code: "INVALID_REFRESH_TOKEN", message: "Refresh token is invalid" } };
    }

    const user = await User.findById(payload.id).select("+refreshTokenHash +refreshTokenExpiresAt");
    if (!user || !user.refreshTokenHash) {
      return { status: 401, error: { code: "INVALID_REFRESH_TOKEN", message: "Refresh token is no longer active" } };
    }

    if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt.getTime() < Date.now()) {
      await this.clearRefreshToken(user._id);
      return { status: 401, error: { code: "INVALID_REFRESH_TOKEN", message: "Refresh token expired" } };
    }

    if (this.hashToken(refreshToken) !== user.refreshTokenHash) {
      await this.clearRefreshToken(user._id);
      return { status: 401, error: { code: "INVALID_REFRESH_TOKEN", message: "Refresh token mismatch" } };
    }

    return { status: 200, data: await this.buildSession(user) };
  }

  async logout(tokens = {}) {
    const token = tokens.refreshToken || tokens.accessToken;
    if (!token) {
      return { status: 200, data: { loggedOut: true } };
    }

    try {
      const payload = jwt.verify(token, appConfig.jwtSecret, {
        issuer: "swasthaparivar",
        audience: "swasthaparivar-client",
      });
      await this.clearRefreshToken(payload.id);
    } catch {
      // Clearing cookies is enough even if the token is stale.
    }

    return { status: 200, data: { loggedOut: true } };
  }
}

const authService = new AuthService();

export default authService;
