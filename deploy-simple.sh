#!/bin/bash

# Simple AWS Deployment Script
set -e

echo "🚀 Deploying GoodSeed App to AWS"
echo "================================"

# Configuration
PROJECT_NAME="goodseed"
AWS_REGION=$(aws configure get region)
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "   Project: $PROJECT_NAME"
echo "   Region: $AWS_REGION"
echo "   Account: $AWS_ACCOUNT_ID"
echo

# Step 1: Create ECR Repository
echo "📦 Creating ECR repository..."
aws ecr create-repository \
    --repository-name $PROJECT_NAME \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true \
    --image-tag-mutability MUTABLE 2>/dev/null || echo "Repository may already exist"

ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME"
echo "✅ ECR Repository: $ECR_URI"

# Step 2: Build and Push Docker Image
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

echo "✅ Docker image pushed successfully!"
echo
echo "Next steps:"
echo "1. Create ECS cluster and task definition manually in AWS Console"
echo "2. Or use AWS CDK/CloudFormation templates"
echo "3. Set up Application Load Balancer"
echo "4. Configure RDS PostgreSQL database"
echo
echo "🔗 ECR Repository URL: $ECR_URI:latest"