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


});
