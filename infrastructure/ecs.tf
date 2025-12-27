# ECS Cluster and Services - MVP Cost Optimized

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
  
  # Disable container insights to save costs for MVP
  setting {
    name  = "containerInsights"
    value = var.enable_advanced_monitoring ? "enabled" : "disabled"
  }
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-cluster"
  })
}

# ECS Cluster Capacity Providers - Use Spot for additional cost savings
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name
  
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
  
  # Default to regular Fargate, but allow Spot for worker tasks
  default_capacity_provider_strategy {
    base              = 1
    weight            = 80
    capacity_provider = "FARGATE"
  }
  
  default_capacity_provider_strategy {
    base              = 0
    weight            = 20  
    capacity_provider = "FARGATE_SPOT"
  }
}

# ECR Repository
resource "aws_ecr_repository" "app" {
  name                 = var.project_name
  image_tag_mutability = "MUTABLE"
  
  # Basic scanning only to reduce costs
  image_scanning_configuration {
    scan_on_push = false
  }
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ecr"
  })
}

# ECR Lifecycle Policy to manage storage costs
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 production images"
        selection = {
          tagStatus = "tagged"
          tagPrefixList = ["prod", "mvp"]
          countType = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 3 dev images"
        selection = {
          tagStatus = "tagged"
          tagPrefixList = ["dev", "test"]
          countType = "imageCountMoreThan"
          countNumber = 3
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus = "untagged"
          countType = "sinceImagePushed"
          countUnit = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# CloudWatch Log Group for ECS
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = var.cloudwatch_log_retention
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ecs-logs"
  })
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${var.project_name}-ecs-tasks-"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    description     = "HTTP from ALB"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.project_name}-ecs-tasks-sg"
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-task-execution-role"
  
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
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for ECS Tasks
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task-role"
  
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
}

# IAM Policy for ECS Tasks (CloudWatch, Parameter Store, etc.)
resource "aws_iam_role_policy" "ecs_task" {
  name = "${var.project_name}-ecs-task-policy"
  role = aws_iam_role.ecs_task.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          aws_cloudwatch_log_group.ecs_app.arn,
          aws_cloudwatch_log_group.ecs_worker.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "ecs_app" {
  name              = "/ecs/${var.project_name}/app"
  retention_in_days = 30
  
  tags = {
    Name = "${var.project_name}-app-logs"
  }
}

resource "aws_cloudwatch_log_group" "ecs_worker" {
  name              = "/ecs/${var.project_name}/worker"
  retention_in_days = 30
  
  tags = {
    Name = "${var.project_name}-worker-logs"
  }
}

# Security Group for ALB
resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-alb-"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
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
    Name = "${var.project_name}-alb-sg"
  })
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
  
  enable_deletion_protection = false
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-alb"
  })
}

# ALB Target Group
resource "aws_lb_target_group" "app" {
  name        = "${var.project_name}-tg"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-tg"
  })
}

# ALB Listener - HTTP (redirect to HTTPS if custom domain enabled)
resource "aws_lb_listener" "web" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type = var.enable_custom_domain ? "redirect" : "forward"
    
    # Redirect to HTTPS if custom domain is enabled
    dynamic "redirect" {
      for_each = var.enable_custom_domain ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
    
    # Forward to target group if no custom domain
    target_group_arn = var.enable_custom_domain ? null : aws_lb_target_group.app.arn
  }
}

# ALB HTTPS Listener (only if custom domain is enabled)
resource "aws_lb_listener" "web_https" {
  count = var.enable_custom_domain && var.domain_name != "" ? 1 : 0
  
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate_validation.main[0].certificate_arn
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}