variable "aws_region" {
  description = "The AWS region to deploy resources to"
  type        = string
  default     = "us-east-1"
}

variable "mongo_uri" {
  description = "MongoDB connection URI"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret key for JWT tokens"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Deployment environment (e.g., development, production)"
  type        = string
  default     = "development"
}

variable "app_name" {
  description = "Name of the application"
  type        = string
  default     = "auth-service"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "container_port" {
  description = "Port exposed by the container"
  type        = number
  default     = 3000
}

variable "desired_count" {
  description = "Number of instances of the task to run"
  type        = number
  default     = 1 # Reduced to 1 for free tier
}

variable "cpu" {
  description = "CPU units for the task"
  type        = string
  default     = "256" # Minimum value
}

variable "memory" {
  description = "Memory for the task"
  type        = string
  default     = "400" # Minimum value
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro" # Free tier eligible
}

variable "ssh_public_key" {
  description = "The public key for SSH access to EC2 instances"
  type        = string
  default     = ""
}

# Datadog variables
variable "datadog_api_key" {
  description = "Datadog API key"
  type        = string
  sensitive   = true
}

variable "datadog_app_key" {
  description = "Datadog application key"
  type        = string
  sensitive   = true
}


# Email configuration
variable "email_host" {
  description = "SMTP server host"
  type        = string
  default     = "smtp.gmail.com"
}

variable "email_port" {
  description = "SMTP server port"
  type        = number
  default     = 587
}

variable "email_secure" {
  description = "Whether to use TLS when connecting to the SMTP server"
  type        = bool
  default     = false
}

variable "email_user" {
  description = "SMTP server username"
  type        = string
  sensitive   = true
}

variable "email_pass" {
  description = "SMTP server password"
  type        = string
  sensitive   = true
}

variable "email_from" {
  description = "Sender email address"
  type        = string
  default     = ""
}

variable "require_otp" {
  description = "Whether to require OTP verification"
  type        = bool
  default     = false
}

variable "skip_otp" {
  description = "Whether to skip OTP verification in development"
  type        = bool
  default     = true
}