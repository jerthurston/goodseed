# RDS PostgreSQL Database - MVP Cost Optimized

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  
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
  engine_version = "15.4"  # Stable version, not latest to avoid upgrade costs
  instance_class = var.db_instance_class
  
  # Storage configuration
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  
  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result
  
  # Network configuration
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  # High availability - disabled for MVP cost savings
  multi_az = var.enable_multi_az
  
  # Backup configuration - minimal for cost savings
  backup_retention_period = var.db_backup_retention
  backup_window          = "03:00-04:00"  # Off-peak hours
  maintenance_window     = "Sun:04:00-Sun:05:00"
  
  # Cost optimization settings
  performance_insights_enabled = var.enable_performance_insights
  monitoring_interval         = var.enable_advanced_monitoring ? 60 : 0
  
  # Deletion protection disabled for MVP (can be enabled later)
  deletion_protection = false
  skip_final_snapshot = true
  
  # Auto minor version upgrade disabled to avoid unexpected costs
  auto_minor_version_upgrade = false
  
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
    name  = "log_statement"
    value = "all"
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
  
  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

# RDS Parameter Group
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "${var.project_name}-db-params"
  
  parameter {
    name  = "log_statement"
    value = "all"
  }
  
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
  
  tags = {
    Name = "${var.project_name}-db-params"
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-db"
  
  # Engine
  engine         = "postgres"
  engine_version = "15.5"
  instance_class = var.db_instance_class
  
  # Storage
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  
  # Database
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  
  # Networking
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  
  # Backup
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Sun:04:00-Sun:05:00"
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn
  
  # Performance Insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  # Parameter Group
  parameter_group_name = aws_db_parameter_group.main.name
  
  # Deletion
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  deletion_protection = true
  
  tags = {
    Name = "${var.project_name}-db"
  }
  
  lifecycle {
    ignore_changes = [final_snapshot_identifier]
  }
}

# IAM Role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.project_name}-rds-monitoring-role"
  
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
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}