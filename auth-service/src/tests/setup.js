const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config({ path: ".env.test" });

// Ensure critical environment variables are set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-secret-key-for-authentication";
}

if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = "test-refresh-key-for-authentication";
}

if (!process.env.JWT_EXPIRES_IN) {
  process.env.JWT_EXPIRES_IN = "1h";
}

// Skip OTP in tests
process.env.REQUIRE_OTP = "false";
process.env.SKIP_OTP = "true";

process.env.NODE_ENV = "test";

// Global variables
let mongo;

// Global helper function for user authentication
global.createAndActivateUser = async (userData) => {
  const User = require("../models/user.model");
  const user = await User.create({
    ...userData,
    isActive: true,
    emailVerified: true,
  });
  return user;
};

// Setup before all tests
beforeAll(async () => {
  // Create MongoDB Memory Server instance
  mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri();

  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
});

// Clear database before each test
beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect and stop MongoDB Memory Server
  if (mongo) {
    await mongo.stop();
  }
  await mongoose.connection.close();
});
