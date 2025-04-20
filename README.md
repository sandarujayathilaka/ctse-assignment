# Authentication Microservice

A secure, scalable authentication microservice built with Node.js, Express, and MongoDB. This project demonstrates DevOps practices, containerization, and cloud deployment for a university assignment.

## Features

- **User Authentication**

  - Registration with email verification
  - JWT-based authentication
  - Optional two-factor authentication (OTP)
  - Password reset functionality
  - Account activation workflow
  - Refresh token mechanism
  - Role-based access control (User, Admin, Superadmin)

- **Security Measures**

  - Password hashing with bcrypt
  - JWT authentication with short-lived tokens
  - Rate limiting to prevent brute force attacks
  - Input validation and sanitization
  - CORS protection with configurable origins
  - Security headers with Helmet middleware
  - Account locking after failed login attempts
  - OTP for two-factor authentication
  - Secret management using AWS Secrets Manager

- **DevOps & Infrastructure**
  - CI/CD pipeline with GitHub Actions
  - Containerization with Docker multi-stage builds
  - Container Registry with Amazon ECR
  - Orchestration with AWS ECS
  - Infrastructure as Code with Terraform
  - Monitoring with Datadog and CloudWatch
  - Security scanning with Snyk
  - Comprehensive testing with Jest
  - AWS IAM roles with least privilege principles

## Architecture

The microservice follows a layered architecture:

- **Routes**: Define API endpoints
- **Controllers**: Handle request/response logic
- **Services**: Implement business logic
- **Models**: Define data structures
- **Middleware**: Handle cross-cutting concerns
- **Config**: Application configuration
- **Utils**: Shared utility functions

## API Endpoints

| Method | Endpoint                            | Description               | Authentication Required | Access Roles      |
| ------ | ----------------------------------- | ------------------------- | ----------------------- | ----------------- |
| POST   | /api/auth/register                  | Register a new user       | No                      | Public            |
| GET    | /api/auth/activate/:token           | Activate account          | No                      | Public            |
| POST   | /api/auth/login                     | Authenticate user         | No                      | Public            |
| POST   | /api/auth/verify-otp                | Verify OTP code           | No                      | Public            |
| POST   | /api/auth/refresh-token             | Refresh access token      | No (refresh token)      | Public            |
| POST   | /api/auth/logout                    | Log out user              | Yes                     | All               |
| GET    | /api/auth/me                        | Get current user          | Yes                     | All               |
| POST   | /api/auth/forgot-password           | Request password reset    | No                      | Public            |
| POST   | /api/auth/reset-password/:token     | Reset password            | No                      | Public            |
| POST   | /api/auth/validate-token            | Validate JWT token        | Yes                     | All               |
| GET    | /api/admin/users                    | Get all users (paginated) | Yes                     | Admin, Superadmin |
| GET    | /api/admin/users/:id                | Get specific user         | Yes                     | Admin, Superadmin |
| POST   | /api/admin/users                    | Create user (by admin)    | Yes                     | Admin, Superadmin |
| PUT    | /api/admin/users/:id                | Update user               | Yes                     | Admin, Superadmin |
| DELETE | /api/admin/users/:id                | Delete user               | Yes                     | Admin, Superadmin |
| POST   | /api/admin/users/:id/reset-password | Reset user password       | Yes                     | Admin, Superadmin |
| GET    | /health                             | Health check endpoint     | No                      | Public            |
| GET    | /datadog-health                     | Datadog health check      | No                      | Public            |
| GET    | /api/status                         | API status                | No                      | Public            |

## CI/CD Pipeline

The GitHub Actions workflow includes:

1. **Build & Test**: Run tests and linting
2. **Security Scan**: Analyze code for vulnerabilities using Snyk
3. **Build & Push**: Create Docker image and push to ECR
4. **Deploy**: Update ECS service with new deployment

```yaml
# Pipeline steps
name: CI/CD Pipeline

on:
  push:
    branches: [main]
    paths:
      - "auth-service/**"
      - ".github/workflows/ci-cd.yml"
  pull_request:
    branches: [main]
    paths:
      - "auth-service/**"
      - ".github/workflows/ci-cd.yml"

jobs:
  build-and-test:
    # Test job

  build-and-push-image:
    # Build and push Docker image job

  deploy:
    # Deployment job
```

## Deployment Architecture

The microservice is deployed to AWS using the following components:

- **VPC**: Isolated network with public subnets
- **ECS Cluster**: Container orchestration
- **EC2 Instances**: Hosts for containers (t2.micro for cost efficiency)
- **Application Load Balancer**: For traffic routing
- **ECR Repository**: For storing Docker images
- **CloudWatch**: For logs and monitoring
- **Parameter Store**: For secrets and configuration
- **Datadog Integration**: Advanced monitoring and alerting

## Monitoring and Observability

The service includes comprehensive monitoring:

- **Datadog APM**: For performance monitoring
- **Datadog Metrics**: Custom dashboard for service health
- **Datadog Alerts**: Configured for service health and error rates
- **Winston Logging**: Structured logging for application events
- **CloudWatch Logs**: Container and application logs
- **Health Endpoints**: For service monitoring

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- Docker and Docker Compose (for containerized development)
- AWS CLI (for deployment)
- Terraform (for infrastructure provisioning)

### Local Development

1. Clone the repository

```bash
git clone https://github.com/your-username/auth-microservice.git
cd auth-microservice
```

2. Install dependencies

```bash
cd auth-service
npm install
```

3. Create a `.env` file based on `.env.example`

```bash
cp .env.example .env
# Edit .env with your values
```

4. Start the development server

```bash
npm run dev
```

### Using Docker Compose

```bash
docker-compose up
```

### Running Tests

```bash
npm test
```

## Terraform Deployment

The project includes Terraform configurations for AWS deployment:

1. Configure AWS credentials
2. Create a `terraform.tfvars` file based on the example
3. Apply the Terraform configuration

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

terraform init
terraform plan
terraform apply
```

## Project Structure

```
.
├── .github/workflows      # CI/CD pipeline definitions
├── auth-service           # Main application code
│   ├── src                # Source code
│   │   ├── config         # Application configuration
│   │   ├── controllers    # Request handlers
│   │   ├── middleware     # Express middleware
│   │   ├── models         # Mongoose models
│   │   ├── routes         # API routes
│   │   ├── templates      # Email templates
│   │   ├── tests          # Test files
│   │   └── utils          # Utility functions
│   ├── .env.example       # Example environment variables
│   ├── Dockerfile         # Docker configuration
│   └── package.json       # Node.js dependencies
└── terraform              # Infrastructure as Code
    ├── main.tf            # Main Terraform configuration
    ├── variables.tf       # Variable definitions
    └── datadog.tf         # Datadog integration
```

## Security Considerations

- **Least Privilege**: IAM roles with minimal permissions
- **Secret Management**: Using AWS Parameter Store for secrets
- **Container Security**: Multi-stage Docker builds
- **Dependency Scanning**: Snyk integration
- **Rate Limiting**: Prevents abuse and DDoS attacks
- **Input Validation**: All user inputs are validated
- **HTTPS**: Load balancer configured for secure communication
- **Password Policies**: Enforced password complexity
- **Account Lockout**: After failed login attempts

## License

This project is licensed under the MIT License - see the LICENSE file for details.
