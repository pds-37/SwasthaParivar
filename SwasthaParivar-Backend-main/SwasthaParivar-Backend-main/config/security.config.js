const securityConfig = {
  jwt: {
    algorithm: "HS256",
    issuer: "swasthaparivar",
    audience: "swasthaparivar-client",
  },
  upload: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp"
    ],
    allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"]
  },
  rateLimits: {
    api: { duration: 60, points: 100 },
    auth: { duration: 15 * 60, points: 5 },
    authGoogle: { duration: 15 * 60, points: 20 },
    ai: { duration: 60, points: 30 },
    upload: { duration: 60, points: 10 }
  },
  threatThresholds: {
    failedLogin: 5,
    failedLoginBurst: 20,
    promptInjectionLow: 10,
    promptInjectionHigh: 25,
    malwareUpload: 40,
    nosqlInjection: 35,
    rateLimitBreach: 15,
    repeatedErrors: 10,
    autoSuspendThreshold: 80,
    stepUpAuthThreshold: 50
  },
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: false
  },
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://accounts.google.com"],
        frameSrc: ["'self'", "https://accounts.google.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    frameguard: {
      action: "deny"
    }
  },
  retentionPolicies: {
    securityEventsDays: 90,     // TTL for SecurityEvent collection
    auditLogsDays: 7 * 365,     // TTL for AuditLog collection (7 years for PHI compliance)
    promptLogsDays: 30          // TTL for PromptLog collection
  },
  dataClassification: {
    levels: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
    default: "INTERNAL"
  }
};

export default securityConfig;
