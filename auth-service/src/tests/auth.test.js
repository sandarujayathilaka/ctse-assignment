const request = require("supertest");
const app = require("../app");
const User = require("../models/user.model");
const crypto = require("crypto");

// Sample users for testing
const testUser = {
  username: "testuser",
  email: "test@example.com",
  password: "password123",
};

const testAdmin = {
  username: "adminuser",
  email: "admin@example.com",
  password: "admin123",
  role: "admin",
};

const testSuperadmin = {
  username: "superadmin",
  email: "superadmin@example.com",
  password: "super123",
  role: "superadmin",
};

// Increase Jest timeout for slow database operations
jest.setTimeout(30000);

describe("Authentication and Authorization Tests", () => {
  let userId;

  // Setup before all tests
  beforeAll(async () => {
    try {
      // Clear existing users for clean test environment
      await User.deleteMany({});

      // Create admin user
      const admin = await User.create({
        ...testAdmin,
        isActive: true,
        emailVerified: true,
      });
      console.log("Admin user created:", admin);

      // Create superadmin user
      const superadmin = await User.create({
        ...testSuperadmin,
        isActive: true,
        emailVerified: true,
      });
      console.log("Superadmin user created:", superadmin);

      // Create and activate test user
      const user = await User.create({
        ...testUser,
        isActive: true,
        emailVerified: true,
      });
      console.log("Test user created:", user);
      userId = user._id;

      console.log("Setup completed successfully");
    } catch (error) {
      console.error("Error in test setup:", error);
      throw error;
    }
  });

  // Cleanup after all tests
  afterAll(async () => {
    await User.deleteMany({});
  });

  // User Registration and Activation
  describe("User Registration and Activation", () => {
    it("should register a new user with inactive status", async () => {
      const res = await request(app).post("/api/auth/register").send({
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Registration successful");

      const user = await User.findOne({ email: "newuser@example.com" });
      expect(user).toBeTruthy();
      expect(user.isActive).toBe(false);
      expect(user.activationToken).toBeTruthy();
    });

    it("should not allow login for inactive user", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "newuser@example.com",
        password: "password123",
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should activate user account with valid token", async () => {
      const activationUser = {
        username: "activationtest",
        email: "activation@example.com",
        password: "password123",
      };

      await request(app).post("/api/auth/register").send(activationUser);

      const user = await User.findOne({ email: activationUser.email });
      expect(user).toBeTruthy();

      const activationToken = crypto.randomBytes(20).toString("hex");
      const activationTokenHashed = crypto
        .createHash("sha256")
        .update(activationToken)
        .digest("hex");

      user.activationToken = activationTokenHashed;
      user.activationExpire = Date.now() + 3600000; // 1 hour
      await user.save();

      const res = await request(app).get(
        `/api/auth/activate/${activationToken}`
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeTruthy();

      const activatedUser = await User.findOne({ email: activationUser.email });
      expect(activatedUser.isActive).toBe(true);
    });
  });

  // Login and Authentication
  describe("Login and Authentication", () => {
    it("should login user with valid credentials", async () => {
      // Make sure the user exists and is active
      let user = await User.findOne({ email: testUser.email });
      if (!user) {
        user = await User.create({
          ...testUser,
          isActive: true,
          emailVerified: true,
        });
      } else if (!user.isActive) {
        user.isActive = true;
        user.emailVerified = true;
        await user.save();
      }

      const res = await request(app).post("/api/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user).toHaveProperty("id");
      expect(res.body.user.email).toBe(testUser.email);

      expect(res.headers["set-cookie"]).toBeDefined();
      expect(res.headers["set-cookie"][0]).toContain("refreshToken=");
    });

    it("should access protected route with valid token", async () => {
      // Update user to ensure it's active
      let user = await User.findOne({ email: testUser.email });
      if (!user) {
        user = await User.create({
          ...testUser,
          isActive: true,
          emailVerified: true,
        });
      } else if (!user.isActive) {
        user.isActive = true;
        user.emailVerified = true;
        await user.save();
      }

      // Login to get a valid token
      const loginRes = await request(app).post("/api/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.success).toBe(true);

      const token = loginRes.body.token;
      expect(token).toBeTruthy();

      // Access protected route with the token
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toHaveProperty("id");
      expect(res.body.user.email).toBe(testUser.email);
    });

    it("should not access protected route without token", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should not access protected route with invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // Password Reset Flow
  describe("Password Reset Flow", () => {
    it("should request password reset", async () => {
      // Ensure test user exists and is active
      let user = await User.findOne({ email: testUser.email });
      if (!user) {
        user = await User.create({
          ...testUser,
          isActive: true,
          emailVerified: true,
        });
      } else if (!user.isActive) {
        user.isActive = true;
        user.emailVerified = true;
        await user.save();
      }

      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: testUser.email });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedUser = await User.findOne({ email: testUser.email });
      expect(updatedUser.resetPasswordToken).toBeTruthy();
    });

    it("should reset password with valid token", async () => {
      // Find the test user
      let user = await User.findOne({ email: testUser.email });
      if (!user) {
        user = await User.create({
          ...testUser,
          isActive: true,
          emailVerified: true,
        });
      }

      // Generate and save a token manually
      const originalToken = crypto.randomBytes(20).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(originalToken)
        .digest("hex");

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
      await user.save();

      const newPassword = "newpassword123";

      const res = await request(app)
        .post(`/api/auth/reset-password/${originalToken}`)
        .send({ password: newPassword });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Password reset successful");

      // Verify login with new password
      const loginRes = await request(app).post("/api/auth/login").send({
        email: testUser.email,
        password: newPassword,
      });

      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.token).toBeTruthy();

      // Reset password back to original for subsequent tests
      user = await User.findOne({ email: testUser.email });
      user.password = testUser.password;
      await user.save();
    });
  });

  // Role-Based Access Control
  describe("Role-Based Access Control", () => {
    it("should allow admins to access admin routes", async () => {
      // Update admin to ensure it's active
      let admin = await User.findOne({ email: testAdmin.email });
      if (!admin) {
        admin = await User.create({
          ...testAdmin,
          isActive: true,
          emailVerified: true,
        });
      } else if (!admin.isActive) {
        admin.isActive = true;
        admin.emailVerified = true;
        await admin.save();
      }

      // Login as admin
      const adminLogin = await request(app).post("/api/auth/login").send({
        email: testAdmin.email,
        password: testAdmin.password,
      });

      expect(adminLogin.statusCode).toBe(200);
      expect(adminLogin.body.success).toBe(true);
      const adminToken = adminLogin.body.token;
      expect(adminToken).toBeTruthy();

      // Access admin route
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.users).toBeDefined();
    });

    it("should not allow regular users to access admin routes", async () => {
      // Update user to ensure it's active
      let user = await User.findOne({ email: testUser.email });
      if (!user) {
        user = await User.create({
          ...testUser,
          isActive: true,
          emailVerified: true,
        });
      } else if (!user.isActive) {
        user.isActive = true;
        user.emailVerified = true;
        await user.save();
      }

      // Login as regular user
      const loginRes = await request(app).post("/api/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.success).toBe(true);
      const userToken = loginRes.body.token;
      expect(userToken).toBeTruthy();

      // Try to access admin route
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should allow superadmin to manage admin users", async () => {
      // Update superadmin to ensure it's active
      let superadmin = await User.findOne({ email: testSuperadmin.email });
      if (!superadmin) {
        superadmin = await User.create({
          ...testSuperadmin,
          isActive: true,
          emailVerified: true,
        });
      } else if (!superadmin.isActive) {
        superadmin.isActive = true;
        superadmin.emailVerified = true;
        await superadmin.save();
      }

      // Login as superadmin
      const superadminLogin = await request(app).post("/api/auth/login").send({
        email: testSuperadmin.email,
        password: testSuperadmin.password,
      });

      expect(superadminLogin.statusCode).toBe(200);
      expect(superadminLogin.body.success).toBe(true);
      const superadminToken = superadminLogin.body.token;
      expect(superadminToken).toBeTruthy();

      // Create a new admin user
      const newAdmin = {
        username: "newadmin",
        email: "newadmin@example.com",
        password: "admin456",
        role: "admin",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${superadminToken}`)
        .send(newAdmin);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe("admin");
    });

    it("should not allow regular admins to create superadmin users", async () => {
      // Update admin to ensure it's active
      let admin = await User.findOne({ email: testAdmin.email });
      if (!admin) {
        admin = await User.create({
          ...testAdmin,
          isActive: true,
          emailVerified: true,
        });
      } else if (!admin.isActive) {
        admin.isActive = true;
        admin.emailVerified = true;
        await admin.save();
      }

      // Login as admin
      const adminLogin = await request(app).post("/api/auth/login").send({
        email: testAdmin.email,
        password: testAdmin.password,
      });

      expect(adminLogin.statusCode).toBe(200);
      expect(adminLogin.body.success).toBe(true);
      const adminToken = adminLogin.body.token;
      expect(adminToken).toBeTruthy();

      // Try to create a superadmin
      const newSuperadmin = {
        username: "newsuperadmin",
        email: "newsuperadmin@example.com",
        password: "super456",
        role: "superadmin",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newSuperadmin);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // Account Management
  describe("Account Management", () => {
    beforeEach(async () => {
      // Ensure test user exists and is active
      let user = await User.findOne({ email: testUser.email });
      if (!user) {
        user = await User.create({
          ...testUser,
          isActive: true,
          emailVerified: true,
        });
        userId = user._id;
      } else {
        userId = user._id;
        if (!user.isActive) {
          user.isActive = true;
          user.emailVerified = true;
          await user.save();
        }
      }
    });

    it("should allow admins to deactivate user accounts", async () => {
      // Update admin to ensure it's active
      let admin = await User.findOne({ email: testAdmin.email });
      if (!admin) {
        admin = await User.create({
          ...testAdmin,
          isActive: true,
          emailVerified: true,
        });
      } else if (!admin.isActive) {
        admin.isActive = true;
        admin.emailVerified = true;
        await admin.save();
      }

      // Login as admin
      const adminLogin = await request(app).post("/api/auth/login").send({
        email: testAdmin.email,
        password: testAdmin.password,
      });

      expect(adminLogin.statusCode).toBe(200);
      expect(adminLogin.body.success).toBe(true);
      const adminToken = adminLogin.body.token;
      expect(adminToken).toBeTruthy();
      expect(userId).toBeTruthy();

      // Deactivate user
      const res = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.isActive).toBe(false);

      const deactivatedUser = await User.findById(userId);
      expect(deactivatedUser.isActive).toBe(false);
    });

    it("should allow admins to reactivate user accounts", async () => {
      // Ensure user is deactivated first
      let user = await User.findById(userId);
      if (!user) {
        user = await User.create({
          ...testUser,
          isActive: false,
          emailVerified: true,
        });
        userId = user._id;
      } else if (user.isActive) {
        user.isActive = false;
        await user.save();
      }

      // Update admin to ensure it's active
      let admin = await User.findOne({ email: testAdmin.email });
      if (!admin) {
        admin = await User.create({
          ...testAdmin,
          isActive: true,
          emailVerified: true,
        });
      } else if (!admin.isActive) {
        admin.isActive = true;
        admin.emailVerified = true;
        await admin.save();
      }

      // Login as admin
      const adminLogin = await request(app).post("/api/auth/login").send({
        email: testAdmin.email,
        password: testAdmin.password,
      });

      expect(adminLogin.statusCode).toBe(200);
      expect(adminLogin.body.success).toBe(true);
      const adminToken = adminLogin.body.token;
      expect(adminToken).toBeTruthy();

      // Reactivate user
      const res = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.isActive).toBe(true);

      const activatedUser = await User.findById(userId);
      expect(activatedUser.isActive).toBe(true);
    });

    it("should handle admin password reset for users", async () => {
      // Update admin to ensure it's active
      let admin = await User.findOne({ email: testAdmin.email });
      if (!admin) {
        admin = await User.create({
          ...testAdmin,
          isActive: true,
          emailVerified: true,
        });
      } else if (!admin.isActive) {
        admin.isActive = true;
        admin.emailVerified = true;
        await admin.save();
      }

      // Login as admin
      const adminLogin = await request(app).post("/api/auth/login").send({
        email: testAdmin.email,
        password: testAdmin.password,
      });

      expect(adminLogin.statusCode).toBe(200);
      expect(adminLogin.body.success).toBe(true);
      const adminToken = adminLogin.body.token;
      expect(adminToken).toBeTruthy();

      // Reset user password
      const res = await request(app)
        .post(`/api/admin/users/${userId}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ password: "admin-reset-password" });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify login with new password
      const loginRes = await request(app).post("/api/auth/login").send({
        email: testUser.email,
        password: "admin-reset-password",
      });

      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.token).toBeTruthy();
    });
  });
});
