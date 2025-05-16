const swaggerJSDoc = require("swagger-jsdoc");
const config = require("../config");

// Swagger definition
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Authentication Microservice API",
    version: "1.0.0",
    description:
      "A secure, scalable authentication microservice built with Node.js, Express, and MongoDB",
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
    contact: {
      name: "API Support",
      email: "support@authservice.com",
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: "Development server",
    },
    {
      url: config.siteUrl,
      description: "Production server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          message: {
            type: "string",
            example: "Error message",
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            example: "60d21b4967d0d8992e610c85",
          },
          username: {
            type: "string",
            example: "johndoe",
          },
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          role: {
            type: "string",
            enum: ["user", "admin", "superadmin"],
            example: "user",
          },
          isActive: {
            type: "boolean",
            example: true,
          },
          emailVerified: {
            type: "boolean",
            example: true,
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00.000Z",
          },
        },
      },
      UserInput: {
        type: "object",
        required: ["username", "email", "password"],
        properties: {
          username: {
            type: "string",
            example: "johndoe",
          },
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          password: {
            type: "string",
            format: "password",
            example: "Password123!",
          },
          role: {
            type: "string",
            enum: ["user", "admin", "superadmin"],
            example: "user",
          },
        },
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          password: {
            type: "string",
            format: "password",
            example: "Password123!",
          },
        },
      },
      TokenResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          token: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
          user: {
            $ref: "#/components/schemas/User",
          },
        },
      },
      OtpInput: {
        type: "object",
        required: ["userId", "otp"],
        properties: {
          userId: {
            type: "string",
            example: "60d21b4967d0d8992e610c85",
          },
          otp: {
            type: "string",
            example: "123456",
          },
        },
      },
      PasswordResetRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
        },
      },
      PasswordResetInput: {
        type: "object",
        required: ["password"],
        properties: {
          password: {
            type: "string",
            format: "password",
            example: "NewPassword123!",
          },
        },
      },
      RefreshTokenInput: {
        type: "object",
        properties: {
          refreshToken: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
      },
    },
  },
  tags: [
    {
      name: "Auth",
      description: "Authentication and user management endpoints",
    },
    {
      name: "Admin",
      description: "Admin-only endpoints for user management",
    },
    {
      name: "System",
      description: "System health and status endpoints",
    },
  ],
};

// Options for the swagger docs
const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: ["./src/routes/*.js"],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
