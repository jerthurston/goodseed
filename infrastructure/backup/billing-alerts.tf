# Free Tier Billing Alerts & Auto-Stop Configuration

# SNS Topic for billing alerts
resource "aws_sns_topic" "billing_alerts" {
  name = "${var.project_name}-billing-alerts"
  
  tags = merge(var.tags, {
    Purpose = "billing-monitoring"
  })
}

# Email subscription for billing alerts
resource "aws_sns_topic_subscription" "billing_email" {
  topic_arn = aws_sns_topic.billing_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Billing Alarms (multiple thresholds)
resource "aws_cloudwatch_metric_alarm" "billing_warning" {
  alarm_name          = "${var.project_name}-billing-warning"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "86400"  # 24 hours
  statistic           = "Maximum"
  threshold           = var.billing_warning_threshold
  alarm_description   = "Warning: AWS billing exceeded $${var.billing_warning_threshold}"
  alarm_actions       = [aws_sns_topic.billing_alerts.arn]
  
  dimensions = {
    Currency = "USD"
  }
  
  tags = merge(var.tags, {
    AlertType = "warning"
    Threshold = var.billing_warning_threshold
  })
}

resource "aws_cloudwatch_metric_alarm" "billing_critical" {
  alarm_name          = "${var.project_name}-billing-critical"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "86400"
  statistic           = "Maximum"
  threshold           = var.billing_critical_threshold
  alarm_description   = "CRITICAL: AWS billing exceeded $${var.billing_critical_threshold}"
  alarm_actions       = [
    aws_sns_topic.billing_alerts.arn,
    aws_sns_topic.emergency_stop.arn
  ]
  
  dimensions = {
    Currency = "USD"
  }
  
  tags = merge(var.tags, {
    AlertType = "critical"
    Threshold = var.billing_critical_threshold
  })
}

resource "aws_cloudwatch_metric_alarm" "billing_emergency" {
  count = var.auto_stop_enabled ? 1 : 0
  
  alarm_name          = "${var.project_name}-billing-emergency-stop"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "86400"
  statistic           = "Maximum"
  threshold           = var.auto_stop_threshold
  alarm_description   = "EMERGENCY: Auto-stopping services due to billing exceeded $${var.auto_stop_threshold}"
  alarm_actions       = [
    aws_sns_topic.billing_alerts.arn,
    aws_sns_topic.emergency_stop.arn
  ]
  
  dimensions = {
    Currency = "USD"
  }
  
  tags = merge(var.tags, {
    AlertType = "emergency"
    Threshold = var.auto_stop_threshold
    Action    = "auto-stop"
  })
}

# Emergency stop SNS topic
resource "aws_sns_topic" "emergency_stop" {
  name = "${var.project_name}-emergency-stop"
  
  tags = merge(var.tags, {
    Purpose = "emergency-stop"
  })
}

# Lambda function for auto-stop functionality
resource "aws_lambda_function" "auto_stop" {
  count = var.auto_stop_enabled ? 1 : 0
  
  filename         = "auto-stop.zip"
  function_name    = "${var.project_name}-auto-stop"
  role            = aws_iam_role.lambda_auto_stop[0].arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.auto_stop_zip[0].output_base64sha256
  runtime         = "python3.9"
  timeout         = 60
  
  environment {
    variables = {
      ECS_CLUSTER = var.project_name
      RDS_INSTANCE = var.db_identifier
      SLACK_WEBHOOK = var.slack_webhook_url
    }
  }
  
  tags = merge(var.tags, {
    Purpose = "auto-stop"
  })
}

# Auto-stop Lambda source code
data "archive_file" "auto_stop_zip" {
  count = var.auto_stop_enabled ? 1 : 0
  
  type        = "zip"
  output_path = "auto-stop.zip"
  source {
    content = templatefile("${path.module}/scripts/auto-stop.py", {
      ecs_cluster = var.project_name
      rds_instance = var.db_identifier
    })
    filename = "index.py"
  }
}

# IAM role for Lambda auto-stop function
resource "aws_iam_role" "lambda_auto_stop" {
  count = var.auto_stop_enabled ? 1 : 0
  
  name = "${var.project_name}-lambda-auto-stop-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_auto_stop" {
  count = var.auto_stop_enabled ? 1 : 0
  
  name = "${var.project_name}-lambda-auto-stop-policy"
  role = aws_iam_role.lambda_auto_stop[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:ListServices"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "rds:StopDBInstance",
          "rds:DescribeDBInstances"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "elasticache:ModifyCacheCluster",
          "elasticache:DescribeCacheClusters"
        ]
        Resource = "*"
      }
    ]
  })
}

# SNS subscription to trigger Lambda
resource "aws_sns_topic_subscription" "lambda_auto_stop" {
  count = var.auto_stop_enabled ? 1 : 0
  
  topic_arn = aws_sns_topic.emergency_stop.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.auto_stop[0].arn
}

# Lambda permission for SNS
resource "aws_lambda_permission" "sns_invoke_lambda" {
  count = var.auto_stop_enabled ? 1 : 0
  
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auto_stop[0].function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.emergency_stop.arn
}

# Free Tier Usage Monitoring
resource "aws_cloudwatch_metric_alarm" "rds_free_tier_hours" {
  alarm_name          = "${var.project_name}-rds-free-tier-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "3600"  # 1 hour
  statistic           = "Average"
  threshold           = "0"      # Any usage
  alarm_description   = "Monitoring RDS free tier usage"
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.goodseed_free.id
  }
  
  tags = merge(var.tags, {
    Purpose = "free-tier-monitoring"
    Service = "RDS"
  })
}

# ECS Free Tier Monitoring
resource "aws_cloudwatch_metric_alarm" "ecs_free_tier_usage" {
  alarm_name          = "${var.project_name}-ecs-free-tier-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "3600"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "Monitoring ECS free tier usage"
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    ServiceName = aws_ecs_service.goodseed_web.name
    ClusterName = aws_ecs_cluster.goodseed_free.name
  }
  
  tags = merge(var.tags, {
    Purpose = "free-tier-monitoring"
    Service = "ECS"
  })
}

# Data Transfer Monitoring
resource "aws_cloudwatch_metric_alarm" "data_transfer_warning" {
  alarm_name          = "${var.project_name}-data-transfer-warning"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "NetworkOut"
  namespace           = "AWS/ApplicationELB"
  period              = "86400"
  statistic           = "Sum"
  threshold           = "10737418240"  # 10GB in bytes (leave 5GB buffer)
  alarm_description   = "Data transfer approaching free tier limit"
  alarm_actions       = [aws_sns_topic.billing_alerts.arn]
  
  dimensions = {
    LoadBalancer = aws_lb.goodseed_alb.arn_suffix
  }
  
  tags = merge(var.tags, {
    Purpose = "free-tier-monitoring"
    Service = "DataTransfer"
  })
}