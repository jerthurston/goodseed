# Worker Setup - Price Change Alert Queue

## Overview

Workers are background processes that automatically pick up and process jobs from Bull queues stored in Redis.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  WORKER TYPES                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Combined Worker (Production - Recommended)              │
│     lib/workers/combined-worker.ts                          │
│     ├── Scraper Queue Processor                             │
│     └── Price Alert Queue Processor 🆕                      │
│     • Cost-effective: Single $7/month Render service        │
│     • Handles multiple queue types                          │
│                                                              │
│  2. Marketing Worker (Standalone - Optional)                │
│     lib/workers/marketing-worker.ts                         │
│     ├── Marketing Queue Processor (email campaigns)         │
│     └── Price Alert Queue Processor 🆕                      │
│     • For dedicated marketing processing                    │
│     • Can run separately from scraper worker                │
│                                                              │
│  3. Scraper Worker (Standalone)                             │
│     lib/workers/scraper-worker.ts                           │
│     └── Scraper Queue Processor                             │
│     • Handles web scraping jobs only                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Worker Setup

### 1. Combined Worker (Recommended for Production)

**File:** `lib/workers/combined-worker.ts`

**What it does:**
- Registers **scraper queue** processor (existing)
- Registers **price-alert queue** processor (🆕 new)
- Runs health check server on port 3001
- Handles graceful shutdown

**Key Code:**
```typescript
// Initialize scraper worker
await initializeScraperWorker();

// 🆕 Initialize price alert worker
await initializePriceAlertWorker();

// Price alert processor registration
const { processPriceAlertJob } = await import('@/lib/queue/price-change-alert');
priceAlertQueue.process(processPriceAlertJob);
```

**Start Worker:**
```bash
# Development
pnpm run worker:combined

# Production (Docker)
docker-compose up combined-worker
```

### 2. Marketing Worker (Standalone Option)

**File:** `lib/workers/marketing-worker.ts`

**What it does:**
- Processes **marketing queue** (email campaigns, newsletters)
- Processes **price-alert queue** (price change detection & notifications) 🆕
- Runs health check server on port 3002

**Key Code:**
```typescript
// Existing marketing queue processor
marketingQueue.process(async (job: Job<EmailCampaignJob>) => {
  // Email campaign logic
});

// 🆕 New price alert queue processor
priceAlertQueue.process(processPriceAlertJob);
```

**Start Worker:**
```bash
# Development
pnpm run worker:marketing

# Production
docker-compose up marketing-worker
```

## How Workers Pick Up Jobs

```
1️⃣ Worker Process Starts
   ├── Registers processor functions with Bull queues
   ├── Bull starts polling Redis for jobs
   └── Worker logs: "✅ Queue processor registered"

2️⃣ Job Created (from API/Scraper)
   ├── Job data serialized and stored in Redis
   ├── Job enters "waiting" state
   └── Redis key: "bull:price-alert-jobs:waiting"

3️⃣ Bull Automatic Pickup (within milliseconds)
   ├── Bull polls Redis and finds job
   ├── Moves job to "active" state
   ├── Calls registered processor function
   └── Worker logs: "Job {id} started processing"

4️⃣ Job Processing
   ├── Processor validates job.data.type
   ├── Routes to handler:
   │   • "detect-price-changes" → handleDetectPriceChanges()
   │   • "send-price-alert-email" → handleSendPriceAlertEmail()
   └── Handler executes business logic

5️⃣ Job Completion
   Success:
   ├── Handler returns result
   ├── Bull marks job as "completed"
   ├── Job removed after 24h (removeOnComplete config)
   
   Failure:
   ├── Handler throws error
   ├── Bull retries (3 attempts with backoff)
   ├── If all fail → "failed" (permanent)
   └── Failed jobs kept for 7 days for debugging
```

## Worker Lifecycle

### Startup
```bash
[Combined Worker] 🚀 Starting combined worker process...
[Combined Worker] 🔧 Initializing scraper queue processor...
[Combined Worker] ✅ Scraper queue processor initialized
[Combined Worker] 🔧 Initializing price-change-alert queue processor...
[Combined Worker] ✅ Price-change-alert queue processor initialized
[Combined Worker] ✅ All workers initialized successfully
[Combined Worker] 👂 Waiting for jobs...
[Combined Worker] 💚 Health check server running on port 3001
```

### Processing
```bash
[Price Alert Queue] Job 123 is waiting
[Price Alert Queue] Job 123 started processing
[Price Alert Processor] Processing detect-price-changes job
[Price Detector] Found 10 price drops ≥5%
[Price Alert Processor] Creating 3 email jobs for users
[Price Alert Queue] Job 123 completed (duration: 2.5s)
```

### Shutdown
```bash
[Combined Worker] 🛑 Received SIGTERM, shutting down gracefully...
[Price Alert Queue] Closing queue...
[Price Alert Queue] Queue closed
[Combined Worker] 👋 Server closed
```

## Health Check

Workers expose health check endpoints for monitoring:

### Combined Worker
```bash
curl http://localhost:3001/health

# Response:
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2026-02-01T10:00:00.000Z",
  "worker": "combined-worker",
  "queues": {
    "scraper": { "status": "active" },
    "priceAlert": { "status": "active" }
  }
}
```

### Marketing Worker
```bash
curl http://localhost:3002/health

# Response:
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2026-02-01T10:00:00.000Z",
  "worker": "marketing-worker",
  "queues": {
    "marketing": { "status": "active" },
    "priceAlert": { "status": "active" }
  }
}
```

## Environment Variables

Workers require these environment variables:

```bash
# Redis Connection (required)
REDIS_URL=redis://localhost:6379

# Email Service (for price alert emails)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Worker Configuration
EMAIL_BATCH_SIZE=100  # Emails sent per batch (rate limiting)
```

## Queue Configuration

Price Alert Queue settings (from `price-change-alert.queue.ts`):

```typescript
{
  attempts: 3,                    // Retry failed jobs 3 times
  backoff: {
    type: 'exponential',
    delay: 5000,                  // 5s → 25s → 125s
  },
  removeOnComplete: {
    age: 86400,                   // Remove after 24 hours
    count: 1000,                  // Keep max 1000 completed
  },
  removeOnFail: {
    age: 604800,                  // Keep failed jobs 7 days
  },
}
```

## Production Deployment

### Docker Compose

```yaml
# docker-compose.yml
services:
  combined-worker:
    build:
      context: .
      dockerfile: Dockerfile.combined-worker
    environment:
      - REDIS_URL=redis://goodseed-redis:6379
      - RESEND_API_KEY=${RESEND_API_KEY}
    depends_on:
      - goodseed-redis
    restart: unless-stopped
```

### Render.com

```yaml
# render.yaml
services:
  - type: worker
    name: combined-worker
    env: node
    buildCommand: pnpm install && pnpm build
    startCommand: pnpm run worker:combined
    envVars:
      - key: REDIS_URL
        sync: false
      - key: RESEND_API_KEY
        sync: false
```

## Monitoring & Debugging

### Check Queue Stats
```typescript
import { getPriceAlertQueueStats } from '@/lib/queue/price-change-alert';

const stats = await getPriceAlertQueueStats();
console.log(stats);
// { waiting: 5, active: 2, completed: 100, failed: 3, delayed: 0 }
```

### View Failed Jobs
```typescript
const failed = await priceAlertQueue.getFailed();
failed.forEach(job => {
  console.log('Job ID:', job.id);
  console.log('Error:', job.failedReason);
  console.log('Data:', job.data);
  
  // Retry manually
  job.retry();
});
```

### Redis CLI Monitoring
```bash
# Count jobs in queue
docker exec goodseed-redis redis-cli KEYS "bull:price-alert-jobs:*" | wc -l

# View waiting jobs
docker exec goodseed-redis redis-cli LRANGE bull:price-alert-jobs:waiting 0 -1

# View active jobs
docker exec goodseed-redis redis-cli LRANGE bull:price-alert-jobs:active 0 -1
```

## Troubleshooting

### Worker not picking up jobs
1. Check worker is running: `docker ps | grep worker`
2. Check Redis connection: `docker logs goodseed-worker`
3. Verify job was created: Redis CLI check above
4. Check worker logs for errors

### Jobs failing repeatedly
1. View failed jobs: `priceAlertQueue.getFailed()`
2. Check error logs in database/monitoring
3. Verify environment variables (API keys, etc.)
4. Test business logic directly (bypass queue)

### High memory usage
1. Check `removeOnComplete` and `removeOnFail` configs
2. Clean old jobs: `priceAlertQueue.clean(1000, 'completed')`
3. Limit concurrent jobs: `priceAlertQueue.process(5, processor)`

## Related Documentation

- [Price Alert Queue Module](../queue/price-change-alert/README.md)
- [Quick Reference](../../docs/development/change-price-alert-worker/QUICK_REFERENCE.md)
- [Job Creation Flow](../services/marketing/price-alert/JOB_CREATION_FLOW.md)
