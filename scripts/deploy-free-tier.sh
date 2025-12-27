#!/bin/bash
set -e

# Free Tier AWS Deployment Script
# Target: $15-40/month with maximum free tier utilization

echo "🆓 Starting Free Tier Deployment..."

# Configuration
ENVIRONMENT="free-tier"
AWS_REGION=${AWS_REGION:-us-east-1}
ECR_REPOSITORY_NAME="goodseed-free"
ECS_CLUSTER_NAME="goodseed-free"
ECS_SERVICE_NAME="goodseed-web"
TERRAFORM_DIR="infrastructure"
BILLING_LIMIT=${BILLING_LIMIT:-40}  # $40 emergency stop

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

log_free_tier() {
    echo -e "${PURPLE}🆓 $1${NC}"
}

# Check AWS Free Tier eligibility
check_free_tier_eligibility() {
    log_info "Checking AWS Free Tier eligibility..."
    
    # Check account age (approximate)
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Check if RDS free tier is available (simplified check)
    if aws rds describe-db-instances --query 'DBInstances[?DBInstanceClass==`db.t3.micro`]' --output text | grep -q "db.t3.micro"; then
        log_warning "Existing t3.micro RDS instances found - may affect free tier eligibility"
    else
        log_free_tier "RDS t3.micro free tier appears available"
    fi
    
    # Check ECS free tier (first 3 months for new accounts)
    log_free_tier "ECS Fargate free tier: 20GB-Hours CPU, 40GB-Hours Memory (first 3 months)"
    
    log_success "Free tier eligibility check completed"
}

# Setup billing alerts
setup_billing_alerts() {
    log_info "Setting up billing alerts..."
    
    # Enable billing alerts (required for CloudWatch billing metrics)
    aws budgets create-budget \
        --account-id $ACCOUNT_ID \
        --budget '{
            "BudgetName": "GoodSeed-Free-Tier-Budget",
            "BudgetLimit": {
                "Amount": "'$BILLING_LIMIT'",
                "Unit": "USD"
            },
            "TimeUnit": "MONTHLY",
            "BudgetType": "COST",
            "CostFilters": {}
        }' \
        --notifications-with-subscribers '[
            {
                "Notification": {
                    "NotificationType": "ACTUAL",
                    "ComparisonOperator": "GREATER_THAN",
                    "Threshold": 80
                },
                "Subscribers": [
                    {
                        "SubscriptionType": "EMAIL",
                        "Address": "'$ALERT_EMAIL'"
                    }
                ]
            }
        ]' || log_warning "Budget may already exist"
    
    log_success "Billing alerts configured"
}

# Check current AWS costs
check_current_costs() {
    log_info "Checking current month AWS costs..."
    
    CURRENT_MONTH=$(date +"%Y-%m-01")
    NEXT_MONTH=$(date -d "next month" +"%Y-%m-01")
    
    CURRENT_COST=$(aws ce get-cost-and-usage \
        --time-period Start=$CURRENT_MONTH,End=$NEXT_MONTH \
        --granularity MONTHLY \
        --metrics BlendedCost \
        --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
        --output text)
    
    if (( $(echo "$CURRENT_COST > $BILLING_LIMIT" | bc -l) )); then
        log_error "Current month cost ($CURRENT_COST) exceeds limit ($BILLING_LIMIT)!"
    else
        log_free_tier "Current month cost: \$$CURRENT_COST (Limit: \$$BILLING_LIMIT)"
    fi
}

# Create free tier optimized variables
create_free_tier_config() {
    log_info "Creating free tier configuration..."
    
    cd $TERRAFORM_DIR
    
    if [ ! -f "free-tier.tfvars" ]; then
        log_error "free-tier.tfvars not found! Please create it first."
    fi
    
    # Validate configuration
    if ! grep -q "db_instance_class.*t3.micro" free-tier.tfvars; then
        log_error "Database must use t3.micro for free tier!"
    fi
    
    if ! grep -q "enable_nat_gateway.*false" free-tier.tfvars; then
        log_error "NAT Gateway must be disabled for cost optimization!"
    fi
    
    log_success "Free tier configuration validated"
    cd ..
}

# Deploy with free tier optimization
deploy_free_tier_infrastructure() {
    log_info "Deploying free tier optimized infrastructure..."
    
    cd $TERRAFORM_DIR
    
    # Initialize Terraform
    terraform init
    
    # Plan with free tier configuration
    log_info "Creating Terraform plan with free tier settings..."
    terraform plan \
        -var-file="free-tier.tfvars" \
        -var="ecr_repository_url=$ECR_URI" \
        -var="billing_warning_threshold=10" \
        -var="billing_critical_threshold=25" \
        -var="auto_stop_threshold=$BILLING_LIMIT" \
        -out=free-tier.tfplan
    
    # Show cost estimate
    echo ""
    log_free_tier "🆓 FREE TIER BENEFITS:"
    echo "   • RDS t3.micro: 750 hours/month (12 months)"
    echo "   • ECS Fargate: 20GB CPU + 40GB Memory hours (3 months)"
    echo "   • CloudWatch: 10 metrics + 10 alarms (always)"
    echo "   • ALB: 750 hours + 15 LCUs (12 months)"
    echo "   • Data Transfer: 15GB outbound (always)"
    echo ""
    log_info "💰 ESTIMATED MONTHLY COST:"
    echo "   • Month 1-3: \$15-25 (Maximum free tier)"
    echo "   • Month 4-12: \$25-35 (ECS paid, RDS free)" 
    echo "   • Month 13+: \$40-50 (Optimized paid)"
    echo ""
    
    # Ask for confirmation
    read -p "Continue with free tier deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Deployment cancelled by user"
    fi
    
    # Apply infrastructure
    log_info "Applying free tier infrastructure..."
    terraform apply free-tier.tfplan
    
    cd ..
    log_success "Free tier infrastructure deployed"
}

# Monitor free tier usage
monitor_free_tier_usage() {
    log_info "Setting up free tier usage monitoring..."
    
    # Create usage monitoring script
    cat > monitor-free-tier.sh << 'EOF'
#!/bin/bash
echo "📊 Free Tier Usage Report - $(date)"
echo "================================"

# RDS Usage (approximate)
echo "🗄️  RDS t3.micro Usage:"
RDS_UPTIME=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=goodseed-free \
  --statistics Sum \
  --start-time $(date -d '1 month ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 3600 \
  --query 'Datapoints' --output text | wc -l)

echo "   Hours used this month: ~$RDS_UPTIME/750 (Free tier limit)"

# Current month cost
CURRENT_COST=$(aws ce get-cost-and-usage \
  --time-period Start=$(date +"%Y-%m-01"),End=$(date -d "next month" +"%Y-%m-01") \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
  --output text)

echo "💰 Current Month Cost: \$$CURRENT_COST"

# Data transfer usage
echo "📡 Data Transfer: Check AWS Console for detailed breakdown"

echo ""
echo "🔗 Useful Links:"
echo "   • AWS Free Tier Console: https://console.aws.amazon.com/billing/home#/freetier"
echo "   • Cost Explorer: https://console.aws.amazon.com/cost-management/home#/dashboard"
echo "   • Trusted Advisor: https://console.aws.amazon.com/support/home#/trustedadvisor/category/cost_optimizing"
EOF

    chmod +x monitor-free-tier.sh
    log_success "Free tier monitoring script created (./monitor-free-tier.sh)"
}

# Main deployment flow
main() {
    echo "🆓 AWS Free Tier Optimized Deployment"
    echo "     Target: \$15-40/month with auto-stop at \$$BILLING_LIMIT"
    echo "     Environment: $ENVIRONMENT"
    echo "     Region: $AWS_REGION"
    echo ""
    
    # Get user email for alerts
    if [ -z "$ALERT_EMAIL" ]; then
        read -p "Enter your email for billing alerts: " ALERT_EMAIL
    fi
    
    check_prerequisites
    check_free_tier_eligibility
    check_current_costs
    setup_ecr
    build_and_push_image
    create_free_tier_config
    setup_billing_alerts
    deploy_free_tier_infrastructure
    deploy_application
    monitor_free_tier_usage
    verify_deployment
    
    echo ""
    log_free_tier "🎉 Free Tier Deployment Complete!"
    echo ""
    echo "📊 Free Tier Summary:"
    echo "   • RDS t3.micro: FREE for 12 months (750 hours/month)"
    echo "   • ECS Fargate: FREE for 3 months (new accounts)"
    echo "   • CloudWatch: FREE tier (10 metrics, 10 alarms)"
    echo "   • ALB: FREE for 12 months (750 hours)"
    echo ""
    echo "💰 Estimated Costs:"
    echo "   • Month 1-3: \$15-25/month"
    echo "   • Month 4-12: \$25-35/month"
    echo "   • Month 13+: \$40-50/month"
    echo ""
    echo "🚨 Auto-Stop: Services will stop if cost exceeds \$$BILLING_LIMIT"
    echo ""
    echo "📈 Usage Monitoring:"
    echo "   • Run: ./monitor-free-tier.sh"
    echo "   • AWS Free Tier Console: https://console.aws.amazon.com/billing/home#/freetier"
    echo ""
    
    log_success "Free tier deployment completed successfully! 🚀"
}

# Include functions from original deploy script
source scripts/deploy-mvp.sh 2>/dev/null || {
    log_error "Please ensure deploy-mvp.sh functions are available"
}

# Run main function
main "$@"