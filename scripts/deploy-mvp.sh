#!/bin/bash
set -e

# GoodSeed MVP Deployment Script
# Cost-optimized deployment for $77/month target

echo "🚀 Starting GoodSeed MVP Deployment..."

# Configuration
ENVIRONMENT="mvp"
AWS_REGION=${AWS_REGION:-us-east-1}
ECR_REPOSITORY_NAME="goodseed-mvp"
ECS_CLUSTER_NAME="goodseed-mvp"
ECS_SERVICE_NAME="goodseed-web"
TERRAFORM_DIR="infrastructure"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if AWS CLI is installed and configured
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install it first."
    fi
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install it first."
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker first."
    fi
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        error "Terraform is not installed. Please install it first."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials are not configured. Please run 'aws configure' first."
    fi
    
    log "Prerequisites check completed successfully"
}

# Deploy infrastructure
deploy_infrastructure() {
    log "Deploying infrastructure with Terraform..."
    
    cd infrastructure
    
    # Initialize Terraform
    terraform init
    
    # Create workspace for MVP if it doesn't exist
    if ! terraform workspace list | grep -q "mvp"; then
        terraform workspace new mvp
    fi
    
    # Select MVP workspace
    terraform workspace select mvp
    
    # Plan deployment
    info "Planning infrastructure deployment..."
    terraform plan -var-file="mvp.tfvars" -out=mvp.tfplan
    
    # Apply deployment
    info "Applying infrastructure deployment..."
    terraform apply mvp.tfplan
    
    # Get ECR repository URL
    ECR_REPOSITORY=$(terraform output -raw ecr_repository_url)
    
    cd ..
    
    log "Infrastructure deployed successfully"
    info "ECR Repository: $ECR_REPOSITORY"
}

# Build and push Docker image
build_and_push_image() {
    log "Building and pushing Docker image..."
    
    if [ -z "$ECR_REPOSITORY" ]; then
        error "ECR repository URL not found"
    fi
    
    # Login to ECR
    info "Logging in to ECR..."
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY
    
    # Build image optimized for production
    info "Building Docker image..."
    docker build -t $PROJECT_NAME:mvp .
    
    # Tag image for ECR
    docker tag $PROJECT_NAME:mvp $ECR_REPOSITORY:mvp
    docker tag $PROJECT_NAME:mvp $ECR_REPOSITORY:latest
    
    # Push image to ECR
    info "Pushing image to ECR..."
    docker push $ECR_REPOSITORY:mvp
    docker push $ECR_REPOSITORY:latest
    
    log "Docker image built and pushed successfully"
}

# Deploy ECS services
deploy_services() {
    log "Deploying ECS services..."
    
    # Update web service
    info "Updating web service..."
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service $ECS_WEB_SERVICE \
        --force-new-deployment \
        --region $REGION
    
    # Update worker service
    info "Updating worker service..."
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service $ECS_WORKER_SERVICE \
        --force-new-deployment \
        --region $REGION
    
    log "ECS services updated successfully"
}

# Wait for deployment to complete
wait_for_deployment() {
    log "Waiting for deployment to complete..."
    
    # Wait for web service
    info "Waiting for web service to be stable..."
    aws ecs wait services-stable \
        --cluster $ECS_CLUSTER \
        --services $ECS_WEB_SERVICE \
        --region $REGION
    
    # Wait for worker service
    info "Waiting for worker service to be stable..."
    aws ecs wait services-stable \
        --cluster $ECS_CLUSTER \
        --services $ECS_WORKER_SERVICE \
        --region $REGION
    
    log "Deployment completed successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Get task definition ARN
    TASK_DEF_ARN=$(aws ecs describe-task-definition \
        --task-definition "${PROJECT_NAME}-web" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text \
        --region $REGION)
    
    # Get subnet ID
    SUBNET_ID=$(aws ec2 describe-subnets \
        --filters "Name=tag:Name,Values=${PROJECT_NAME}-public-1" \
        --query 'Subnets[0].SubnetId' \
        --output text \
        --region $REGION)
    
    # Get security group ID
    SECURITY_GROUP_ID=$(aws ec2 describe-security-groups \
        --filters "Name=tag:Name,Values=${PROJECT_NAME}-ecs-tasks-sg" \
        --query 'SecurityGroups[0].GroupId' \
        --output text \
        --region $REGION)
    
    # Run migration task
    info "Running Prisma migration..."
    TASK_ARN=$(aws ecs run-task \
        --cluster $ECS_CLUSTER \
        --task-definition $TASK_DEF_ARN \
        --overrides '{
            "containerOverrides": [{
                "name": "web",
                "command": ["npx", "prisma", "migrate", "deploy"]
            }]
        }' \
        --network-configuration "awsvpcConfiguration={
            subnets=[$SUBNET_ID],
            securityGroups=[$SECURITY_GROUP_ID],
            assignPublicIp=ENABLED
        }" \
        --launch-type FARGATE \
        --query 'tasks[0].taskArn' \
        --output text \
        --region $REGION)
    
    # Wait for migration to complete
    info "Waiting for migration to complete..."
    aws ecs wait tasks-stopped \
        --cluster $ECS_CLUSTER \
        --tasks $TASK_ARN \
        --region $REGION
    
    # Check if migration was successful
    EXIT_CODE=$(aws ecs describe-tasks \
        --cluster $ECS_CLUSTER \
        --tasks $TASK_ARN \
        --query 'tasks[0].containers[0].exitCode' \
        --output text \
        --region $REGION)
    
    if [ "$EXIT_CODE" != "0" ]; then
        error "Database migration failed with exit code: $EXIT_CODE"
    fi
    
    log "Database migrations completed successfully"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Get ALB DNS name
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --names "${PROJECT_NAME}-alb" \
        --query 'LoadBalancers[0].DNSName' \
        --output text \
        --region $REGION)
    
    # Test health endpoint
    info "Testing health endpoint..."
    for i in {1..5}; do
        if curl -f "http://$ALB_DNS/api/health" &> /dev/null; then
            log "Health check passed!"
            break
        else
            warn "Health check attempt $i/5 failed, retrying in 30 seconds..."
            sleep 30
        fi
    done
    
    # Display deployment information
    echo ""
    log "🎉 MVP Deployment completed successfully!"
    echo ""
    info "Application URL: http://$ALB_DNS"
    info "Health Check: http://$ALB_DNS/api/health"
    info "Admin Dashboard: http://$ALB_DNS/dashboard/admin"
    echo ""
    info "Cost Estimate: ~$77/month"
    echo ""
}

# Main deployment function
main() {
    log "Starting MVP deployment for $PROJECT_NAME"
    
    check_prerequisites
    deploy_infrastructure
    build_and_push_image
    deploy_services
    wait_for_deployment
    run_migrations
    verify_deployment
    
    log "🚀 MVP deployment completed successfully!"
}

# Parse command line arguments
case "${1:-}" in
    "deploy")
        main
        ;;
    "infrastructure")
        check_prerequisites
        deploy_infrastructure
        ;;
    "build")
        build_and_push_image
        ;;
    "services")
        deploy_services
        wait_for_deployment
        ;;
    "migrate")
        run_migrations
        ;;
    "verify")
        verify_deployment
        ;;
    *)
        echo "Usage: $0 {deploy|infrastructure|build|services|migrate|verify}"
        echo ""
        echo "Commands:"
        echo "  deploy         - Full MVP deployment"
        echo "  infrastructure - Deploy infrastructure only"
        echo "  build          - Build and push Docker image only"
        echo "  services       - Deploy ECS services only"
        echo "  migrate        - Run database migrations only"
        echo "  verify         - Verify deployment only"
        exit 1
        ;;
esac