const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { protect, authorize } = require("../middleware/auth");

// All routes are protected with the auth middleware
// and require admin or superadmin role
router.use(protect);
router.use(authorize("admin", "superadmin"));

// User management routes
router
  .route("/users")
  .get(adminController.getUsers)
  .post(
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
      body("role")
        .optional()
        .isIn(["user", "admin", "superadmin"])
        .withMessage("Invalid role"),
      body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
    ],
    adminController.createUser
  );

router
  .route("/users/:id")
  .get(adminController.getUser)
  .put(
    [
      body("username")
        .optional()
        .isLength({ min: 3 })
        .withMessage("Username must be at least 3 characters long")
        .trim()
        .escape(),
      body("email")
        .optional()
        .isEmail()
        .withMessage("Please provide a valid email")
        .normalizeEmail(),
      body("role")
        .optional()
        .isIn(["user", "admin", "superadmin"])
        .withMessage("Invalid role"),
      body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
    ],
    adminController.updateUser
  )
  .delete(adminController.deleteUser);

// Reset user password (admin action)
router.post(
  "/users/:id/reset-password",
  [
    body("password")
      .optional()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  adminController.resetUserPassword
);

module.exports = router;
