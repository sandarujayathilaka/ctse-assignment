const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { protect, verifyRefreshToken } = require("../middleware/auth");

// Registration endpoint
router.post(
  "/register",
  [
    body("username")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters long")
      .trim()
      .escape(),
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  authController.register
);

// Account activation
router.get("/activate/:activationToken", authController.activateAccount);

// Login endpoint
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail(),
    body("password").exists().withMessage("Password is required"),
  ],
  authController.login
);

// OTP verification for login
router.post(
  "/verify-otp",
  [
    body("userId").isMongoId().withMessage("Valid user ID is required"),
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("Valid 6-digit OTP is required")
      .isNumeric()
      .withMessage("OTP must contain only numbers"),
  ],
  authController.verifyOtp
);

// Refresh token
router.post("/refresh-token", verifyRefreshToken, authController.refreshToken);

// Logout
router.post("/logout", protect, authController.logout);

// Get current user profile (protected route)
router.get("/me", protect, authController.getCurrentUser);

// Password reset request
router.post(
  "/forgot-password",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail(),
  ],
  authController.forgotPassword
);

// Password reset using token
router.post(
  "/reset-password/:resetToken",
  [
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  authController.resetPassword
);

// Validate token
router.post("/validate-token", protect, (req, res) => {
  res.status(200).json({
    success: true,
    valid: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

module.exports = router;
