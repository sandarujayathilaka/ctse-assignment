# Authentication Microservice

A secure, scalable authentication microservice built with Node.js, Express, and MongoDB. This project demonstrates DevOps practices, containerization, and cloud deployment for a university assignment.

## Features

- User registration and authentication
- JWT-based authentication
- Password reset functionality
- Secure password storage with bcrypt
- Input validation and sanitization
- Rate limiting to prevent attacks
- Comprehensive error handling
- Logging with Winston
- Security headers with Helmet
- Containerized with Docker
- CI/CD pipeline with GitHub Actions
- Deployment on AWS ECS Fargate

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

| Method | Endpoint                        | Description            | Authentication Required |
| ------ | ------------------------------- | ---------------------- | ----------------------- |
| POST   | /api/auth/register              | Register a new user    | No                      |
| POST   | /api/auth/login                 | Authenticate user      | No                      |
| GET    | /api/auth/me                    | Get current user       | Yes                     |
| POST   | /api/auth/forgot-password       | Request password reset | No                      |
| POST   | /api/auth/reset-password/:token | Reset password         | No                      |
| POST   | /api/auth/validate-token        | Validate JWT token     | Yes                     |
| GET    | /health                         | Health check endpoint  | No                      |

## Security Measures

- **Password Hashing**: Using bcrypt with salt rounds
- **JWT Authentication**: Short-lived tokens
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Using express-validator
- **CORS Protection**: Configurable origins
- **Security Headers**: Using Helmet middleware
- **Secret Management**: Using AWS Secrets Manager in production
- **Least Privilege**: IAM roles with minimal permissions
- **Security Scanning**: Using Snyk for vulnerability detection

## DevOps Practices

- **CI/CD Pipeline**: Automated build, test, and deployment
- **Containerization**: Docker multi-stage builds
- **Container Registry**: Amazon ECR
- **Container Orchestration**: AWS ECS Fargate
- **Infrastructure as Code**: AWS resources defined in code
- **DevSecOps**: Security scanning with Snyk

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- Docker and Docker Compose (for containerized development)

### Local Development

1. Clone the repository

```bash
git clone https://github.com/your-username/auth-microservice.git
cd auth-microservice
```

2. Install dependencies

```bash
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

## Cloud Deployment

The microservice is designed to be deployed on AWS ECS (Elastic Container Service) using Fargate, a serverless compute engine.

### AWS Resources Used

- **ECR**: For storing Docker images
- **ECS with Fargate**: For container orchestration without managing servers
- **Application Load Balancer**: For routing HTTP traffic
- **Parameter Store**: For secret management
- **CloudWatch**: For logs and monitoring
- **IAM Roles**: For secure access management

## CI/CD Pipeline

The GitHub Actions workflow includes:

1. **Build & Test**: Run tests and linting
2. **Security Scan**: Analyze code for vulnerabilities using Snyk
3. **Build & Push**: Create Docker image and push to ECR
4. **Deploy**: Update ECS service with new task definition

## License

This project is licensed under the MIT License - see the LICENSE file for details.
