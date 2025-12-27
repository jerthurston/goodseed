# Environment Variables Setup Guide

## Overview
Ứng dụng sử dụng **simple 2-environment deployment strategy**:
- **Development**: Deploy từ `develop` branch → goodseed-free infrastructure
- **Production**: Deploy từ `main` branch → goodseed-production infrastructure

## GitHub Environments Setup

### 1. Create GitHub Environments
Tạo 2 environments trong GitHub repository:

#### Development Environment
- **Name**: `development`
- **Protection Rules**: None (auto-deploy)
- **Reviewers**: None

#### Production Environment
- **Name**: `production`
- **Protection Rules**: Required reviewers
- **Reviewers**: @Vietphu1211

### 2. Environment Variables Mapping

#### Development Environment Secrets
```
AWS_ACCESS_KEY_ID=<dev-aws-access-key>
AWS_SECRET_ACCESS_KEY=<dev-aws-secret>
DATABASE_URL=<dev-database-url>
REDIS_URL=<dev-redis-url>
CRON_SECRET=<dev-cron-secret>
```

#### Production Environment Secrets
```
AWS_ACCESS_KEY_ID=<prod-aws-access-key>
AWS_SECRET_ACCESS_KEY=<prod-aws-secret>
DATABASE_URL=<prod-database-url>
REDIS_URL=<prod-redis-url>
CRON_SECRET=<prod-cron-secret>
```

## Infrastructure Mapping

### Development (goodseed-free)
```yaml
ECR_REPOSITORY: goodseed-free
ECS_CLUSTER: goodseed-free-cluster
WEB_SERVICE: goodseed-free-service
WORKER_SERVICE: goodseed-free-worker
WEB_TASK_DEFINITION: goodseed-free-task
WORKER_TASK_DEFINITION: goodseed-free-worker-task
```

### Production (goodseed-production)
```yaml
ECR_REPOSITORY: goodseed-production
ECS_CLUSTER: goodseed-production-cluster
WEB_SERVICE: goodseed-production-service
WORKER_SERVICE: goodseed-production-worker
WEB_TASK_DEFINITION: goodseed-production-task
WORKER_TASK_DEFINITION: goodseed-production-worker-task
```

## Simple Branch Strategy

### Development Deployment
```bash
git checkout develop
git push origin develop
# → Automatically deploys to Development environment
```

### Production Deployment
```bash
git checkout main
git merge develop
git push origin main
# → Requires approval, then deploys to Production
```

## Local Development

### Required Environment Variables (.env)
```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<your-password>
POSTGRES_DB=goodseed_db
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/goodseed_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<your-redis-password>

# Cron
CRON_SECRET=<local-cron-secret>

# Environment
NODE_ENV=development

# AWS (for local testing)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<local-aws-key>
AWS_SECRET_ACCESS_KEY=<local-aws-secret>
```

## Setup Instructions

### 1. Setup GitHub Environments
1. Go to repository Settings → Environments
2. Create 2 environments: `development`, `production`
3. Configure protection rules and reviewers

### 2. Add Environment Secrets
For each environment, add the required secrets:
1. Go to Environment → Secrets
2. Add all required secrets for that environment
3. Ensure values match your AWS infrastructure

### 3. Verify Infrastructure
Ensure AWS infrastructure exists for each environment:
- ECR repositories
- ECS clusters and services  
- Task definitions
- Load balancers
- Databases

### 4. Test Deployment
1. Push to `develop` → should deploy to development
2. Merge to `main` → should require approval and deploy to production

## Troubleshooting

### Common Issues
1. **Missing secrets**: Ensure all environment secrets are configured
2. **Invalid AWS resources**: Verify infrastructure exists in AWS
3. **Permission denied**: Check AWS IAM permissions for each environment
4. **Task definition not found**: Ensure task definitions exist in ECS

### Health Check URLs
- **Development**: http://goodseed-free-alb.us-east-1.elb.amazonaws.com/api/health
- **Production**: https://goodseed.app/api/health

## Security Considerations

### Environment Separation
- Separate AWS accounts/VPCs for each environment
- Different databases and Redis instances
- Unique secrets and API keys
- Isolated networking

### Access Control
- Development: Open access for developers
- Production: Restricted access with approval workflow

### Secrets Management
- Never commit secrets to repository
- Use GitHub environment secrets
- Rotate secrets regularly
- Use least privilege principle for AWS IAM