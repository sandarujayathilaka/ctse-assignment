const { validationResult } = require("express-validator");
const User = require("../models/user.model");
const logger = require("../utils/logger");
const emailService = require("../utils/email-service");
const crypto = require("crypto");

// Helper function to validate role assignment permissions
const validateRoleAssignment = (adminRole, targetRole) => {
  // Superadmin can assign any role
  if (adminRole === "superadmin") {
    return true;
  }

  // Admin can only assign user or admin roles
  if (adminRole === "admin") {
    return ["user", "admin"].includes(targetRole);
  }

  // Regular users can't assign roles
  return false;
};

// @desc    Get all users (with pagination)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const filter = {};

    // Apply search filters if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      filter.$or = [{ username: searchRegex }, { email: searchRegex }];
    }

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.isActive) {
      filter.isActive = req.query.isActive === "true";
    }

    // Exclude superadmin from results for regular admins
    if (req.user.role !== "superadmin") {
      filter.role = { $ne: "superadmin" };
    }

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    // Fetch users
    const users = await User.find(filter)
      .select(
        "-password -resetPasswordToken -resetPasswordExpire -activationToken -activationExpire -otp"
      )
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    // Pagination response
    const pagination = {
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    };

    res.status(200).json({
      success: true,
      pagination,
      users,
    });
  } catch (error) {
    logger.error("Error fetching users:", error);
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-password -resetPasswordToken -resetPasswordExpire -activationToken -activationExpire -otp"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check permission - only superadmin can view another superadmin
    if (user.role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this user",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    logger.error(`Error fetching user ${req.params.id}:`, error);
    next(error);
  }
};

// @desc    Create new user (by admin)
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { username, email, password, role, isActive } = req.body;

    // Check if user exists
    const userExists = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with that email or username",
      });
    }

    // Validate role assignment permissions
    if (!validateRoleAssignment(req.user.role, role)) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to create a user with role: ${role}`,
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      role: role || "user",
      isActive: isActive === undefined ? true : isActive,
      emailVerified: isActive === undefined ? true : isActive,
    });

    // Send welcome email if account is active
    if (user.isActive) {
      try {
        await emailService.sendEmail(
          email,
          "Welcome to the Platform",
          "welcome-email",
          {
            username: username,
            message: "Your account has been created by an administrator.",
          }
        );
      } catch (error) {
        logger.error(`Failed to send welcome email to ${email}:`, error);
      }
    }

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    logger.error("Error creating user:", error);
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { username, email, role, isActive } = req.body;

    // Find user
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check permissions
    // Only superadmin can modify another superadmin
    if (user.role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this user",
      });
    }

    // Validate role change permission
    if (role && role !== user.role) {
      if (!validateRoleAssignment(req.user.role, role)) {
        return res.status(403).json({
          success: false,
          message: `You don't have permission to assign the role: ${role}`,
        });
      }
      user.role = role;
    }

    // Update username if provided
    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username });
      if (
        usernameExists &&
        usernameExists._id.toString() !== user._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: "Username is already taken",
        });
      }
      user.username = username;
    }

    // Update email if provided
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Email is already registered",
        });
      }
      user.email = email;
      user.emailVerified = false; // Require verification for new email
    }

    // Update active status if provided
    if (isActive !== undefined) {
      const wasInactive = !user.isActive;
      user.isActive = isActive;

      // If activating a previously inactive account
      if (isActive && wasInactive) {
        try {
          await emailService.sendEmail(
            user.email,
            "Your Account Has Been Activated",
            "account-activated-email",
            {
              username: user.username,
              message: "Your account has been activated by an administrator.",
            }
          );
        } catch (error) {
          logger.error(
            `Failed to send activation email to ${user.email}:`,
            error
          );
          // Continue anyway - don't fail the activation if email fails
        }
      }

      // If deactivating an account
      if (!isActive && !wasInactive) {
        try {
          await emailService.sendEmail(
            user.email,
            "Your Account Has Been Deactivated",
            "account-deactivated-email",
            {
              username: user.username,
              message: "Your account has been deactivated by an administrator.",
            }
          );
        } catch (error) {
          logger.error(
            `Failed to send deactivation email to ${user.email}:`,
            error
          );
          // Continue anyway - don't fail the deactivation if email fails
        }
      }
    }

    await user.save();

    // Return response with sanitized user data
    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    logger.error(`Error updating user ${req.params.id}:`, error);
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check permission - only superadmin can delete another superadmin or admin
    if (
      (user.role === "superadmin" || user.role === "admin") &&
      req.user.role !== "superadmin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this user",
      });
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    await user.deleteOne();

    // Send notification email
    try {
      await emailService.sendEmail(
        user.email,
        "Account Deletion Notice",
        "account-deleted-email",
        {
          username: user.username,
          message: "Your account has been deleted by an administrator.",
        }
      );
    } catch (error) {
      logger.error(
        `Failed to send account deletion email to ${user.email}:`,
        error
      );
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    logger.error(`Error deleting user ${req.params.id}:`, error);
    next(error);
  }
};

// @desc    Reset user password (by admin)
// @route   POST /api/admin/users/:id/reset-password
// @access  Private/Admin
exports.resetUserPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check permission - only superadmin can reset another superadmin's password
    if (user.role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to reset this user's password",
      });
    }

    // Generate temporary password or use provided one
    const tempPassword =
      req.body.password || crypto.randomBytes(10).toString("hex");

    // Update user password
    user.password = tempPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Send email with temporary password (skip in test environment)
    if (process.env.NODE_ENV !== "test") {
      try {
        await emailService.sendEmail(
          user.email,
          "Your Password Has Been Reset",
          "admin-password-reset-email",
          {
            username: user.username,
            tempPassword: tempPassword,
            message:
              "Your password has been reset by an administrator. Please use the temporary password below to log in and then change your password.",
          }
        );
      } catch (error) {
        logger.error(
          `Failed to send password reset email to ${user.email}:`,
          error
        );
        // Continue anyway - still return success but with password in response
        return res.status(200).json({
          success: true,
          message: "Password reset successful but failed to send email.",
          tempPassword: tempPassword, // Return password in response if email fails
        });
      }
    }

    res.status(200).json({
      success: true,
      message:
        "Password reset successful. A temporary password has been sent to the user.",
      // Include the password in the response for test environments
      ...(process.env.NODE_ENV === "test" && { tempPassword }),
    });
  } catch (error) {
    logger.error(`Error resetting password for user ${req.params.id}:`, error);
    next(error);
  }
};
