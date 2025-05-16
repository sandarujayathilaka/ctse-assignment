provider "aws" {
  region = var.aws_region
}

# VPC and Network Configuration
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.app_name}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[0]
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.app_name}-public-a"
    Environment = var.environment
  }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[1]
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.app_name}-public-b"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.app_name}-igw"
    Environment = var.environment
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name        = "${var.app_name}-public-rt"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

# Security Groups
resource "aws_security_group" "alb" {
  name        = "${var.app_name}-alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    protocol    = "tcp"
    from_port   = 443
    to_port     = 443
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.app_name}-alb-sg"
    Environment = var.environment
  }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "${var.app_name}-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    protocol        = "tcp"
    from_port       = 0 # Allow all ports
    to_port         = 65535
    security_groups = [aws_security_group.alb.id]
  }

  # Allow SSH for EC2 instances (you can restrict this to your IP in production)
  ingress {
    protocol    = "tcp"
    from_port   = 22
    to_port     = 22
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.app_name}-ecs-tasks-sg"
    Environment = var.environment
  }
}

# ECR Repository
resource "aws_ecr_repository" "auth_service" {
  name                 = var.app_name
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "${var.app_name}-ecr"
    Environment = var.environment
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "microservices-cluster"

  # Disable container insights to save costs
  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  tags = {
    Name        = "${var.app_name}-cluster"
    Environment = var.environment
  }
}

# IAM Roles for EC2 Instances and Task Execution
resource "aws_iam_role" "ecs_instance_role" {
  name = "${var.app_name}-ecs-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-ecs-instance-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ecs_instance_role" {
  role       = aws_iam_role.ecs_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_instance_profile" "ecs" {
  name = "${var.app_name}-ecs-instance-profile"
  role = aws_iam_role.ecs_instance_role.name
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.app_name}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-ecs-task-execution-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for Task (Application)
resource "aws_iam_role" "auth_service_task_role" {
  name = "AuthServiceTaskRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-task-role"
    Environment = var.environment
  }
}

# Parameter Store (for secrets)
resource "aws_ssm_parameter" "mongo_uri" {
  name        = "/${var.app_name}/MONGO_URI"
  description = "MongoDB connection URI"
  type        = "SecureString"
  value       = var.mongo_uri

  tags = {
    Name        = "${var.app_name}-mongo-uri"
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.app_name}/JWT_SECRET"
  description = "JWT secret key"
  type        = "SecureString"
  value       = var.jwt_secret

  tags = {
    Name        = "${var.app_name}-jwt-secret"
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "jwt_expires" {
  name        = "/${var.app_name}/JWT_EXPIRES_IN"
  description = "JWT expiration time"
  type        = "String"
  value       = "1d"

  tags = {
    Name        = "${var.app_name}-jwt-expires"
    Environment = var.environment
  }
}

# Parameter Store entries for email configuration
resource "aws_ssm_parameter" "email_host" {
  name        = "/${var.app_name}/EMAIL_HOST"
  description = "SMTP server host"
  type        = "String"
  value       = var.email_host

  tags = {
    Name        = "${var.app_name}-email-host"
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "email_port" {
  name        = "/${var.app_name}/EMAIL_PORT"
  description = "SMTP server port"
  type        = "String"
  value       = tostring(var.email_port)

  tags = {
    Name        = "${var.app_name}-email-port"
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "email_secure" {
  name        = "/${var.app_name}/EMAIL_SECURE"
  description = "Whether to use TLS for SMTP"
  type        = "String"
  value       = tostring(var.email_secure)

  tags = {
    Name        = "${var.app_name}-email-secure"
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "email_user" {
  name        = "/${var.app_name}/EMAIL_USER"
  description = "SMTP username"
  type        = "SecureString"
  value       = var.email_user

  tags = {
    Name        = "${var.app_name}-email-user"
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "email_pass" {
  name        = "/${var.app_name}/EMAIL_PASS"
  description = "SMTP password"
  type        = "SecureString"
  value       = var.email_pass

  tags = {
    Name        = "${var.app_name}-email-pass"
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "email_from" {
  name        = "/${var.app_name}/EMAIL_FROM"
  description = "Sender email address"
  type        = "String"
  value       = var.email_from == "" ? var.email_user : var.email_from

  tags = {
    Name        = "${var.app_name}-email-from"
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "require_otp" {
  name        = "/${var.app_name}/REQUIRE_OTP"
  description = "Whether to require OTP verification"
  type        = "String"
  value       = tostring(var.require_otp)

  tags = {
    Name        = "${var.app_name}-require-otp"
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "skip_otp" {
  name        = "/${var.app_name}/SKIP_OTP"
  description = "Whether to skip OTP verification in development"
  type        = "String"
  value       = tostring(var.skip_otp)

  tags = {
    Name        = "${var.app_name}-skip-otp"
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "site_url" {
  name        = "/${var.app_name}/SITE_URL"
  description = "Site URL for email links"
  type        = "String"
  value       = "http://${aws_lb.main.dns_name}" # Using the ALB DNS name directly

  tags = {
    Name        = "${var.app_name}-site-url"
    Environment = var.environment
  }
}

# Allow ECS Task to read from Parameter Store
resource "aws_iam_policy" "parameter_store_read" {
  name        = "${var.app_name}ParameterStoreRead"
  description = "Allow reading from Parameter Store"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.app_name}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "task_parameter_store" {
  role       = aws_iam_role.auth_service_task_role.name
  policy_arn = aws_iam_policy.parameter_store_read.arn
}

resource "aws_iam_role_policy_attachment" "execution_parameter_store" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = aws_iam_policy.parameter_store_read.arn
}

# Launch Template for EC2 Instances (replacing Launch Configuration)
resource "aws_launch_template" "ecs" {
  name_prefix            = "${var.app_name}-ecs-"
  image_id               = data.aws_ami.amazon_linux_ecs.id
  instance_type          = "t2.micro" # Free tier eligible
  vpc_security_group_ids = [aws_security_group.ecs_tasks.id]
  key_name               = data.aws_key_pair.existing.key_name

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs.name
  }


  # Set proper ECS agent configuration
  user_data = base64encode(<<EOF
#!/bin/bash
echo ECS_CLUSTER=${aws_ecs_cluster.main.name} >> /etc/ecs/ecs.config
echo ECS_RESERVED_MEMORY=96 >> /etc/ecs/ecs.config
echo ECS_CONTAINER_STOP_TIMEOUT=30s >> /etc/ecs/ecs.config
echo ECS_DISABLE_PRIVILEGED=true >> /etc/ecs/ecs.config
echo ECS_ENABLE_SPOT_INSTANCE_DRAINING=false >> /etc/ecs/ecs.config
echo ECS_ENABLE_TASK_IAM_ROLE=true >> /etc/ecs/ecs.config
EOF
  )

  # Enable detailed monitoring
  monitoring {
    enabled = true
  }

  # EBS optimized if available
  ebs_optimized = true

  # Block device mappings
  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.app_name}-ecs"
      Environment = var.environment
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Get latest ECS-optimized AMI
data "aws_ami" "amazon_linux_ecs" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-hvm-*-x86_64-ebs"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Auto Scaling Group for EC2 Instances - Updated to use Launch Template
resource "aws_autoscaling_group" "ecs" {
  name                = "${var.app_name}-ecs-asg"
  min_size            = 1
  max_size            = 2 # Limit to 1 instance for free tier
  desired_capacity    = 1
  vpc_zone_identifier = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }

  # Instance Maintenance Policy
  instance_maintenance_policy {
    min_healthy_percentage = 50
    max_healthy_percentage = 150
  }

  # Health check
  health_check_type         = "ELB"
  health_check_grace_period = 300

  # Warm pool for faster scaling
  warm_pool {
    pool_state                  = "Stopped"
    min_size                    = 0
    max_group_prepared_capacity = 1
    instance_reuse_policy {
      reuse_on_scale_in = true
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.app_name}-ecs"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  tag {
    key                 = "AmazonECSManaged"
    value               = "true"
    propagate_at_launch = true
  }
}

# Application Load Balancer
# Note: ALB has limited free tier availability, consider using NLB or direct EC2 if cost is a concern
resource "aws_lb" "main" {
  name               = "${var.app_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  tags = {
    Name        = "${var.app_name}-alb"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "app" {
  name        = "${var.app_name}-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance" # Changed from "ip" to "instance" for EC2 launch type

  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 3
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = {
    Name        = "${var.app_name}-tg"
    Environment = var.environment
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "auth_service" {
  name              = "/ecs/${var.app_name}"
  retention_in_days = 1 # Minimal retention to save costs

  tags = {
    Name        = "${var.app_name}-logs"
    Environment = var.environment
  }
}

# ECS Task Definition - Modified for EC2 compatibility
resource "aws_ecs_task_definition" "auth_service" {
  family = var.app_name
  # EC2 launch type can use bridge network mode (more efficient than awsvpc for t2.micro)
  network_mode = "bridge"
  # Remove requires_compatibilities for EC2 launch type
  cpu                = var.cpu
  memory             = var.memory
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn      = aws_iam_role.auth_service_task_role.arn

  container_definitions = jsonencode([
    {
      name      = var.app_name
      image     = "${aws_ecr_repository.auth_service.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = 0 # Dynamic port mapping
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = tostring(var.container_port)
        },
        {
          name  = "DD_ENV"
          value = var.environment
        },
        {
          name  = "DD_SERVICE"
          value = var.app_name
        },
        {
          name  = "DD_VERSION"
          value = "1.0.0"
        },
        {
          name  = "DD_LOGS_INJECTION"
          value = "true"
        },
        {
          name  = "DD_TRACE_SAMPLE_RATE"
          value = "1"
        },
        {
          name  = "DD_RUNTIME_METRICS_ENABLED"
          value = "true"
        },
        {
          name  = "DD_PROFILING_ENABLED"
          value = "true"
        },
        {
          name  = "DD_APM_ENABLED"
          value = "true"
        },
        {
          name  = "DD_AGENT_HOST"
          value = "localhost" # Point to Datadog Agent sidecar
        },
        {
          name  = "DD_TRACE_AGENT_PORT"
          value = "8126"
        },
        {
          name  = "DD_TRACE_ANALYTICS_ENABLED"
          value = "true"
        },
        {
          name  = "DD_TRACE_GLOBAL_TAGS"
          value = "service:auth-service,env:${var.environment}"
        }
      ]
      secrets = [
        {
          name      = "MONGO_URI"
          valueFrom = aws_ssm_parameter.mongo_uri.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = aws_ssm_parameter.jwt_secret.arn
        },
        {
          name      = "JWT_EXPIRES_IN"
          valueFrom = aws_ssm_parameter.jwt_expires.arn
        },
        {
          name      = "DD_API_KEY"
          valueFrom = aws_ssm_parameter.datadog_api_key.arn
        },
        {
          name      = "DD_APP_KEY"
          valueFrom = aws_ssm_parameter.datadog_app_key.arn
        },
        {
          name      = "EMAIL_HOST"
          valueFrom = aws_ssm_parameter.email_host.arn
        },
        {
          name      = "EMAIL_PORT"
          valueFrom = aws_ssm_parameter.email_port.arn
        },
        {
          name      = "EMAIL_SECURE"
          valueFrom = aws_ssm_parameter.email_secure.arn
        },
        {
          name      = "EMAIL_USER"
          valueFrom = aws_ssm_parameter.email_user.arn
        },
        {
          name      = "EMAIL_PASS"
          valueFrom = aws_ssm_parameter.email_pass.arn
        },
        {
          name      = "EMAIL_FROM"
          valueFrom = aws_ssm_parameter.email_from.arn
        },
        {
          name      = "REQUIRE_OTP"
          valueFrom = aws_ssm_parameter.require_otp.arn
        },
        {
          name      = "SKIP_OTP"
          valueFrom = aws_ssm_parameter.skip_otp.arn
        },
        {
          name      = "SITE_URL"
          valueFrom = aws_ssm_parameter.site_url.arn
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.auth_service.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "wget -qO- http://localhost:${var.container_port}/health || exit 1"]
        interval    = 60
        timeout     = 5
        retries     = 3
        startPeriod = 120
      }
      # Reduced memory/CPU for t2.micro
      memory = 350 # Hard limit
      cpu    = 196 # Soft limit
      # dependsOn = [{
      #   containerName = "datadog-agent"
      #   condition     = "START"
      # }]
    },
    # {
    #   name      = "datadog-agent"
    #   image     = "public.ecr.aws/datadog/agent:latest"
    #   essential = true
    #   environment = [
    #     {
    #       name  = "DD_API_KEY"
    #       value = var.datadog_api_key
    #     },
    #     {
    #       name  = "DD_SITE"
    #       value = "datadoghq.com"
    #     },
    #     {
    #       name  = "DD_ECS_COLLECT"
    #       value = "true"
    #     },
    #     {
    #       name  = "DD_APM_ENABLED"
    #       value = "true"
    #     },
    #     {
    #       name  = "DD_LOGS_ENABLED"
    #       value = "true"
    #     },
    #     {
    #       name  = "DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL"
    #       value = "true"
    #     },
    #     {
    #       name  = "DD_AC_EXCLUDE"
    #       value = "name:datadog-agent"
    #     },
    #     {
    #       name  = "DD_DOGSTATSD_NON_LOCAL_TRAFFIC"
    #       value = "true"
    #     },
    #     {
    #       name  = "DD_ENV"
    #       value = var.environment
    #     },
    #     {
    #       name  = "DD_PROCESS_AGENT_ENABLED"
    #       value = "true"
    #     },
    #     {
    #       name  = "DD_DOCKER_LABELS_AS_TAGS"
    #       value = "{\"com.amazonaws.ecs.task-definition-family\":\"task_family\",\"com.amazonaws.ecs.cluster\":\"cluster_name\"}"
    #     },
    #     {
    #       name  = "DD_CONTAINER_LABELS_AS_TAGS"
    #       value = "{\"com.amazonaws.ecs.task-definition-family\":\"task_family\",\"com.amazonaws.ecs.cluster\":\"cluster_name\"}"
    #     },
    #     {
    #       name  = "DD_TAGS"
    #       value = "env:${var.environment} service:${var.app_name}"
    #     }
    #   ]
    #   portMappings = [
    #     {
    #       containerPort = 8126
    #       hostPort      = 8126
    #       protocol      = "tcp"
    #     },
    #     {
    #       containerPort = 8125
    #       hostPort      = 8125
    #       protocol      = "udp"
    #     }
    #   ]
    #   memory = 256
    #   cpu    = 128
    #   logConfiguration = {
    #     logDriver = "awslogs"
    #     options = {
    #       "awslogs-group"         = aws_cloudwatch_log_group.auth_service.name
    #       "awslogs-region"        = var.aws_region
    #       "awslogs-stream-prefix" = "datadog-agent"
    #     }
    #   }
    # }
  ])

  tags = {
    Name        = "${var.app_name}-task-definition"
    Environment = var.environment
  }
}


# ECS Service - Modified for EC2 launch type
resource "aws_ecs_service" "auth_service" {
  name                 = var.app_name
  cluster              = aws_ecs_cluster.main.id
  task_definition      = aws_ecs_task_definition.auth_service.arn
  desired_count        = 1     # Reduced for Free Tier
  launch_type          = "EC2" # Changed from FARGATE to EC2
  force_new_deployment = true  # Add this line

  # No need for network_configuration with bridge mode

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = var.app_name
    container_port   = var.container_port
  }

  depends_on = [aws_lb_listener.http, aws_autoscaling_group.ecs]

  tags = {
    Name        = "${var.app_name}-ecs-service"
    Environment = var.environment
  }
}

# Data source for the current AWS account ID
data "aws_caller_identity" "current" {}

# Reference an existing key pair in AWS
data "aws_key_pair" "existing" {
  key_name = "ctse"
}

# Output the ALB DNS name
output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "The DNS name of the load balancer"
}

# Output the ECR repository URL
output "ecr_repository_url" {
  value       = aws_ecr_repository.auth_service.repository_url
  description = "The URL of the ECR repository"
}




# Create the API Gateway HTTP API
resource "aws_apigatewayv2_api" "auth_service_api" {
  name          = "${var.app_name}-api"
  protocol_type = "HTTP"
}

# Create a default stage
resource "aws_apigatewayv2_stage" "auth_service_stage" {
  api_id      = aws_apigatewayv2_api.auth_service_api.id
  name        = "$default"
  auto_deploy = true
}

# Create the integration to your public ALB using {proxy}
resource "aws_apigatewayv2_integration" "auth_service_integration" {
  api_id             = aws_apigatewayv2_api.auth_service_api.id
  integration_type   = "HTTP_PROXY"
  integration_method = "ANY"
  integration_uri    = "http://${aws_lb.main.dns_name}/{proxy}"
}

# Create the route with {proxy+}
resource "aws_apigatewayv2_route" "auth_service_route" {
  api_id    = aws_apigatewayv2_api.auth_service_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.auth_service_integration.id}"
}

# Output the API Gateway URL
output "api_gateway_url" {
  value       = aws_apigatewayv2_api.auth_service_api.api_endpoint
  description = "The HTTPS URL of the API Gateway"
}
