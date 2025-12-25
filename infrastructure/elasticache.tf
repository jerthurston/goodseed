# ElastiCache Redis for Queue Management
# Free tier eligible: cache.t3.micro with 1 node

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-redis-subnet-group"
  })
}

# Security Group for ElastiCache
resource "aws_security_group" "elasticache" {
  name_prefix = "${var.project_name}-elasticache-"
  vpc_id      = aws_vpc.main.id

  # Redis port from ECS tasks
  ingress {
    description     = "Redis from ECS"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  # All outbound traffic allowed
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-elasticache-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ElastiCache Parameter Group for Redis 7.x
resource "aws_elasticache_parameter_group" "redis" {
  family = "redis7"
  name   = "${var.project_name}-redis-params"

  # Optimize for free tier
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-redis-params"
  })
}

# ElastiCache Redis Cluster
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${var.project_name}-redis"
  description                = "Redis cluster for ${var.project_name}"
  
  # Free tier configuration
  node_type                  = "cache.t3.micro"  # Free tier eligible
  num_cache_clusters         = 1                 # Single node for free tier
  port                       = 6379
  
  # Engine settings
  engine_version             = "7.0"
  parameter_group_name       = aws_elasticache_parameter_group.redis.name
  
  # Network settings
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.elasticache.id]
  
  # Backup settings (free tier limitations)
  snapshot_retention_limit   = 0                 # No snapshots in free tier
  snapshot_window            = "03:00-05:00"
  maintenance_window         = "sun:05:00-sun:07:00"
  
  # Security settings
  at_rest_encryption_enabled = false             # Not supported in free tier
  transit_encryption_enabled = false             # Not supported in free tier
  auth_token                 = null              # No auth token
  
  # Auto failover disabled for single node
  automatic_failover_enabled = false
  multi_az_enabled           = false
  
  # Log delivery configuration
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.elasticache_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-redis-cluster"
  })

  depends_on = [
    aws_elasticache_subnet_group.main,
    aws_security_group.elasticache
  ]
}

# CloudWatch Log Group for ElastiCache
resource "aws_cloudwatch_log_group" "elasticache_slow" {
  name              = "/elasticache/${var.project_name}/slow-log"
  retention_in_days = 7

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-elasticache-slow-logs"
  })
}

# Outputs
output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.redis.configuration_endpoint_address != "" ? aws_elasticache_replication_group.redis.configuration_endpoint_address : aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.redis.port
}