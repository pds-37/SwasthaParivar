import "dotenv/config";

class AppConfig {
  constructor(env = process.env) {
    this.nodeEnv = env.NODE_ENV || "development";
    this.port = Number(env.PORT || 5000);
    this.mongoUri = env.MONGO_URI || "";
    this.jwtSecret = env.JWT_SECRET || "";
    this.geminiApiKey = env.GEMINI_API_KEY || "";
    this.redisUrl = env.REDIS_URL || "";
    this.corsOrigins = this.parseOrigins(env.CORS_ORIGINS || env.CLIENT_URLS);
    this.clientUrls = this.corsOrigins;
    this.googleClientId = env.GOOGLE_CLIENT_ID || "";
    this.googleClientSecret = env.GOOGLE_CLIENT_SECRET || "";
    this.googleRedirectUri = env.GOOGLE_REDIRECT_URI || "";
    this.sentryDsn = env.SENTRY_DSN || "";
    this.sentryEnvironment = env.SENTRY_ENVIRONMENT || this.nodeEnv;
    this.accessTokenTtl = "15m";
    this.refreshTokenTtl = "7d";
    this.accessTokenMaxAgeMs = 15 * 60 * 1000;
    this.refreshTokenMaxAgeMs = 7 * 24 * 60 * 60 * 1000;
    this.cookieSameSite = env.COOKIE_SAME_SITE || (this.isProduction ? "none" : "strict");
    this.appVersion = env.APP_VERSION || env.RENDER_GIT_COMMIT || "1.0.0";

    this.validate();
  }

  get isProduction() {
    return this.nodeEnv === "production";
  }

  get defaultClientUrl() {
    return this.clientUrls[0] || "http://localhost:5173";
  }

  get hasGoogleAuth() {
    return Boolean(this.googleClientId && this.googleClientSecret && this.googleRedirectUri);
  }

  parseOrigins(rawValue = "") {
    const fallback =
      "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:4173,http://127.0.0.1:4173";

    return (rawValue || fallback)
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  validate() {
    const allowedNodeEnvs = new Set(["development", "test", "production"]);

    if (!allowedNodeEnvs.has(this.nodeEnv)) {
      throw new Error("NODE_ENV must be development, test, or production");
    }

    if (!Number.isFinite(this.port) || this.port <= 0) {
      throw new Error("PORT must be a positive number");
    }

    if (!this.mongoUri) {
      throw new Error("MONGO_URI is required");
    }

    if (!this.jwtSecret) {
      throw new Error("JWT_SECRET is required");
    }

    if (!this.corsOrigins.length) {
      throw new Error("CORS_ORIGINS or CLIENT_URLS is required");
    }

  }
}

const appConfig = new AppConfig();

export default appConfig;
