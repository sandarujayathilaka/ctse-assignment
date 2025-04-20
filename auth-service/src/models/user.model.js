const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please provide a username"],
    unique: true,
    trim: true,
    minlength: [3, "Username must be at least 3 characters long"],
  },
  email: {
    type: String,
    required: [true, "Please provide an email"],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email",
    ],
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: [6, "Password must be at least 6 characters long"],
    select: false, // Don't return password in queries by default
  },
  role: {
    type: String,
    enum: ["user", "admin", "superadmin"],
    default: "user",
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  activationToken: String,
  activationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  otp: {
    code: String,
    expiresAt: Date,
  },
  otpVerified: {
    type: Boolean,
    default: false,
  },
  lastLogin: Date,
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockedUntil: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field on save
UserSchema.pre("save", async function (next) {
  this.updatedAt = Date.now();
  next();
});

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and store OTP for the user
UserSchema.methods.generateOTP = function () {
  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP with 10 minute expiration
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  };

  return otp;
};

// Verify if an OTP is valid
UserSchema.methods.verifyOTP = function (enteredOtp) {
  return (
    this.otp && this.otp.code === enteredOtp && this.otp.expiresAt > Date.now()
  );
};

// Clear OTP after verification
UserSchema.methods.clearOTP = function () {
  this.otp = undefined;
  this.otpVerified = true;
};

// Increment failed login attempts
UserSchema.methods.incrementLoginAttempts = function () {
  this.failedLoginAttempts += 1;

  // Lock account after 5 failed attempts for 15 minutes
  if (this.failedLoginAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }

  return this.save();
};

// Reset failed login attempts
UserSchema.methods.resetLoginAttempts = function () {
  this.failedLoginAttempts = 0;
  this.lockedUntil = undefined;
  this.lastLogin = Date.now();

  return this.save();
};

// Check if account is locked
UserSchema.methods.isAccountLocked = function () {
  return this.lockedUntil && this.lockedUntil > Date.now();
};

module.exports = mongoose.model("User", UserSchema);
