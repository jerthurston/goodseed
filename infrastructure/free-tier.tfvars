# AWS Free Tier Optimized Configuration
# Target: $20-40/month with maximum free tier utilization

# Basic Settings
aws_region   = "us-east-1"  # Best free tier coverage
environment  = "free-tier"
project_name = "goodseed-free"

# Contact Information - UPDATE THESE!
domain_name = "lembooking.com"         # Your Cloudflare domain
alert_email = "admin@lembooking.com"   # Update with your email

# Domain Configuration
enable_custom_domain = true

# VPC Configuration - Free tier eligible
vpc_cidr = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]  # 2 AZ required for ALB and RDS
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]

# Cost Optimization - NO NAT Gateway (free tier friendly)
enable_nat_gateway = false  # No additional networking costs

# Database Configuration - FREE TIER ELIGIBLE
db_identifier       = "goodseed-free"
db_instance_class   = "db.t3.micro"    # 750 hours/month FREE
db_allocated_storage = 20              # 20GB FREE
db_max_allocated_storage = 20          # Keep within free tier
db_multi_az         = false            # Single AZ for free tier
db_backup_retention = 7                # Backup included in free tier
db_name             = "goodseed_free"
db_username         = "goodseed_user"

# ElastiCache Configuration - MINIMAL (not free, but cheapest)
redis_node_type       = "cache.t2.micro"  # Cheapest option
redis_num_cache_nodes = 1

# ECS Configuration - FREE TIER ELIGIBLE
# Fargate: 20GB storage + 5GB memory per month FREE
ecs_web_cpu         = 256   # 0.25 vCPU (within free tier)
ecs_web_memory      = 512   # 0.5GB RAM (within free tier)
ecs_web_min_capacity = 1
ecs_web_max_capacity = 2    # Conservative scaling

ecs_worker_cpu         = 256   # 0.25 vCPU
ecs_worker_memory      = 512   # 0.5GB RAM
ecs_worker_min_capacity = 0    # Can scale to zero
ecs_worker_max_capacity = 1

# Monitoring Configuration - FREE TIER ELIGIBLE
log_retention_days = 1        # Minimal retention (free tier: 5GB)
enable_detailed_monitoring = false

# CloudWatch Free Tier Limits:
# - 10 custom metrics
# - 10 alarms
# - 5GB log ingestion
cloudwatch_alarms_limit = 10
cloudwatch_metrics_limit = 10

# Free Tier Resource Limits
free_tier_limits = {
  # ECS Fargate Free Tier (first 3 months for new accounts)
  fargate_cpu_hours_monthly    = 62.5   # 20GB-Hours CPU
  fargate_memory_hours_monthly = 125     # 40GB-Hours Memory
  
  # RDS Free Tier (12 months for new accounts)
  rds_hours_monthly = 750              # 750 hours of t2.micro/t3.micro
  rds_storage_gb    = 20               # 20GB SSD storage
  rds_backup_gb     = 20               # 20GB backup storage
  
  # CloudWatch Free Tier (always free)
  cloudwatch_metrics     = 10          # 10 custom metrics
  cloudwatch_alarms      = 10          # 10 alarms
  cloudwatch_logs_gb     = 5           # 5GB log ingestion
  
  # Data Transfer Free Tier
  data_transfer_out_gb = 15            # 15GB/month outbound
  
  # ALB Free Tier (first year)
  alb_hours_monthly = 750              # 750 hours
  alb_lcus_monthly  = 15               # 15 LCUs (Load Balancer Capacity Units)
}

# Billing Alert Configuration
billing_alerts = {
  # Multiple alert thresholds
  warning_threshold = 10    # $10 warning
  critical_threshold = 25   # $25 critical
  emergency_threshold = 40  # $40 emergency stop
}

# Auto-stop configuration
auto_stop_enabled = true
auto_stop_threshold = 50  # $50 absolute limit

# Cost optimization tags
tags = {
  Environment     = "free-tier"
  Project        = "goodseed"
  CostCenter     = "startup"
  Owner          = "goodseed-team"
  Terraform      = "true"
  FreeTier       = "optimized"
  BillingAlerts  = "enabled"
  AutoStop       = "enabled"
}