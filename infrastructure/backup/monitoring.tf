# EventBridge for Cron Jobs

# EventBridge Rule for Daily Scraping
resource "aws_cloudwatch_event_rule" "daily_scrape" {
  name                = "${var.project_name}-daily-scrape"
  description         = "Trigger daily scraping job"
  schedule_expression = "cron(0 6 * * ? *)"  # Daily at 6 AM UTC
  
  tags = {
    Name = "${var.project_name}-daily-scrape"
  }
}

# EventBridge Rule for Hourly Health Check
resource "aws_cloudwatch_event_rule" "health_check" {
  name                = "${var.project_name}-health-check"
  description         = "Trigger hourly health check"
  schedule_expression = "cron(0 * * * ? *)"  # Every hour
  
  tags = {
    Name = "${var.project_name}-health-check"
  }
}

# IAM Role for EventBridge
resource "aws_iam_role" "eventbridge" {
  name = "${var.project_name}-eventbridge-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for EventBridge to invoke HTTP endpoints
resource "aws_iam_role_policy" "eventbridge" {
  name = "${var.project_name}-eventbridge-policy"
  role = aws_iam_role.eventbridge.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:RunTask",
          "iam:PassRole"
        ]
        Resource = "*"
      }
    ]
  })
}

# EventBridge Target for Daily Scraping (HTTP Target)
resource "aws_cloudwatch_event_target" "daily_scrape" {
  rule      = aws_cloudwatch_event_rule.daily_scrape.name
  target_id = "DailyScrapeTarget"
  arn       = aws_lb.main.arn
  
  http_target {
    path_parameter_values = {}
    query_string_parameters = {}
    header_parameters = {
      "Authorization" = "Bearer ${var.cron_secret}"
    }
  }
  
  depends_on = [aws_iam_role_policy.eventbridge]
}

# EventBridge Target for Health Check
resource "aws_cloudwatch_event_target" "health_check" {
  rule      = aws_cloudwatch_event_rule.health_check.name
  target_id = "HealthCheckTarget"
  arn       = aws_lb.main.arn
  
  http_target {
    path_parameter_values = {}
    query_string_parameters = {}
    header_parameters = {
      "Authorization" = "Bearer ${var.cron_secret}"
    }
  }
  
  depends_on = [aws_iam_role_policy.eventbridge]
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.project_name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS CPU utilization"
  
  dimensions = {
    ServiceName = "${var.project_name}-service"
    ClusterName = aws_ecs_cluster.main.name
  }
  
  alarm_actions = [aws_sns_topic.alerts.arn]
  
  tags = {
    Name = "${var.project_name}-high-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_memory" {
  alarm_name          = "${var.project_name}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS memory utilization"
  
  dimensions = {
    ServiceName = "${var.project_name}-service"
    ClusterName = aws_ecs_cluster.main.name
  }
  
  alarm_actions = [aws_sns_topic.alerts.arn]
  
  tags = {
    Name = "${var.project_name}-high-memory-alarm"
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts"
  
  tags = {
    Name = "${var.project_name}-alerts"
  }
}

# CloudWatch Log Groups for Application Monitoring
resource "aws_cloudwatch_log_group" "bull_jobs" {
  name              = "/aws/ecs/${var.project_name}/bull-jobs"
  retention_in_days = 14
  
  tags = {
    Name = "${var.project_name}-bull-jobs"
  }
}

resource "aws_cloudwatch_log_group" "scraper_activity" {
  name              = "/aws/ecs/${var.project_name}/scraper"
  retention_in_days = 30
  
  tags = {
    Name = "${var.project_name}-scraper"
  }
}

# Custom CloudWatch Metrics for Bull Queue
resource "aws_cloudwatch_log_metric_filter" "bull_job_completed" {
  name           = "${var.project_name}-bull-job-completed"
  log_group_name = aws_cloudwatch_log_group.ecs_app.name
  pattern        = "[timestamp, level=\"INFO\", message=\"[Scraper Queue] Job * completed\"]"

  metric_transformation {
    name      = "BullJobsCompleted"
    namespace = "${var.project_name}/Bull"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "bull_job_failed" {
  name           = "${var.project_name}-bull-job-failed"
  log_group_name = aws_cloudwatch_log_group.ecs_app.name
  pattern        = "[timestamp, level=\"ERROR\", message=\"[ERROR WORKER] Job * failed\"]"

  metric_transformation {
    name      = "BullJobsFailed"
    namespace = "${var.project_name}/Bull"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "auto_scraper_scheduled" {
  name           = "${var.project_name}-auto-scraper-scheduled"
  log_group_name = aws_cloudwatch_log_group.ecs_app.name
  pattern        = "[timestamp, level=\"INFO\", message=\"[Auto Scraper Helper] Scheduled auto scrape job\"]"

  metric_transformation {
    name      = "AutoScraperJobsScheduled"
    namespace = "${var.project_name}/AutoScraper"
    value     = "1"
  }
}

# Bull Queue Monitoring Alarms
resource "aws_cloudwatch_metric_alarm" "high_job_failure_rate" {
  alarm_name          = "${var.project_name}-high-job-failure-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "BullJobsFailed"
  namespace           = "${var.project_name}/Bull"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "High number of Bull job failures"
  treat_missing_data  = "notBreaching"
  
  alarm_actions = [aws_sns_topic.alerts.arn]
  
  tags = {
    Name = "${var.project_name}-high-job-failure"
  }
}

resource "aws_cloudwatch_metric_alarm" "no_jobs_completed" {
  alarm_name          = "${var.project_name}-no-jobs-completed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "BullJobsCompleted"
  namespace           = "${var.project_name}/Bull"
  period              = "1800"  # 30 minutes
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "No Bull jobs completed in 30 minutes"
  treat_missing_data  = "breaching"
  
  alarm_actions = [aws_sns_topic.alerts.arn]
  
  tags = {
    Name = "${var.project_name}-no-jobs-completed"
  }
}

# CloudWatch Dashboard for Bull Queue Monitoring
resource "aws_cloudwatch_dashboard" "bull_monitoring" {
  dashboard_name = "${var.project_name}-bull-monitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["${var.project_name}/Bull", "BullJobsCompleted"],
            [".", "BullJobsFailed"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Bull Job Status"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["${var.project_name}/AutoScraper", "AutoScraperJobsScheduled"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Auto Scraper Jobs Scheduled"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 24
        height = 6

        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", "${var.project_name}-service", "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ECS Service Performance"
          period  = 300
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 12
        width  = 24
        height = 6

        properties = {
          query   = "SOURCE '/aws/ecs/${var.project_name}/app' | fields @timestamp, @message | filter @message like /Bull/ | sort @timestamp desc | limit 100"
          region  = var.aws_region
          title   = "Recent Bull Job Logs"
        }
      }
    ]
  })
}

# Add cron_secret variable
variable "cron_secret" {
  description = "Secret for cron authentication"
  type        = string
  sensitive   = true
}