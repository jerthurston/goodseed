# Variables for AWS Infrastructure

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "goodseed"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# MVP Cost Optimization Variables
variable "enable_nat_gateway" {
  description = "Enable NAT Gateway (costs $32/month)"
  type        = bool
  default     = false
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = false
}

variable "enable_performance_insights" {
  description = "Enable RDS Performance Insights"
  type        = bool
  default     = false
}

variable "enable_advanced_monitoring" {
  description = "Enable advanced CloudWatch monitoring"
  type        = bool
  default     = false
}

variable "container_subnet_type" {
  description = "Subnet type for containers (public/private)"
  type        = string
  default     = "public"
  validation {
    condition = contains(["public", "private"], var.container_subnet_type)
    error_message = "Container subnet type must be either 'public' or 'private'."
  }
}

variable "cloudwatch_log_retention" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

# Database variables
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "goodseed"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "goodseed_admin"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Redis variables
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

# ECS variables
variable "app_image" {
  description = "Application Docker image"
  type        = string
}

variable "app_count" {
  description = "Number of app instances"
  type        = number
  default     = 2
}

variable "app_port" {
  description = "Application port"
  type        = number
  default     = 3000
}

variable "worker_count" {
  description = "Number of worker instances"
  type        = number
  default     = 1
}

# Domain
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

# Common tags for all resources
variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {
    Project     = "GoodSeed"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

# Infrastructure sizing
variable "az_count" {
  description = "Number of Availability Zones to use"
  type        = number
  default     = 2
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}