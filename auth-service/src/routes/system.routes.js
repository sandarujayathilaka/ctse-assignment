const express = require("express");
const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok..." });
});

/**
 * @swagger
 * /datadog-health:
 *   get:
 *     summary: Datadog health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Datadog monitoring is active
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: Datadog monitoring is active!
 */
router.get("/datadog-health", (req, res) => {
  res.status(200).json({ status: "Datadog monitoring is active!" });
});

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: API status endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: operational
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 environment:
 *                   type: string
 *                   example: development
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2023-01-01T00:00:00.000Z
 */
router.get("/api/status", (req, res) => {
  res.status(200).json({
    status: "operational",
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
