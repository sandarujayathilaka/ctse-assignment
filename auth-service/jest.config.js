/** @type {import('jest').Config} */
module.exports = {
  // Test environment setup
  testEnvironment: "node",

  // Files to run before each test file
  setupFilesAfterEnv: ["./src/tests/setup.js"],

  // Detect and report open handles
  detectOpenHandles: true,

  // Test match patterns
  testMatch: ["**/tests/**/*.test.js", "**/tests/**/*.spec.js"],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  coveragePathIgnorePatterns: ["/node_modules/", "/tests/"],

  // Ignore specific paths
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],

  // Timeout settings
  testTimeout: 30000, // 30 seconds

  // Verbose output
  verbose: true,

  // Clear mocks before each test
  clearMocks: true,

  // Reset module registry before each test
  resetModules: true,

  // Collect module traces for better debugging
  collectCoverageFrom: ["src/**/*.js", "!src/**/*.d.ts"],

  reporters: [
    "default",
    [
      "jest-sonar",
      {
        outputDirectory: ".",
        outputName: "test-report.xml",
      },
    ],
  ],
};
