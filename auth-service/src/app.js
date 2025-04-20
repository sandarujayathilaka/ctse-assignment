const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const config = require("./config");

const app = express();

// Only set trust proxy in production environments
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", true);
}

// Security middleware
app.use(helmet()); // Helps secure Express apps with various HTTP headers

app.use(
  cors({
    origin: config.cors.origin,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders,
    credentials: true, // Allow cookies to be sent cross-origin
  })
);

// Cookie parser middleware
app.use(cookieParser());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Disable rate limiting in test environment
if (process.env.NODE_ENV !== "test") {
  // Rate limiting for all API requests
  const apiLimiter = rateLimit({
    windowMs: config.rateLimit.window,
    max: config.rateLimit.max,
    message: "Too many requests from this IP, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", apiLimiter);

  // Specific rate limit for login attempts
  const loginLimiter = rateLimit({
    windowMs: config.rateLimit.loginWindow,
    max: config.rateLimit.loginMax,
    message: "Too many login attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/auth/login", loginLimiter);
}

// Create a directory for email templates if it doesn't exist
const emailTemplatesDir = path.join(__dirname, "templates", "emails");
const fs = require("fs");
if (!fs.existsSync(emailTemplatesDir)) {
  fs.mkdirSync(emailTemplatesDir, { recursive: true });
}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok!" });
});

// Datadog health check endpoint
app.get("/datadog-health", (req, res) => {
  res.status(200).json({ status: "Datadog monitoring is active" });
});

// API status endpoint
app.get("/api/status", (req, res) => {
  res.status(200).json({
    status: "operational",
    version: process.env.npm_package_version || "1.0.0",
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler middleware
app.use(errorHandler);

module.exports = app;
