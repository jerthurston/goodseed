# Main Terraform Configuration for GoodSeed App
# This file contains only provider configuration, data sources, and outputs
# Resources are organized in separate files: vpc.tf, ecs.tf, rds.tf

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration for local state (MVP)
  # Uncomment for S3 backend in production
  # backend "s3" {
  #   bucket = "goodseed-terraform-state"
  #   key    = "production/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "GoodSeed"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# No need for AZ data source - use hardcoded AZ for free tier
# data "aws_availability_zones" "available" {
#   state = "available"  
# }

# Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "alb_dns_name" {
  description = "DNS name of the application load balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Hosted zone ID of the application load balancer"
  value       = aws_lb.main.zone_id
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

# Database connection string output
output "database_url" {
  description = "Complete database connection URL"
  value = format(
    "postgresql://%s:%s@%s:%d/%s?sslmode=disable",
    aws_db_instance.main.username,
    aws_db_instance.main.password,
    aws_db_instance.main.endpoint,
    aws_db_instance.main.port,
    aws_db_instance.main.db_name
  )
  sensitive = true
}
