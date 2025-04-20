# Datadog integration with AWS
terraform {
  required_providers {
    datadog = {
      source  = "datadog/datadog"
      version = "~> 3.36.0"  # Use the latest version, you can check the current version on Terraform Registry
    }
  }
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
}

# Create SSM Parameter for Datadog API Key
resource "aws_ssm_parameter" "datadog_api_key" {
  name        = "/${var.app_name}/DATADOG_API_KEY"
  description = "Datadog API Key"
  type        = "SecureString"
  value       = var.datadog_api_key

  tags = {
    Name        = "${var.app_name}-datadog-api-key"
    Environment = var.environment
  }
}

# Create SSM Parameter for Datadog APP Key
resource "aws_ssm_parameter" "datadog_app_key" {
  name        = "/${var.app_name}/DATADOG_APP_KEY"
  description = "Datadog APP Key"
  type        = "SecureString"
  value       = var.datadog_app_key

  tags = {
    Name        = "${var.app_name}-datadog-app-key"
    Environment = var.environment
  }
}

# Add permissions for ECS tasks to access Datadog parameters
resource "aws_iam_policy" "datadog_access" {
  name        = "${var.app_name}-datadog-access"
  description = "Allow access to Datadog parameters"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Effect = "Allow"
        Resource = [
          aws_ssm_parameter.datadog_api_key.arn,
          aws_ssm_parameter.datadog_app_key.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "task_datadog_access" {
  role       = aws_iam_role.auth_service_task_role.name
  policy_arn = aws_iam_policy.datadog_access.arn
}

resource "aws_iam_role_policy_attachment" "execution_datadog_access" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = aws_iam_policy.datadog_access.arn
}

# Datadog ECS integration
resource "datadog_integration_aws" "main" {
  account_id                       = data.aws_caller_identity.current.account_id
  role_name                        = "DatadogAWSIntegrationRole"
  metrics_collection_enabled       = true
  resource_collection_enabled      = true
  account_specific_namespace_rules = {
    ecs     = true
    ec2     = true
    lambda  = false
    s3      = false
    rds     = false
    elb     = true
  }
}

# Datadog monitors
resource "datadog_monitor" "service_health" {
  name               = "Auth Service Health Check"
  type               = "service check"
  message            = "Auth Service health check is failing. Notify: @devops-team"
  escalation_message = "Auth Service is still down! Please investigate immediately!"

  query = "\"http.can_connect\".over(\"instance:auth-service-health-check\").by(\"host\").last(2).count_by_status()"

  monitor_thresholds {
    warning  = 1
    critical = 2
  }

  notify_no_data    = true
  no_data_timeframe = 10
  
  tags = ["service:auth-service", "env:${var.environment}"]
}

resource "datadog_monitor" "high_error_rate" {
  name               = "Auth Service High Error Rate"
  type               = "metric alert"
  message            = "Auth Service has a high error rate. Notify: @devops-team"
  
  query = "sum(last_5m):sum:aws.applicationelb.httpcode_target_5xx{service:auth-service} / sum:aws.applicationelb.request_count{service:auth-service} * 100 > 5"
  
  monitor_thresholds {
    warning  = 3
    critical = 5
  }
  
  tags = ["service:auth-service", "env:${var.environment}"]
}

# Create a Datadog dashboard
resource "datadog_dashboard" "auth_service" {
  title        = "Auth Service Dashboard"
  description  = "Dashboard for the Auth Service microservice"
  layout_type  = "ordered"
  
  widget {
    alert_graph_definition {
      alert_id = datadog_monitor.service_health.id
      title    = "Auth Service Health"
      viz_type = "timeseries"
    }
  }
  
  widget {
    alert_graph_definition {
      alert_id = datadog_monitor.high_error_rate.id
      title    = "Error Rate"
      viz_type = "timeseries"
    }
  }
  
  widget {
    timeseries_definition {
      title = "API Request Count"
      request {
        q = "sum:aws.applicationelb.request_count{service:auth-service}.as_count()"
        display_type = "line"
      }
      yaxis {
        scale = "linear"
        min = "0"
      }
    }
  }
  
  widget {
    timeseries_definition {
      title = "API Response Time"
      request {
        q = "avg:aws.applicationelb.target_response_time.average{service:auth-service} * 1000"
        display_type = "line"
      }
      yaxis {
        scale = "linear"
        min = "0"
        label = "ms"
      }
    }
  }
  
  widget {
    timeseries_definition {
      title = "CPU and Memory Usage"
      request {
        q = "avg:aws.ecs.service.cpu_utilization{service:auth-service}"
        display_type = "line"
      }
      request {
        q = "avg:aws.ecs.service.memory_utilization{service:auth-service}"
        display_type = "line"
      }
      yaxis {
        scale = "linear"
        min = "0"
        max = "100"
        label = "%"
      }
    }
  }
}