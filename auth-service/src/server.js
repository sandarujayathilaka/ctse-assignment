require("./utils/datadog"); // Initialize tracer before importing other modules

const app = require("./app");
const config = require("./config");
const connectDB = require("./config/database");
const logger = require("./utils/logger");

// Connect to MongoDB
connectDB();

// Start the server
const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", err);
  server.close(() => process.exit(1));
});

module.exports = server; // For testing purposes
