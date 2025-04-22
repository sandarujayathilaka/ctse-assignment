const config = require("../config");

const tracer = require("dd-trace").init({
  service: "auth-service",
  env: config.env,
  logInjection: true,
  analytics: true,
});

module.exports = tracer;
