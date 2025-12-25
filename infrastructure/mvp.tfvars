# MVP Cost-Optimized Configuration
# Target: $77/month production-ready deployment

# Basic Settings
aws_region   = "us-east-1"
environment  = "mvp"
project_name = "goodseed-mvp"

# Contact Information - UPDATE THESE!
domain_name = "yourdomain.com"         # Update with your domain
alert_email = "admin@yourdomain.com"   # Update with your email

# VPC Configuration - Hybrid public/private for cost optimization
vpc_cidr = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]

# Cost Optimization - NO NAT Gateway
enable_nat_gateway = false  # MAJOR cost saving: $32/month

# Database Configuration - Cost optimized
db_identifier       = "goodseed-mvp"
db_instance_class   = "db.t3.micro"
db_allocated_storage = 20
db_max_allocated_storage = 100
db_multi_az         = false  # Single AZ to save costs
db_backup_retention = 7
db_name             = "goodseed_mvp"
db_username         = "goodseed_user"

# ElastiCache Configuration - Minimal
redis_node_type       = "cache.t3.micro"
redis_num_cache_nodes = 1

# ECS Configuration - Right-sized for startup
ecs_web_cpu         = 512   # 0.5 vCPU
ecs_web_memory      = 1024  # 1GB RAM
ecs_web_min_capacity = 1
ecs_web_max_capacity = 3

ecs_worker_cpu         = 256   # 0.25 vCPU  
ecs_worker_memory      = 512   # 0.5GB RAM
ecs_worker_min_capacity = 1
ecs_worker_max_capacity = 2

# Monitoring Configuration - Essential only
log_retention_days = 7        # Short retention for cost savings
enable_detailed_monitoring = false
ecs_web_desired_count = 1

ecs_worker_cpu         = 256   # 0.25 vCPU  
ecs_worker_memory      = 512   # 0.5GB RAM
ecs_worker_min_capacity = 1
ecs_worker_max_capacity = 2
ecs_worker_desired_count = 1

# Cost Optimization Flags
enable_nat_gateway           = false  # Save $32/month
enable_performance_insights  = false  # Save $7/month
enable_multi_az             = false  # Save $13/month
enable_advanced_monitoring   = false  # Save $15/month

# Container subnet configuration
# Use public subnets for containers to avoid NAT costs
container_subnet_type = "public"

# Domain Configuration
domain_name = "yourdomain.com"
create_route53_zone = true

# Monitoring Configuration - Basic only
cloudwatch_log_retention = 7  # days
enable_detailed_monitoring = false

# Tags
common_tags = {
  Environment = "mvp"
  Project     = "goodseed"
  CostCenter  = "startup"
  ManagedBy   = "terraform"
  Purpose     = "mvp-cost-optimized"
}