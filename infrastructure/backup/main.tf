# AWS Infrastructure for GoodSeed App
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  # Backend configuration for local state (MVP)
  # backend "s3" {
  #   bucket = "goodseed-terraform-state"
  #   key    = "production/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

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