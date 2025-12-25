# RDS PostgreSQL Database - MVP Cost Optimized

# DB Subnet Group - Using public subnets for migration access
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.public[*].id
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-db-subnet-group"
  })
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    description     = "PostgreSQL from ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
  
  # Temporary: Allow external access for migration
  ingress {
    description = "PostgreSQL from Internet (TEMPORARY)"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-rds-sg"
  })
}

# RDS PostgreSQL Instance - MVP Configuration
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-db"
  
  # Cost-optimized engine settings
  engine         = "postgres"
  engine_version = "15.7"
  instance_class = var.db_instance_class
  
  # Storage configuration
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  
  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  
  # Network settings
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = true  # Temporarily enable for migration
  
  # Backup settings
  backup_retention_period = 0  # Free tier restriction: no backups
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  auto_minor_version_upgrade = true
  
  # Performance settings (conditionally enabled to save costs)
  monitoring_interval = var.enable_advanced_monitoring ? 60 : 0
  monitoring_role_arn = var.enable_advanced_monitoring ? aws_iam_role.rds_enhanced_monitoring[0].arn : null
  
  performance_insights_enabled = var.enable_performance_insights
  
  # High availability (conditionally enabled)
  multi_az = var.enable_multi_az
  
  # Deletion protection
  skip_final_snapshot = true
  deletion_protection = false
  
  # Parameter group
  parameter_group_name = aws_db_parameter_group.main.name
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-database"
  })
}

# Parameter Group for PostgreSQL optimization
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "${var.project_name}-postgres15"
  
  # Basic optimizations for small instance
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
  
  parameter {
    name         = "log_statement"
    value        = "all"
    apply_method = "pending-reboot"
  }
  
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-db-params"
  })
}

# IAM Role for RDS Enhanced Monitoring (conditionally created)
resource "aws_iam_role" "rds_enhanced_monitoring" {
  count = var.enable_advanced_monitoring ? 1 : 0
  name  = "${var.project_name}-rds-monitoring-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-rds-monitoring-role"
  })
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  count      = var.enable_advanced_monitoring ? 1 : 0
  role       = aws_iam_role.rds_enhanced_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
