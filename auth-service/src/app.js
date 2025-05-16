const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./utils/swagger");

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const systemRoutes = require("./routes/system.routes");
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

// Swagger Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Auth Microservice API Documentation",
    swaggerOptions: {
      withCredentials: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  })
);

// Serve Swagger JSON
app.get("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// System routes - handle health and status endpoints
app.use("/", systemRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler middleware
app.use(errorHandler);

module.exports = app;
