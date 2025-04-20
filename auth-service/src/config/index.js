require("dotenv").config();

module.exports = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/auth-service",

  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key", // In production, use a strong secret
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  // Rate limiting
  rateLimit: {
    window: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    loginWindow: 60 * 1000, // 1 minute for login attempts
    loginMax: 5, // 5 login attempts per minute
  },

  // Datadog
  datadog: {
    apiKey: process.env.DD_API_KEY || "",
    appKey: process.env.DD_APP_KEY || "",
  },

  // Email configuration
  email: {
    from: process.env.EMAIL_FROM || "noreply@authservice.com",
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === "true",
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  // Site URL for email links
  siteUrl: process.env.SITE_URL || "http://localhost:3000",

  // Security settings
  security: {
    passwordResetExpire: 60 * 60 * 1000, // 1 hour
    activationExpire: 24 * 60 * 60 * 1000, // 24 hours
    accountLockDuration: 15 * 60 * 1000, // 15 minutes
    maxLoginAttempts: 5,
  },

  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN || "*", // In production, specify exact origins
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
};
