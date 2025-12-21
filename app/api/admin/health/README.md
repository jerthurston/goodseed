# Health Check Endpoint

Simple health check endpoint for AWS ALB target group health checks.

## Endpoint

```
GET /api/health
```

## Response

**Success (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-10T20:00:00.000Z",
  "uptime": 123456,
  "environment": "production",
  "version": "1.0.0"
}
```

**Failure (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-12-10T20:00:00.000Z",
  "error": "Database connection failed"
}
```

## Health Checks Performed

1. **Database Connection**: Verifies PostgreSQL connection
2. **Redis Connection**: Verifies Redis connection for Bull Queue
3. **Process Health**: Checks Node.js process uptime

## Usage

### AWS Application Load Balancer

Configure target group health check:
- **Path**: `/api/health`
- **Protocol**: HTTP
- **Port**: 3000
- **Healthy threshold**: 2
- **Unhealthy threshold**: 3
- **Timeout**: 5 seconds
- **Interval**: 30 seconds
- **Success codes**: 200

### Manual Testing

```bash
# Local
curl http://localhost:3000/api/health

# Production
curl https://your-alb-domain.elb.amazonaws.com/api/health
```

## CloudWatch Alarms

Create alarm for unhealthy targets:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name goodseed-unhealthy-targets \
  --alarm-description "Alert when target group has unhealthy targets" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 2
```
