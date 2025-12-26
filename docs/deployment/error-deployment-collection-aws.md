# AWS Deployment Error Collection & Solutions

This document contains common errors encountered during AWS deployment and their solutions.

## Table of Contents
1. [Database Connection Issues](#database-connection-issues)
2. [Docker & ECR Issues](#docker--ecr-issues)  
3. [ECS Service Issues](#ecs-service-issues)
4. [Worker Service Issues](#worker-service-issues)
5. [Network & Security Issues](#network--security-issues)
6. [SSL/TLS Connection Issues](#ssltls-connection-issues)
7. [Migration & Schema Issues](#migration--schema-issues)
8. [Frontend API Connection Issues](#frontend-api-connection-issues)

---

## Database Connection Issues

### 1. Error: Connection timeout to RDS instance

**Symptoms:**
- Application cannot connect to RDS PostgreSQL
- Health checks fail with database timeout
- ECS tasks restart frequently

**Cause:** RDS instance in private subnet without proper network configuration

**Solution:**
1. Move RDS to public subnet (for development/testing)
2. Or configure NAT Gateway and proper routing for private subnet access

```bash
# Check RDS accessibility
aws rds describe-db-instances --db-instance-identifier your-db-name --query 'DBInstances[0].PubliclyAccessible'
```

### 2. Error: pg_hba.conf authentication failed

**Symptoms:**
- "no pg_hba.conf entry for host [IP], user 'username', database 'dbname', no encryption"
- Database connection fails despite correct credentials

**Cause:** PostgreSQL server requires encrypted connections but client attempts unencrypted

**Solution:**
Check and modify SSL settings in RDS parameter group (see SSL section below)

---

## SSL/TLS Connection Issues

### 1. Error: Self-signed certificate in certificate chain

**Symptoms:**
- Application shows SSL certificate errors in logs
- Error: "self-signed certificate in certificate chain"
- Database status shows unhealthy despite connectivity
- Raw query failed with TLS connection error

**Cause:** RDS PostgreSQL has `rds.force_ssl = 1` but application cannot verify self-signed certificates

**Root Cause Analysis:**
```bash
# Check current SSL configuration
aws rds describe-db-parameters --db-parameter-group-name your-parameter-group --query 'Parameters[?contains(ParameterName, `ssl`)]'
```

**Solution (Development/Testing):**
1. Disable force SSL in RDS parameter group:
```bash
aws rds modify-db-parameter-group \
  --db-parameter-group-name your-parameter-group \
  --parameters "ParameterName=rds.force_ssl,ParameterValue=0,ApplyMethod=immediate"
```

2. Wait for parameter group modification to complete:
```bash
# Check if RDS is ready for reboot
aws rds describe-db-instances --db-instance-identifier your-db-name --query 'DBInstances[0].DBInstanceStatus'
```

3. Reboot RDS instance to apply changes:
```bash
aws rds reboot-db-instance --db-instance-identifier your-db-name
```

4. Update ECS task definition with SSL disabled connection string:
```json
{
  "name": "DATABASE_URL",
  "value": "postgresql://user:password@host:5432/database?sslmode=disable"
}
```

5. Deploy new ECS task definition:
```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
aws ecs update-service --cluster your-cluster --service your-service --task-definition your-app:latest
```

**Alternative Solution (Production):**
For production environments, configure proper SSL certificates instead of disabling SSL:
```
postgresql://user:password@host:5432/database?sslmode=require&sslcert=path/to/cert.pem&sslkey=path/to/key.pem&sslrootcert=path/to/ca-cert.pem
```

**Verification:**
```bash
# Test database connectivity after fix
curl -s http://your-alb-url/api/admin/health
```

Expected healthy response:
```json
{
  "status": "healthy",
  "checks": {
    "database": {"status": "healthy", "latency": 1181},
    "redis": {"status": "healthy", "latency": 99}
  }
}
```

---

## Docker & ECR Issues

### 1. Error: Authentication token expired

**Symptoms:**
- Docker push fails with authentication error
- "no basic auth credentials" error

**Solution:**
```bash
# Re-authenticate with ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 396260462264.dkr.ecr.us-east-1.amazonaws.com
```

### 2. Error: Repository does not exist

**Symptoms:**
- Cannot push Docker image to ECR
- Repository not found error

**Solution:**
```bash
# Create ECR repository
aws ecr create-repository --repository-name your-app-name --region us-east-1
```

### 3. Error: Image not found when deploying

**Symptoms:**
- ECS cannot pull container image
- "Image not found" in ECS task logs

**Solution:**
1. Verify image exists in ECR:
```bash
aws ecr describe-images --repository-name your-app-name
```

2. Check ECS task execution role has ECR permissions
3. Ensure image tag matches task definition

---

## ECS Service Issues

### 1. Error: Health check failures (404 errors)

**Symptoms:**
- ALB target group shows unhealthy targets
- Health check returns 404 status code
- ECS tasks restart frequently

**Cause:** Health check endpoint not accessible or incorrect path

**Solution:**
1. Verify health check endpoint in application:
```bash
curl -f http://localhost:3000/api/admin/health
```

2. Update ALB target group health check path if needed
3. Ensure application starts properly and serves on correct port (3000)

### 2. Error: Tasks fail to start

**Symptoms:**
- ECS service desired count not reached
- Tasks stop immediately after starting

**Solution:**
1. Check ECS task logs:
```bash
aws logs get-log-events --log-group-name /ecs/your-app/app --log-stream-name ecs/your-container/task-id
```

2. Verify environment variables in task definition
3. Check container resource limits (CPU/Memory)

---

## Worker Service Issues

### 1. Error: Background jobs stuck in WAITING status

**Symptoms:**
- Scraping jobs created successfully but never process
- Queue stats show `WAITING: X, ACTIVE: 0, COMPLETED: 0`
- Bull queue jobs accumulate without being processed
- API endpoints work but background processing doesn't happen

**Root Cause:** Missing ECS worker service to process Bull queue jobs

**Diagnosis:**
```bash
# Check if worker service exists
aws ecs list-services --cluster your-cluster-name
# Should show both main app service AND worker service

# Check queue stats
curl -s "http://your-alb-url/api/admin/scraper/stats"
# Look for activeCount: 0, waiting jobs not being processed

# Check for WAITING jobs
curl -s "http://your-alb-url/api/admin/scraper/scrape-job?status=WAITING"
```

**Solution: Deploy Worker Service**

**Step 1: Create Worker Task Definition**
Create `infrastructure/ecs-worker-task-definition.json`:
```json
{
  "family": "your-app-worker",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/your-app-ecs-task-execution-role",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/your-app-ecs-task-role",
  "containerDefinitions": [
    {
      "name": "your-worker",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/your-repo:dev",
      "essential": true,
      "command": ["pnpm", "worker:scraper"],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgresql://user:pass@your-rds-endpoint:5432/db?sslmode=disable"
        },
        {
          "name": "REDIS_HOST",
          "value": "your-redis-endpoint"
        },
        {
          "name": "REDIS_PORT",
          "value": "6379"
        },
        {
          "name": "WORKER_MODE",
          "value": "true"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/your-app/worker",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "worker"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "ps aux | grep worker || exit 1"
        ],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

**Step 2: Build and Push Worker Image**
```bash
# Build image with source code (use builder stage, not production)
docker build --target builder -t your-app-worker-dev .

# Tag and push to ECR
docker tag your-app-worker-dev:latest ACCOUNT.dkr.ecr.REGION.amazonaws.com/your-repo:dev
aws ecr get-login-password --region REGION | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.REGION.amazonaws.com
docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/your-repo:dev
```

**Step 3: Register Task Definition and Create Service**
```bash
# Register worker task definition
aws ecs register-task-definition --cli-input-json file://ecs-worker-task-definition.json

# Get network configuration from existing service
aws ecs describe-services --cluster your-cluster --services your-main-service --query 'services[0].networkConfiguration.awsvpcConfiguration'

# Create worker service
aws ecs create-service \
  --cluster your-cluster \
  --service-name your-worker-service \
  --task-definition your-app-worker:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --enable-execute-command

# Ensure service has desired count of 1
aws ecs update-service --cluster your-cluster --service your-worker-service --desired-count 1
```

**Step 4: Verify Worker Deployment**
```bash
# Check service status
aws ecs describe-services --cluster your-cluster --services your-worker-service --query 'services[0].{DesiredCount:desiredCount,RunningCount:runningCount,PendingCount:pendingCount}'

# Check task health
aws ecs list-tasks --cluster your-cluster --service-name your-worker-service
aws ecs describe-tasks --cluster your-cluster --tasks TASK-ID --query 'tasks[0].{LastStatus:lastStatus,HealthStatus:healthStatus}'

# Verify job processing
curl -s "http://your-alb-url/api/admin/scraper/stats"
# Should now show activeCount > 0 or jobs being completed
```

**Important Notes:**
- **Use builder stage image**: Production image only contains built Next.js files, not source TypeScript files needed for worker
- **Required dependencies**: Worker needs access to `pnpm`, `tsx`, and all source files
- **Environment variables**: Worker needs same DB/Redis access as main app
- **Health checks**: Simple process check works for worker containers
- **Scaling**: For production, consider min_capacity >= 1 to ensure continuous processing

**Verification of Success:**
- ✅ Worker service shows `RUNNING` and `HEALTHY` status
- ✅ Queue stats show `WAITING: 0, ACTIVE: 0, COMPLETED: X`  
- ✅ New jobs transition from `WAITING` → `ACTIVE` → `COMPLETED`
- ✅ Worker logs show job processing activity

---

## Network & Security Issues

### 1. Error: Security group blocking connections

**Symptoms:**
- Cannot connect to RDS from ECS tasks
- Connection timeout errors

**Solution:**
1. Update RDS security group to allow connections from ECS:
```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-rds-id \
  --protocol tcp \
  --port 5432 \
  --source-group sg-ecs-id
```

2. Verify security group rules:
```bash
aws ec2 describe-security-groups --group-ids sg-your-id
```

---

## Migration & Schema Issues

### 1. Error: Migration fails during deployment

**Symptoms:**
- Prisma migrate fails
- Database schema inconsistencies

**Solution:**
1. Run migrations manually:
```bash
# Connect to ECS task
aws ecs execute-command \
  --cluster your-cluster \
  --task task-id \
  --container your-container \
  --interactive \
  --command "/bin/bash"

# Inside container
npx prisma migrate deploy
```

2. Check migration status:
```bash
npx prisma migrate status
```

### 2. Error: Database reset required

**Symptoms:**
- Migration drift detected
- Conflicts between local and database schema

**Solution:**
```bash
# Reset database (CAUTION: This will delete all data)
npx prisma migrate reset --force

# Or resolve drift manually
npx prisma db push --accept-data-loss
```

---

## Frontend API Connection Issues

### 1. Error: ERR_SSL_VERSION_OR_CIPHER_MISMATCH

**Symptoms:**
- Frontend dashboard shows `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` errors in console
- API calls fail from browser: `goodseed.app/api/admin/sellers:1 Failed to load resource`
- Unable to create sellers or perform CRUD operations from dashboard UI
- Direct curl to HTTP ALB endpoint works fine

**Error Log Example:**
```
[SellerService.fetchSellers] APPLICATION_ERROR Error: Object
goodseed.app/api/admin/sellers:1 Failed to load resource: net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH
[useFetchSellers.queryFn] APPLICATION_ERROR Error: Object
```

**Root Cause:** 
Frontend application attempts to make HTTPS requests to `https://goodseed.app/api/*` but infrastructure only supports HTTP through ALB endpoint `http://goodseed-free-alb-xxx.us-east-1.elb.amazonaws.com`

**Cause Analysis:**
The issue stems from frontend API configuration in `lib/api.ts`:
```typescript
const getBaseUrl = () => {
    if (process.env.NODE_ENV == 'production') {
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
        if (baseUrl) {
            return `${baseUrl}/api`;
        }
        // PROBLEMATIC FALLBACK: hardcoded HTTPS domain
        return 'https://goodseed.app/api';  // ❌ No HTTPS listener
    }
    return "http://localhost:3000/api";
};
```

**Solution:**

**Step 1: Fix API Base URL**
Update `lib/api.ts` to force HTTP ALB endpoint:
```typescript
const getBaseUrl = () => {
    if (process.env.NODE_ENV == 'production') {
        // Force use HTTP ALB endpoint in production
        return 'http://goodseed-free-alb-1825640970.us-east-1.elb.amazonaws.com/api';
    }
    return "http://localhost:3000/api";
};
```

**Step 2: Build and Deploy Updated Container**
```bash
# Build new Docker image with fix
docker build -t 396260462264.dkr.ecr.us-east-1.amazonaws.com/goodseed-free:latest .

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 396260462264.dkr.ecr.us-east-1.amazonaws.com

# Push updated image
docker push 396260462264.dkr.ecr.us-east-1.amazonaws.com/goodseed-free:latest

# Force ECS service to pull new image
aws ecs update-service \
  --cluster goodseed-free-cluster \
  --service goodseed-free-service \
  --force-new-deployment
```

**Step 3: Verify Fix**
```bash
# Test API endpoints are accessible
curl -s http://goodseed-free-alb-1825640970.us-east-1.elb.amazonaws.com/api/health

# Test seller creation from dashboard UI
# Navigate to http://goodseed-free-alb-1825640970.us-east-1.elb.amazonaws.com/dashboard/admin
```

**Alternative Long-term Solution:**
For production, consider setting up HTTPS with SSL certificate:
1. Obtain SSL certificate through AWS Certificate Manager (ACM)
2. Configure ALB listener for HTTPS (port 443)
3. Update frontend to use HTTPS endpoint

**Prevention:**
- Always verify environment variables are properly set in ECS task definition
- Test both HTTP API endpoints and frontend UI during deployment
- Consider using environment-specific configuration files
- Set up proper HTTPS infrastructure for production environments

---

## Troubleshooting Commands

### General Health Checks
```bash
# Check ECS service status
aws ecs describe-services --cluster your-cluster --services your-service

# Check ALB target health
aws elbv2 describe-target-health --target-group-arn your-tg-arn

# Test application health
curl -s http://your-alb-url/api/admin/health | jq
```

### Database Connectivity
```bash
# Test database connection from local machine
psql -h your-rds-endpoint -U username -d database -p 5432

# Check RDS status
aws rds describe-db-instances --db-instance-identifier your-db-name
```

### Container Debugging
```bash
# View container logs
aws logs tail /ecs/your-app/app --follow

# Execute command in running container
aws ecs execute-command --cluster your-cluster --task task-id --container your-container --interactive --command "/bin/bash"
```

### Worker Service & Queue Debugging
```bash
# Check if worker service exists
aws ecs list-services --cluster your-cluster | grep worker

# Check worker service status
aws ecs describe-services --cluster your-cluster --services your-worker-service --query 'services[0].{DesiredCount:desiredCount,RunningCount:runningCount,PendingCount:pendingCount}'

# Check worker task health
aws ecs list-tasks --cluster your-cluster --service-name your-worker-service
aws ecs describe-tasks --cluster your-cluster --tasks TASK-ID --query 'tasks[0].{LastStatus:lastStatus,HealthStatus:healthStatus}'

# View worker logs
aws logs tail /ecs/your-app/worker --follow

# Check queue and job statistics
curl -s "http://your-alb-url/api/admin/scraper/stats" | jq

# Check for stuck jobs
curl -s "http://your-alb-url/api/admin/scraper/scrape-job?status=WAITING" | jq
curl -s "http://your-alb-url/api/admin/scraper/scrape-job?status=ACTIVE" | jq

# Test queue processing (create test job)
curl -X POST "http://your-alb-url/api/admin/sellers/SELLER-ID/scraper" \
  -H "Content-Type: application/json" \
  -d '{"mode":"quick-test"}'
```

---

## Prevention Best Practices

1. **Use Infrastructure as Code (Terraform)** for consistent deployments
2. **Set up proper monitoring and alerting** for early issue detection
3. **Test deployments in staging environment** before production
4. **Use health checks** at all levels (application, load balancer, container)
5. **Document all configuration changes** and their reasons
6. **Keep deployment scripts** for quick rollback if needed
7. **Monitor database performance** and connection pooling
8. **Use proper SSL certificates** in production environments
9. **Deploy complete infrastructure including worker services** from the start
10. **Monitor queue processing and background jobs** as part of health checks
11. **Use separate Docker images or stages** for different service types (web vs worker)
12. **Test background job processing** during deployment validation
