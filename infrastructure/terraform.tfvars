# GoodSeed App - MVP Production Deployment Configuration
# Generated on 2025-12-24

# Project Information
project_name = "goodseed"
environment  = "production"

# AWS Configuration
aws_region     = "us-east-1"

# Cost Optimization for MVP
enable_nat_gateway = false  # Save $32/month
enable_multi_az = false     # Save $18/month (Single AZ for MVP)
enable_performance_insights = false  # Save $7/month