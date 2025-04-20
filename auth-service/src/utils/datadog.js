const config = require("../config");

const tracer = require("dd-trace").init({
  service: "auth-service",
  env: config.env,
  // Additional configuration options
  logInjection: true,
  analytics: true,
  // Use environment variables for API keys in production
  apiKey: config.datadog.apiKey,
});

// Export the tracer for use in other parts of the application
module.exports = tracer;
