# Worker Setup - Chained Pipeline Architecture

## Overview

Workers are background processes that automatically process jobs from Bull queues stored in Redis. The system uses a **chained pipeline architecture** where each step emits jobs for the next step.

## Chained Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  UNIFIED WORKER PROCESS ($7/month on Render)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 1: SCRAPE                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Scraper Worker (scraper.worker.ts)                    │    │
│  │  • Extract HTML from seller websites                   │    │
│  │  • Parse product data (name, price, variants)          │    │
│  │  • Save to database (SeedProduct, ProductPricing)      │    │
│  │  • Return scraped products in job result               │    │
│  └────────────────────────────────────────────────────────┘    │
│         │                                                        │
│         │ on 'completed' event                                  │
│         ↓ emit: createDetectPriceChangesJob()                  │
│                                                                  │
│  STEP 2: DETECT PRICE DROP                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Detect Price Changes Worker                           │    │
│  │  (detect-price-changes.worker.ts)                      │    │
│  │  • Compare scraped prices with database prices         │    │
│  │  • Filter significant drops (≥5%)                      │    │
│  │  • Find users who favorited these products             │    │
│  │  • Group changes by user                               │    │
│  └────────────────────────────────────────────────────────┘    │
│         │                                                        │
│         │ on completion                                          │
│         ↓ emit: batchCreatePriceAlertEmailJobs()               │
│                                                                  │
│  STEP 3: SEND EMAIL (×N users)                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Send Price Alert Worker                               │    │
│  │  (send-price-alert.worker.ts)                          │    │
│  │  • Generate email HTML from template                   │    │
│  │  • Send via Resend API                                 │    │
│  │  • Log delivery status                                 │    │
│  │  • Terminal step (no further jobs)                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture Benefits

### Why Chained Pipeline?

1. **Independent Retry Logic**: Each step can retry independently
   - Scraping failed? Retry scraping only
   - Email failed? Retry email only (don't re-scrape or re-detect)

2. **Clear Progress Tracking**: Monitor each step separately
   - How many scrapes completed?
   - How many price changes detected?
   - How many emails sent?

3. **Flexible Rate Limiting**: Different limits per step
   - Scraper: 1 job per minute per seller
   - Price detection: No limit (fast database operation)
   - Email: 100 emails per batch (API rate limit)

4. **Better Error Isolation**: Failure in one step doesn't affect others
   - Email service down? Scraping continues normally
   - Database slow? Only affects detection step

5. **Easy to Scale**: Can move steps to separate workers later
   - High email volume? Dedicated email worker
   - Resource-heavy scraping? Dedicated scraper worker


## Worker Implementation

### Main Worker Orchestrator

**File:** `lib/workers/worker.ts`

**What it does:**
- Orchestrates all 3 worker modules in a single process
- Handles graceful shutdown for all workers
- Runs health check server on port 3001
- Cost-effective: Single $7/month Render service

**Key Code:**
```typescript
// Import all worker modules
import { initializeScraperWorker, cleanupScraperWorker } from './scraper.worker';
import { initializeDetectPriceChangesWorker, cleanupDetectPriceChangesWorker } from './detect-price-changes.worker';
import { initializeSendPriceAlertWorker, cleanupSendPriceAlertWorker } from './send-price-alert.worker';

// Initialize all workers
await initializeScraperWorker();           // Step 1
await initializeDetectPriceChangesWorker(); // Step 2
await initializeSendPriceAlertWorker();     // Step 3
```

**Start Worker:**
```bash
# Development
pnpm run worker

# Production (Docker)
docker-compose up worker

# Render.com
# Automatically starts via render.yaml worker service
```

---

### Step 1: Scraper Worker

**File:** `lib/workers/scraper.worker.ts`

**Responsibilities:**
1. Process scraper jobs (web scraping)
2. Save products and pricings to database
3. **Emit price detection job** on successful completion

**Key Implementation:**
```typescript
export async function initializeScraperWorker() {
  // Start processing scraper jobs
  scraperQueue.process(processScraperJob);
  
  // ⭐ CHAINED PIPELINE: Emit price detection on completion
  scraperQueue.on('completed', async (job, result) => {
    if (result?.success && result?.products?.length > 0) {
      await createDetectPriceChangesJob({
        sellerId: result.sellerId,
        sellerName: result.sellerName,
        scrapedProducts: result.products,
        scrapedAt: new Date(),
      });
    }
  });
}
```

**Job Flow:**
```
INPUT: { sellerId: 'truenorthseedbank', url: 'https://...' }
  ↓
PROCESS: 
  • Extract HTML
  • Parse products
  • Save to database
  ↓
OUTPUT: { success: true, products: [...], totalProducts: 150 }
  ↓
EMIT: createDetectPriceChangesJob(...)
```

---

### Step 2: Detect Price Changes Worker

**File:** `lib/workers/detect-price-changes.worker.ts`
**Queue:** `lib/queue/detect-price-changes/`

**Responsibilities:**
1. Compare scraped prices with database prices
2. Filter significant price drops (≥5%)
3. Find users who favorited affected products
4. **Emit email jobs** (one per user)

**Key Implementation:**
```typescript
export async function initializeDetectPriceChangesWorker() {
  // Start processing price detection jobs
  detectPriceChangesQueue.process(processDetectPriceChangesJob);
  
  detectPriceChangesQueue.on('completed', (job, result) => {
    apiLogger.info('Price detection completed', {
      priceChangesDetected: result.priceChangesDetected,
      usersToNotify: result.usersToNotify,
      emailJobsCreated: result.emailJobsCreated,
    });
  });
}
```

**Job Flow:**
```
INPUT: {
  sellerId: 'truenorthseedbank',
  scrapedProducts: [
    { seedId: 'abc', name: 'Blue Dream', pricings: [...] }
  ]
}
  ↓
PROCESS:
  • Compare prices (scraped vs database)
  • Filter drops ≥5%
  • Find users with these products in favorites
  • Group price changes by user
  ↓
OUTPUT: {
  priceChangesDetected: 10,
  usersToNotify: 3,
  emailJobsCreated: 3
}
  ↓
EMIT: batchCreatePriceAlertEmailJobs([
  { userId: 'user1', email: 'user1@example.com', priceChanges: [...] },
  { userId: 'user2', email: 'user2@example.com', priceChanges: [...] },
  { userId: 'user3', email: 'user3@example.com', priceChanges: [...] }
])
```

---

### Step 3: Send Price Alert Email Worker

**File:** `lib/workers/send-price-alert.worker.ts`
**Queue:** `lib/queue/send-price-alert/`

**Responsibilities:**
1. Generate email HTML from template
2. Send email via Resend API
3. Log delivery status
4. **Terminal step** (no further jobs emitted)

**Key Implementation:**
```typescript
export async function initializeSendPriceAlertWorker() {
  // Start processing email jobs
  sendPriceAlertQueue.process(processSendPriceAlertEmailJob);
  
  sendPriceAlertQueue.on('completed', (job, result) => {
    apiLogger.info('Email sent', {
      recipientEmail: result.recipientEmail,
      messageId: result.messageId,
      priceChangesCount: result.priceChangesCount,
    });
  });
}
```

**Job Flow:**
```
INPUT: {
  userId: 'user1',
  email: 'user1@example.com',
  userName: 'John Doe',
  priceChanges: [
    {
      productName: 'Blue Dream Feminized',
      oldPrice: 50.00,
      newPrice: 40.00,
      priceChange: -10.00,
      priceChangePercent: -20.0
    }
  ]
}
  ↓
PROCESS:
  • Load email template
  • Render with user data
  • Send via Resend API
  ↓
OUTPUT: {
  emailSent: true,
  messageId: 'msg_abc123',
  recipientEmail: 'user1@example.com',
  priceChangesCount: 1
}
  ↓
DONE (Terminal step - no further jobs)
```


## How the Pipeline Works

### Complete Example Flow

```
1️⃣ SCRAPER JOB CREATED (via API or auto-scheduler)
   POST /api/admin/scraper/manual-trigger
   Body: { sellerId: 'truenorthseedbank' }
   ↓
   Job created in scraper-queue (Redis)
   Job ID: scraper:123
   Status: waiting

2️⃣ SCRAPER WORKER PICKS UP JOB
   Worker: scraper.worker.ts
   Queue: scraper-queue
   ↓
   • Crawls https://truenorthseedbank.ca/
   • Extracts 150 products
   • Saves to database:
     - SeedProduct records
     - ProductPricing records
   • Returns result: { success: true, products: [...] }
   ↓
   Job status: completed (duration: 45s)

3️⃣ SCRAPER EMITS PRICE DETECTION JOB
   Event: scraperQueue.on('completed')
   ↓
   createDetectPriceChangesJob({
     sellerId: 'truenorthseedbank',
     scrapedProducts: [150 products with new prices]
   })
   ↓
   Job created in detect-price-changes-queue
   Job ID: detect:456
   Status: waiting

4️⃣ DETECT PRICE CHANGES WORKER PICKS UP JOB
   Worker: detect-price-changes.worker.ts
   Queue: detect-price-changes-queue
   ↓
   • Compares 150 scraped prices with database
   • Finds 10 products with ≥5% price drop
   • Queries users who favorited these 10 products
   • Found 3 users to notify
   • Groups price changes by user:
     - User A: 5 products on sale
     - User B: 3 products on sale
     - User C: 2 products on sale
   ↓
   Job status: completed (duration: 2s)

5️⃣ DETECT WORKER EMITS EMAIL JOBS (BATCH)
   On completion, processor calls:
   ↓
   batchCreatePriceAlertEmailJobs([
     { userId: 'user-a', email: 'usera@example.com', priceChanges: [5 items] },
     { userId: 'user-b', email: 'userb@example.com', priceChanges: [3 items] },
     { userId: 'user-c', email: 'userc@example.com', priceChanges: [2 items] }
   ])
   ↓
   3 jobs created in send-price-alert-queue
   Job IDs: email:789, email:790, email:791
   Status: waiting

6️⃣ SEND EMAIL WORKER PICKS UP JOBS (PARALLEL)
   Worker: send-price-alert.worker.ts
   Queue: send-price-alert-queue
   ↓
   Job email:789 → Send to usera@example.com
   Job email:790 → Send to userb@example.com
   Job email:791 → Send to userc@example.com
   ↓
   Each job:
   • Loads email template
   • Renders with user's price changes
   • Sends via Resend API
   • Logs message ID
   ↓
   All jobs: completed (duration: ~1s each)

✅ PIPELINE COMPLETE
   Total time: ~48 seconds
   • 1 scraper job
   • 1 detect job
   • 3 email jobs
   • 3 users notified about 10 price drops
```


## Worker Lifecycle

### Startup
```bash
[Main Worker] 🚀 Starting unified worker process...
[Main Worker] � Initializing workers...

[Scraper Worker] 🔧 Initializing...
[Scraper Worker] ✅ Worker initialized
[Main Worker] ✅ Scraper worker ready

[Detect Price Changes Worker] 🔧 Initializing...
[Detect Price Changes Worker] ✅ Worker initialized
[Main Worker] ✅ Detect price changes worker ready

[Send Price Alert Worker] 🔧 Initializing...
[Send Price Alert Worker] ✅ Worker initialized
[Main Worker] ✅ Send price alert worker ready

[Main Worker] ✅ All workers initialized successfully
[Main Worker] 👂 Waiting for jobs...
[Main Worker] 🔗 Pipeline: SCRAPE → DETECT_PRICE_CHANGES → SEND_EMAIL
[Main Worker] 💚 Health check server running on port 3001
```

### Processing Pipeline
```bash
# Step 1: Scraping
[Scraper Worker] Job 123 started processing
[Scraper Worker] Scraping truenorthseedbank...
[Scraper Worker] ✅ Scraped 150 products
[Scraper Worker] Job 123 completed (duration: 45s)
[Scraper Worker] ✅ Price detection job emitted

# Step 2: Price Detection
[Detect Price Changes Worker] Job 456 started processing
[Detect Price Changes Worker] Comparing 150 products...
[Detect Price Changes Worker] Found 10 price drops ≥5%
[Detect Price Changes Worker] Found 3 users to notify
[Detect Price Changes Worker] Creating 3 email jobs
[Detect Price Changes Worker] ✅ Job completed (duration: 2s)

# Step 3: Email Sending (Parallel)
[Send Price Alert Worker] Job 789 started processing
[Send Price Alert Worker] Sending to usera@example.com
[Send Price Alert Worker] ✅ Email sent (messageId: msg_abc123)
[Send Price Alert Worker] Job 789 completed (duration: 1s)

[Send Price Alert Worker] Job 790 started processing
[Send Price Alert Worker] Sending to userb@example.com
[Send Price Alert Worker] ✅ Email sent (messageId: msg_abc124)
[Send Price Alert Worker] Job 790 completed (duration: 1s)

[Send Price Alert Worker] Job 791 started processing
[Send Price Alert Worker] Sending to userc@example.com
[Send Price Alert Worker] ✅ Email sent (messageId: msg_abc125)
[Send Price Alert Worker] Job 791 completed (duration: 1s)
```

### Shutdown
```bash
[Main Worker] 🛑 Received SIGTERM, shutting down gracefully...

[Scraper Worker] 🧹 Cleaning up...
[Scraper Worker] ✅ Cleaned up

[Detect Price Changes Worker] 🧹 Cleaning up...
[Detect Price Changes Worker] ✅ Cleaned up

[Send Price Alert Worker] 🧹 Cleaning up...
[Send Price Alert Worker] ✅ Cleaned up

[Main Worker] ✅ All workers cleaned up
[Main Worker] 👋 Server closed
```


## Health Check

Workers expose health check endpoints for monitoring:

```bash
curl http://localhost:3001/health

# Response:
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2026-02-02T10:00:00.000Z",
  "worker": "main-worker",
  "queues": {
    "scraper": { "status": "active" },
    "detectPriceChanges": { "status": "active" },
    "sendPriceAlert": { "status": "active" }
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


## Queue Configurations

### Scraper Queue
```typescript
// lib/queue/scraper-queue/scraper.queue.ts
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 10000 },  // 10s → 20s → 40s
  limiter: {
    max: 30,                          // Max 30 jobs
    duration: 60000,                  // Per minute
  }
}
```

### Detect Price Changes Queue
```typescript
// lib/queue/detect-price-changes/detect-price-changes.queue.ts
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },   // 5s → 25s → 125s
  removeOnComplete: { age: 86400, count: 1000 },   // 24h or 1000 jobs
  removeOnFail: { age: 604800, count: 500 },       // 7 days or 500 jobs
}
```

### Send Price Alert Queue
```typescript
// lib/queue/send-price-alert/send-price-alert.queue.ts
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },   // 2s → 4s → 8s (faster)
  removeOnComplete: { age: 86400, count: 1000 },   // 24h or 1000 jobs
  removeOnFail: { age: 604800, count: 500 },       // 7 days or 500 jobs
}
```


## Production Deployment

### Docker Compose

```yaml
# docker-compose.yml
services:
  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://goodseed-redis:6379
      - RESEND_API_KEY=${RESEND_API_KEY}
    depends_on:
      - goodseed-redis
      - goodseed-db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Render.com

```yaml
# render.yaml
services:
  - type: worker
    name: goodseed-worker
    runtime: node
    plan: starter  # $7/month
    buildCommand: pnpm install && pnpm build
    startCommand: pnpm run worker
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: REDIS_URL
        sync: false
      - key: RESEND_API_KEY
        sync: false
    healthCheckPath: /health
```

### Environment Variables

```bash
# Required
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
RESEND_API_KEY=re_xxx

# Optional
RESEND_FROM_EMAIL=noreply@goodseed.com
EMAIL_BATCH_SIZE=100
LOG_LEVEL=info
```


## Monitoring & Debugging

### Check Queue Stats

```typescript
// Check scraper queue
import { getScraperQueueStats } from '@/lib/queue/scraper-queue';
const scraperStats = await getScraperQueueStats();
console.log(scraperStats);
// { waiting: 2, active: 1, completed: 150, failed: 5, delayed: 0 }

// Check detect price changes queue
import { getDetectPriceChangesQueueStats } from '@/lib/queue/detect-price-changes';
const detectStats = await getDetectPriceChangesQueueStats();
console.log(detectStats);
// { waiting: 0, active: 1, completed: 45, failed: 0, delayed: 0 }

// Check send email queue
import { getSendPriceAlertQueueStats } from '@/lib/queue/send-price-alert';
const emailStats = await getSendPriceAlertQueueStats();
console.log(emailStats);
// { waiting: 10, active: 5, completed: 200, failed: 3, delayed: 0 }
```

### View Failed Jobs

```typescript
// View failed scraper jobs
import { scraperQueue } from '@/lib/queue/scraper-queue';
const failed = await scraperQueue.getFailed();
failed.forEach(job => {
  console.log('Job ID:', job.id);
  console.log('Seller:', job.data.sellerId);
  console.log('Error:', job.failedReason);
  console.log('Attempts:', job.attemptsMade);
  
  // Retry manually
  job.retry();
});

// View failed email jobs
import { sendPriceAlertQueue } from '@/lib/queue/send-price-alert';
const failedEmails = await sendPriceAlertQueue.getFailed();
failedEmails.forEach(job => {
  console.log('Job ID:', job.id);
  console.log('Email:', job.data.email);
  console.log('Error:', job.failedReason);
  
  // Retry manually
  job.retry();
});
```

### Redis CLI Monitoring

```bash
# Count jobs in each queue
docker exec goodseed-redis redis-cli KEYS "bull:scraper-queue:*" | wc -l
docker exec goodseed-redis redis-cli KEYS "bull:detect-price-changes:*" | wc -l
docker exec goodseed-redis redis-cli KEYS "bull:send-price-alert:*" | wc -l

# View waiting jobs
docker exec goodseed-redis redis-cli LRANGE bull:scraper-queue:waiting 0 -1
docker exec goodseed-redis redis-cli LRANGE bull:detect-price-changes:waiting 0 -1
docker exec goodseed-redis redis-cli LRANGE bull:send-price-alert:waiting 0 -1

# View active jobs
docker exec goodseed-redis redis-cli LRANGE bull:scraper-queue:active 0 -1
docker exec goodseed-redis redis-cli LRANGE bull:detect-price-changes:active 0 -1
docker exec goodseed-redis redis-cli LRANGE bull:send-price-alert:active 0 -1

# Monitor Redis in real-time
docker exec -it goodseed-redis redis-cli MONITOR
```


## Troubleshooting

### Worker not picking up jobs
1. **Check worker is running:**
   ```bash
   docker ps | grep worker
   # Should show: goodseed-worker (Up X minutes)
   ```

2. **Check Redis connection:**
   ```bash
   docker logs goodseed-worker | grep Redis
   # Should show: "Redis connected"
   ```

3. **Verify job was created:**
   ```bash
   docker exec goodseed-redis redis-cli KEYS "bull:*:waiting"
   # Should show keys if jobs exist
   ```

4. **Check worker logs:**
   ```bash
   docker logs goodseed-worker --tail 100 --follow
   ```

### Jobs failing repeatedly

1. **View failed jobs by queue:**
   ```typescript
   // Check which step is failing
   const scraperFailed = await scraperQueue.getFailedCount();
   const detectFailed = await detectPriceChangesQueue.getFailedCount();
   const emailFailed = await sendPriceAlertQueue.getFailedCount();
   
   console.log({ scraperFailed, detectFailed, emailFailed });
   ```

2. **Inspect specific failure:**
   ```typescript
   const failed = await sendPriceAlertQueue.getFailed();
   const job = failed[0];
   console.log('Error:', job.failedReason);
   console.log('Stack:', job.stacktrace);
   console.log('Data:', job.data);
   console.log('Attempts:', job.attemptsMade);
   ```

3. **Common fixes:**
   - **Scraper failing:** Check seller website changes, update selectors
   - **Detect failing:** Check database connection, verify product data
   - **Email failing:** Check Resend API key, verify email template

### Pipeline stuck at specific step

**Symptom:** Scraper completes but no price detection jobs

**Solution:**
1. Check scraper worker event handler:
   ```typescript
   // Should see in logs:
   // "✅ Price detection job emitted"
   ```

2. Verify job emission:
   ```bash
   docker logs goodseed-worker | grep "Price detection job emitted"
   ```

3. Check if detection job was created:
   ```bash
   docker exec goodseed-redis redis-cli KEYS "bull:detect-price-changes:*"
   ```

**Symptom:** Detection completes but no emails sent

**Solution:**
1. Check detection result:
   ```bash
   docker logs goodseed-worker | grep "emailJobsCreated"
   # Should show: emailJobsCreated: 3 (or >0)
   ```

2. Verify users have favorites:
   ```sql
   SELECT COUNT(*) FROM "FavouriteSeed" WHERE "seedId" IN (...);
   ```

3. Check email queue:
   ```bash
   docker exec goodseed-redis redis-cli LLEN bull:send-price-alert:waiting
   ```

### High memory usage

1. **Check completed job retention:**
   ```typescript
   // Clean old completed jobs
   await scraperQueue.clean(86400000, 'completed'); // 24h
   await detectPriceChangesQueue.clean(86400000, 'completed');
   await sendPriceAlertQueue.clean(86400000, 'completed');
   ```

2. **Limit concurrent jobs:**
   ```typescript
   // In queue configuration
   scraperQueue.process(5, processScraperJob); // Max 5 concurrent
   ```

3. **Monitor Redis memory:**
   ```bash
   docker exec goodseed-redis redis-cli INFO memory
   ```


## Related Documentation

- **Queue Implementations:**
  - [Scraper Queue](../queue/scraper-queue/)
  - [Detect Price Changes Queue](../queue/detect-price-changes/)
  - [Send Price Alert Queue](../queue/send-price-alert/)

- **Worker Implementations:**
  - [Main Worker](./worker.ts)
  - [Scraper Worker](./scraper.worker.ts)
  - [Detect Price Changes Worker](./detect-price-changes.worker.ts)
  - [Send Price Alert Worker](./send-price-alert.worker.ts)

- **Services:**
  - [Price Detection Service](../services/price-alert/detectPriceChanges.ts)
  - [Scraper Factory](../factories/scraper-factory.ts)

- **Architecture Docs:**
  - [Production Documentation](../../docs/production-docs(important)/)
  - [Implementation Guide](../../docs/implements/)

