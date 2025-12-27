#!/bin/bash

# AWS Deployment Setup Guide for GoodSeed App
# This script will guide you through the AWS deployment process

set -e

echo "🚀 GoodSeed App - AWS Deployment Setup"
echo "======================================"
echo

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists aws; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    echo "📖 Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

if ! command_exists docker; then
    echo "❌ Docker not found. Please install Docker first."
    echo "📖 Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command_exists terraform && [ ! -f "./terraform.exe" ]; then
    echo "❌ Terraform not found. Please install Terraform first."
    echo "📖 Visit: https://developer.hashicorp.com/terraform/downloads"
    exit 1
fi

# Use local terraform if available
if [ -f "./terraform.exe" ]; then
    TERRAFORM_CMD="./terraform.exe"
else
    TERRAFORM_CMD="terraform"
fi

echo "✅ All prerequisites found"
echo

# AWS Credentials Setup
echo "🔑 AWS Credentials Setup"
echo "========================"
echo

echo "Before proceeding, you need to:"
echo "1. Create an AWS account (if you don't have one)"
echo "2. Create an IAM user with programmatic access"
echo "3. Attach the following policies to your IAM user:"
echo "   - AmazonECS_FullAccess"
echo "   - AmazonRDS_FullAccess"
echo "   - AmazonVPC_FullAccess"
echo "   - AmazonRoute53_FullAccess"
echo "   - AmazonEC2ContainerRegistryFullAccess"
echo "   - CloudWatchFullAccess"
echo "   - AmazonElastiCacheFullAccess"
echo "   - IAMFullAccess (for creating service roles)"
echo

echo "📝 Please run the following command to configure AWS credentials:"
echo "   aws configure"
echo
echo "You'll be prompted for:"
echo "   - AWS Access Key ID: (from your IAM user)"
echo "   - AWS Secret Access Key: (from your IAM user)"
echo "   - Default region: us-east-1 (recommended for free tier)"
echo "   - Default output format: json"
echo

read -p "Have you configured AWS credentials? (y/n): " AWS_CONFIGURED

if [[ $AWS_CONFIGURED != "y" ]]; then
    echo "Please configure AWS credentials first and run this script again."
    exit 1
fi

# Test AWS connection
echo "🧪 Testing AWS connection..."
if aws sts get-caller-identity >/dev/null 2>&1; then
    echo "✅ AWS credentials are working"
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region)
    echo "   Account ID: $AWS_ACCOUNT_ID"
    echo "   Region: $AWS_REGION"
else
    echo "❌ AWS credentials test failed"
    echo "Please check your credentials and try again."
    exit 1
fi

echo

# Project Configuration
echo "⚙️ Project Configuration"
echo "========================"
echo

PROJECT_NAME="goodseed"
ENVIRONMENT="production"

echo "Project settings:"
echo "   Name: $PROJECT_NAME"
echo "   Environment: $ENVIRONMENT"
echo "   AWS Account: $AWS_ACCOUNT_ID"
echo "   AWS Region: $AWS_REGION"
echo

# Create terraform.tfvars file
echo "📄 Creating terraform.tfvars file..."

cat > infrastructure/terraform.tfvars << EOF
# GoodSeed App - Production Deployment Configuration
# Generated on $(date)

# Project Information
project_name = "$PROJECT_NAME"
environment  = "$ENVIRONMENT"

# AWS Configuration
aws_region     = "$AWS_REGION"
aws_account_id = "$AWS_ACCOUNT_ID"

# Domain Configuration (update these with your domain)
domain_name = "yourdomain.com"  # Replace with your actual domain
subdomain   = "api"             # For API subdomain (api.yourdomain.com)

# Database Configuration
db_instance_class    = "db.t3.micro"    # Free tier eligible
db_allocated_storage = 20               # Free tier: up to 20GB
db_max_allocated_storage = 100
db_name              = "goodseed"
db_username          = "goodseed_user"
# Note: DB password will be auto-generated and stored in AWS Secrets Manager

# Cache Configuration
redis_node_type = "cache.t3.micro"      # Free tier eligible
redis_num_cache_nodes = 1

# ECS Configuration
ecs_cpu_web    = 512    # 0.5 vCPU for web tasks
ecs_memory_web = 1024   # 1GB RAM for web tasks
ecs_cpu_worker = 256    # 0.25 vCPU for worker tasks  
ecs_memory_worker = 512 # 0.5GB RAM for worker tasks

# Auto Scaling
ecs_min_capacity = 1
ecs_max_capacity = 3
ecs_desired_capacity = 1

# Monitoring
enable_detailed_monitoring = true
log_retention_in_days     = 7

# Cost Optimization
enable_nat_gateway = true  # Set to false for additional cost savings
single_az_deployment = false  # Set to true for free tier optimization

# Backup Configuration
backup_retention_period = 7
backup_window          = "03:00-04:00"
maintenance_window     = "sun:04:00-sun:05:00"

# Security
enable_deletion_protection = false  # Set to true for production safety
enable_encryption         = true

EOF

echo "✅ Created infrastructure/terraform.tfvars"
echo

# Create deployment script
echo "📄 Creating deployment script..."

cat > deploy.sh << 'EOF'
#!/bin/bash

# GoodSeed App Deployment Script
set -e

PROJECT_NAME="goodseed"
AWS_REGION=$(aws configure get region)
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🚀 Deploying GoodSeed App to AWS"
echo "================================"
echo "   Project: $PROJECT_NAME"
echo "   Region: $AWS_REGION"
echo "   Account: $AWS_ACCOUNT_ID"
echo

# Step 1: Initialize Terraform
echo "🔧 Initializing Terraform..."
cd infrastructure
$TERRAFORM_CMD init

# Step 2: Plan Infrastructure
echo "📋 Planning infrastructure changes..."
$TERRAFORM_CMD plan -var-file="terraform.tfvars"

echo
read -p "Do you want to proceed with infrastructure deployment? (y/n): " PROCEED
if [[ $PROCEED != "y" ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Step 3: Apply Infrastructure
echo "🏗️ Creating AWS infrastructure..."
$TERRAFORM_CMD apply -var-file="terraform.tfvars" -auto-approve

# Get ECR repository URL
ECR_URI=$($TERRAFORM_CMD output -raw ecr_repository_url)
echo "✅ ECR Repository: $ECR_URI"

cd ..

# Step 4: Build and Push Docker Image
echo "🐳 Building Docker image..."
docker build -t $PROJECT_NAME:latest .

echo "🔑 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

echo "🏷️ Tagging image..."
docker tag $PROJECT_NAME:latest $ECR_URI:latest
docker tag $PROJECT_NAME:latest $ECR_URI:$(date +%Y%m%d-%H%M%S)

echo "📤 Pushing image to ECR..."
docker push $ECR_URI:latest
docker push $ECR_URI:$(date +%Y%m%d-%H%M%S)

# Step 5: Deploy to ECS
echo "🚢 Deploying to ECS..."
aws ecs update-service \
    --cluster $PROJECT_NAME-cluster \
    --service $PROJECT_NAME-web \
    --force-new-deployment \
    --region $AWS_REGION

echo "✅ Deployment completed!"
echo
echo "📊 Deployment Information:"
echo "========================="

cd infrastructure
echo "   Load Balancer URL: http://$($TERRAFORM_CMD output -raw alb_dns_name)"
echo "   ECR Repository: $ECR_URI"
echo "   ECS Cluster: $PROJECT_NAME-cluster"
echo "   RDS Endpoint: $($TERRAFORM_CMD output -raw rds_endpoint)"
echo

echo "🔍 Monitor your deployment:"
echo "   ECS Service: aws ecs describe-services --cluster $PROJECT_NAME-cluster --services $PROJECT_NAME-web"
echo "   CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/"
echo
echo "⚠️ Important: Update your domain's DNS to point to the Load Balancer URL above"

EOF

chmod +x deploy.sh

echo "✅ Created deploy.sh script"
echo

# Create environment variables template
echo "📄 Creating environment template..."

cat > .env.production.example << EOF
# GoodSeed App - Production Environment Variables
# Copy this to .env.production and fill in the values

# Database (will be auto-populated after Terraform deployment)
DATABASE_URL="postgresql://username:password@host:5432/dbname"

# Redis (will be auto-populated after Terraform deployment)  
REDIS_URL="redis://host:6379"

# Application
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1

# API Keys (fill these in)
SENTRY_DSN="your-sentry-dsn"
SENTRY_ORG="your-org"
SENTRY_PROJECT="goodseed-app"

# Authentication (generate secure random strings)
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="https://yourdomain.com"

# External APIs (if any)
# Add your external API keys here

EOF

echo "✅ Created .env.production.example"
echo

echo "🎉 Setup Complete!"
echo "=================="
echo
echo "Next steps:"
echo "1. Review and update infrastructure/terraform.tfvars with your domain"
echo "2. Copy .env.production.example to .env.production and fill in values"
echo "3. Run ./deploy.sh to start deployment"
echo
echo "💰 Estimated monthly cost: $77-120 (with free tier optimizations)"
echo "📚 Check docs/deployment/ for detailed guides"
echo
echo "⚠️ Remember to:"
echo "   - Replace 'yourdomain.com' with your actual domain"
echo "   - Set up domain DNS records after deployment"
echo "   - Monitor costs using AWS Cost Explorer"
