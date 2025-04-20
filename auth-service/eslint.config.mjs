import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Base configuration for all JavaScript files
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
  },

  // CommonJS configuration
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
    },
  },

  // Browser globals for client-side code
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // Node.js environment configuration for server-side code
  {
    files: ["src/**/*.js", "config/**/*.js", "server.js", "app.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Jest test environment configuration
  {
    files: ["tests/**/*.js", "src/tests/**/*.js", "**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },

  // Ignore coverage reports
  {
    files: ["coverage/**"],
    ignores: ["coverage/**"],
  },
]);
