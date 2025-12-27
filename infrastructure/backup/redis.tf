# ElastiCache Redis

# Subnet Group for ElastiCache
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-cache-subnet"
  subnet_ids = aws_subnet.private[*].id
  
  tags = {
    Name = "${var.project_name}-cache-subnet"
  }
}

# Security Group for ElastiCache
resource "aws_security_group" "redis" {
  name_prefix = "${var.project_name}-redis-"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    description     = "Redis from ECS"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.project_name}-redis-sg"
  }
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  family = "redis7.x"
  name   = "${var.project_name}-redis-params"
  
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  
  tags = {
    Name = "${var.project_name}-redis-params"
  }
}

# ElastiCache Replication Group (Redis Cluster)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id         = "${var.project_name}-redis"
  description                  = "Redis cluster for ${var.project_name}"
  
  # Engine
  engine               = "redis"
  engine_version       = "7.0"
  node_type           = var.redis_node_type
  port                = 6379
  
  # Cluster configuration
  num_cache_clusters = 2
  
  # Parameter group
  parameter_group_name = aws_elasticache_parameter_group.main.name
  
  # Networking
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled         = false
  
  # Backup
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
  
  # Maintenance
  maintenance_window = "Sun:05:00-Sun:07:00"
  
  # Automatic failover
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format      = "text"
    log_type        = "slow-log"
  }
  
  tags = {
    Name = "${var.project_name}-redis"
  }
}

# CloudWatch Log Group for Redis
resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/${var.project_name}/redis/slow-log"
  retention_in_days = 7
  
  tags = {
    Name = "${var.project_name}-redis-logs"
  }
}