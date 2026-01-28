# Background Workers Documentation

## Overview

This document explains the background worker architecture for processing long-running tasks such as web scraping, email sending, and data processing in the GoodSeed Cannabis App.

---

## Table of Contents

1. [Worker Architecture](#worker-architecture)
2. [Job Queue System](#job-queue-system)
3. [Worker Types](#worker-types)
4. [Implementation Options](#implementation-options)
5. [Deployment Guide](#deployment-guide)
6. [Monitoring & Debugging](#monitoring--debugging)

---

## Worker Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Next.js App)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Routes                                             │ │
│  │  /api/scraper/trigger → Add job to queue              │ │
│  │  /api/scraper/status  → Check job status              │ │
│  └────────────────────┬───────────────────────────────────┘ │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         ▼ Add Job
┌─────────────────────────────────────────────────────────────┐
│              UPSTASH REDIS (Bull Queue)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Job Queue                                              │ │
│  │  • waiting     → Jobs waiting to be processed          │ │
│  │  • active      → Jobs currently being processed        │ │
│  │  • completed   → Successfully completed jobs           │ │
│  │  • failed      → Failed jobs (with retry logic)        │ │
│  │  • delayed     → Scheduled for future execution        │ │
│  └────────────────────┬───────────────────────────────────┘ │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         ▼ Process Job
┌─────────────────────────────────────────────────────────────┐
│              WORKER PROCESS (Render/Railway)                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Scraper Worker (lib/workers/scraper-worker.ts)        │ │
│  │  1. Pick job from queue                                │ │
│  │  2. Update job status → active                         │ │
│  │  3. Execute scraping with Crawlee                      │ │
│  │  4. Normalize and validate data                        │ │
│  │  5. Save to Neon database                              │ │
│  │  6. Update job status → completed/failed               │ │
│  │  7. Send notification email                            │ │
│  └────────────────────┬───────────────────────────────────┘ │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         ▼ Save Results
┌─────────────────────────────────────────────────────────────┐
│                  NEON POSTGRESQL                             │
│  • Products (scraped seed data)                             │
│  • ScrapeJob (job tracking and logs)                        │
│  • Sellers (seed bank information)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Job Queue System

### Bull Queue Configuration

**File**: `lib/queue/scraper-queue.ts`

```typescript
import Bull, { Queue, QueueOptions } from 'bull';

const queueOptions: QueueOptions = {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    tls: {}, // Required for Upstash
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  },
  defaultJobOptions: {
    attempts: 3,              // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',   // Exponential backoff
      delay: 5000,           // Start with 5 seconds
    },
    removeOnComplete: false,  // Keep completed jobs for audit
    removeOnFail: false,      // Keep failed jobs for debugging
  },
  limiter: {
    max: 10,                  // Max 10 jobs per minute
    duration: 60000,          // 1 minute window
  },
};

export const scraperQueue: Queue = new Bull('scraper-queue', queueOptions);
```

### Job Data Structure

```typescript
export interface ScraperJobData {
  jobId: string;              // Unique job identifier
  sellerId: string;           // Seller/seed bank ID
  scrapingSources: Array<{
    scrapingSourceUrl: string;
    scrapingSourceName: string;
    maxPage: number;
  }>;
  config: ScrapeJobConfig;    // Scraping configuration
}
```

### Job Lifecycle

```
1. WAITING
   ↓
2. ACTIVE (picked by worker)
   ↓
3. Processing...
   ↓
4a. COMPLETED (success)
    OR
4b. FAILED (error)
    ↓
    Retry? (if attempts < 3)
    ↓
    Back to WAITING (with backoff delay)
```

---

## Worker Types

### 1. Scraper Worker

**Purpose**: Scrape cannabis seed data from external websites

**File**: `lib/workers/scraper-worker.ts`

**Process Flow**:
```typescript
scraperQueue.process(async (job) => {
  const { jobId, sellerId, scrapingSources } = job.data;
  
  try {
    // 1. Update job status in database
    await prisma.scrapeJob.update({
      where: { jobId },
      data: { status: 'PROCESSING', startedAt: new Date() }
    });
    
    // 2. Create scraper instance
    const scraper = ScraperFactory.create(
      scrapingSources[0].scrapingSourceName
    );
    
    // 3. Run scraping
    const products = await scraper.run(scrapingSources);
    
    // 4. Normalize data
    const normalizedData = products.map(normalizeProduct);
    
    // 5. Save to database
    await saveProductsToDatabase(normalizedData, sellerId);
    
    // 6. Update job status
    await prisma.scrapeJob.update({
      where: { jobId },
      data: { 
        status: 'COMPLETED',
        completedAt: new Date(),
        productsScraped: products.length
      }
    });
    
    // 7. Send success notification
    await emailService.sendJobCompleted(jobId);
    
  } catch (error) {
    // Handle error, update status, and throw for Bull to retry
    await prisma.scrapeJob.update({
      where: { jobId },
      data: { 
        status: 'FAILED',
        errorMessage: error.message
      }
    });
    
    throw error; // Bull will retry
  }
});
```

**Technologies**:
- **Crawlee**: Web scraping framework
- **Cheerio**: HTML parsing
- **Puppeteer**: Headless browser (for JavaScript-heavy sites)

---

### 2. Email Worker

**Purpose**: Process email queue for sending transactional emails

**File**: `lib/workers/email-worker.ts`

**Process Flow**:
```typescript
emailQueue.process(async (job) => {
  const { type, recipient, data } = job.data;
  
  try {
    let emailTemplate;
    
    switch (type) {
      case 'SCRAPE_COMPLETED':
        emailTemplate = ScrapingCompletedEmail(data);
        break;
      case 'SCRAPE_FAILED':
        emailTemplate = ScrapingFailedEmail(data);
        break;
      case 'USER_WELCOME':
        emailTemplate = WelcomeEmail(data);
        break;
      // ... more email types
    }
    
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: recipient,
      subject: getSubject(type),
      react: emailTemplate
    });
    
    return { sent: true, recipient };
    
  } catch (error) {
    apiLogger.logError('Email send failed', { error });
    throw error;
  }
});
```

---

### 3. Cleanup Worker

**Purpose**: Periodic database cleanup and maintenance

**Triggered By**: Vercel Cron (every 30 minutes)

**Tasks**:
```typescript
async function cleanupOldJobs() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // Remove completed jobs older than 7 days
  await prisma.scrapeJob.deleteMany({
    where: {
      status: 'COMPLETED',
      completedAt: { lt: sevenDaysAgo }
    }
  });
  
  // Remove old cache entries
  await redis.del('cache:products:*');
  
  // Clean up stuck jobs
  await cleanupStuckJobs();
}
```

---

## Implementation Options

### Option 1: Vercel Serverless Functions (Current)

**Pros**:
- ✅ No additional infrastructure needed
- ✅ Auto-scaling
- ✅ Simple deployment

**Cons**:
- ❌ 10s timeout (Hobby), 60s (Pro), 300s (Enterprise)
- ❌ Not suitable for long-running scrapes
- ❌ Cold starts

**Best For**: Quick jobs, API processing, light scraping

**Configuration**:
```json
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

---

### Option 2: Render Background Worker (Recommended)

**Pros**:
- ✅ No timeout limits
- ✅ Always-on (paid tier)
- ✅ Dockerfile support
- ✅ Easy GitHub integration

**Cons**:
- ⚠️ Auto-sleep after 15 min (free tier)
- ⚠️ Cold start ~30s (free tier)

**Cost**:
- Free: $0 (with auto-sleep)
- Starter: $7/month (512MB RAM, always-on)
- Standard: $25/month (2GB RAM)

**Setup**: See [Deployment Guide](#deployment-to-render)

---

### Option 3: Railway

**Pros**:
- ✅ Simple pricing
- ✅ Good free credits
- ✅ Fast deployments

**Cons**:
- ⚠️ Credit-based pricing

**Cost**:
- $5 free credit (monthly)
- $0.000463/GB-hr (~$10/month for 1GB always-on)

---

### Option 4: Fly.io

**Pros**:
- ✅ Global distribution
- ✅ Persistent storage
- ✅ Low latency

**Cons**:
- ⚠️ More complex configuration

**Cost**:
- 3 shared-cpu VMs free
- Pay-as-you-go beyond that

---

## Deployment Guide

### Deployment to Render

#### Step 1: Create Dockerfile.worker

```dockerfile
FROM node:20-alpine

# Install Chromium for Puppeteer/Crawlee
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer environment variables
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_BIN=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile --prod=false

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript (if needed)
RUN pnpm build || echo "No build script"

# Expose health check port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start worker
CMD ["pnpm", "run", "worker:scraper"]
```

#### Step 2: Add Health Check Server

**File**: `lib/workers/scraper-worker-health.ts`

```typescript
import http from 'http';
import { apiLogger } from '@/lib/helpers/api-logger';

export function startHealthCheckServer() {
  const PORT = process.env.HEALTH_CHECK_PORT || 3001;
  
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        worker: 'scraper-worker',
        memoryUsage: process.memoryUsage()
      }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  
  server.listen(PORT, () => {
    apiLogger.info(`[Worker Health] Server listening on port ${PORT}`);
  });
  
  return server;
}
```

#### Step 3: Update Worker Script

**File**: `lib/workers/scraper-worker.ts`

```typescript
import { startHealthCheckServer } from './scraper-worker-health';

// Start health check server
const healthServer = startHealthCheckServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  apiLogger.info('[Worker] SIGTERM received, shutting down gracefully');
  
  // Close health server
  healthServer.close();
  
  // Close queue
  await scraperQueue.close();
  
  // Close database connection
  await prisma.$disconnect();
  
  process.exit(0);
});

// Start processing jobs
scraperQueue.process(async (job) => {
  // ... job processing logic
});

apiLogger.info('[Worker] Scraper worker started and listening for jobs');
```

#### Step 4: Deploy to Render

```bash
# 1. Commit changes
git add Dockerfile.worker lib/workers/
git commit -m "Add worker Docker configuration"
git push origin main

# 2. Create Render service
# Go to: https://render.com/
# Click: New + → Background Worker
# Connect GitHub repository
# Configure:
#   - Name: goodseed-worker
#   - Environment: Docker
#   - Dockerfile Path: ./Dockerfile.worker
#   - Branch: main
#   - Plan: Starter ($7/month recommended)

# 3. Add environment variables (same as Vercel)

# 4. Deploy
```

#### Step 5: Configure Worker URL in Vercel

```bash
# Add to Vercel environment variables:
WORKER_HEALTH_URL=https://goodseed-worker.onrender.com/health
```

---

### Deployment to Railway

#### Step 1: Use Same Dockerfile

Use the `Dockerfile.worker` from Render setup.

#### Step 2: Deploy to Railway

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Create new project
railway init

# 4. Deploy
railway up

# 5. Add environment variables
railway variables set DATABASE_URL=...
railway variables set REDIS_HOST=...
# ... add all required variables

# 6. Get deployment URL
railway domain
```

---

## Monitoring & Debugging

### Bull Queue Dashboard (Optional)

**Install Bull Board**:
```bash
pnpm add @bull-board/api @bull-board/express
```

**Setup Dashboard**:
```typescript
// app/api/admin/queues/route.ts
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { scraperQueue } from '@/lib/queue/scraper-queue';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/admin/queues');

createBullBoard({
  queues: [new BullAdapter(scraperQueue)],
  serverAdapter: serverAdapter,
});

export const GET = serverAdapter.registerPlugin();
```

**Access Dashboard**:
```
https://your-app.vercel.app/api/admin/queues
```

---

### Logging & Monitoring

#### Application Logging

```typescript
// lib/helpers/api-logger.ts
export const apiLogger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      ...meta,
      timestamp: new Date().toISOString()
    }));
  },
  
  warn: (message: string, meta?: any) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      ...meta,
      timestamp: new Date().toISOString()
    }));
  },
  
  logError: (message: string, meta?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: meta?.error?.message,
      stack: meta?.error?.stack,
      ...meta,
      timestamp: new Date().toISOString()
    }));
  }
};
```

#### Worker Metrics

Track key metrics:
```typescript
const metrics = {
  jobsProcessed: 0,
  jobsFailed: 0,
  averageProcessingTime: 0,
  productsScraped: 0,
};

scraperQueue.on('completed', (job, result) => {
  metrics.jobsProcessed++;
  metrics.productsScraped += result.productCount;
  
  const processingTime = Date.now() - job.processedOn!;
  metrics.averageProcessingTime = 
    (metrics.averageProcessingTime * (metrics.jobsProcessed - 1) + processingTime) / 
    metrics.jobsProcessed;
});

scraperQueue.on('failed', (job, error) => {
  metrics.jobsFailed++;
  apiLogger.logError('Job failed', { jobId: job.id, error });
});

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.json(metrics);
});
```

---

### Debugging Tips

#### 1. Check Worker Logs

**Render**:
```bash
# In Render Dashboard:
# Your Service → Logs
# Filter by log level, time range
```

**Railway**:
```bash
# Using CLI:
railway logs

# Or in Railway Dashboard:
# Your Service → Deployments → View Logs
```

#### 2. Test Job Processing Locally

```bash
# Start worker locally
pnpm run worker:scraper

# In another terminal, add test job
curl -X POST http://localhost:3000/api/scraper/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "sellerId": "test-seller",
    "sources": [...]
  }'

# Watch logs for processing
```

#### 3. Inspect Redis Queue

```bash
# Using redis-cli
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD

# List all keys
KEYS bull:scraper-queue:*

# Get job details
HGETALL bull:scraper-queue:123

# Check queue counts
LLEN bull:scraper-queue:waiting
LLEN bull:scraper-queue:active
LLEN bull:scraper-queue:completed
LLEN bull:scraper-queue:failed
```

#### 4. Monitor Database Jobs

```typescript
// Check stuck jobs
const stuckJobs = await prisma.scrapeJob.findMany({
  where: {
    status: 'PROCESSING',
    startedAt: {
      lt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    }
  }
});

// Reset stuck jobs
await prisma.scrapeJob.updateMany({
  where: { id: { in: stuckJobs.map(j => j.id) } },
  data: { status: 'FAILED', errorMessage: 'Job timeout' }
});
```

---

## Performance Optimization

### 1. Concurrency Control

```typescript
// Process multiple jobs concurrently
scraperQueue.process(5, async (job) => {
  // Process up to 5 jobs in parallel
});
```

### 2. Job Prioritization

```typescript
// High priority job
await scraperQueue.add(jobData, {
  priority: 1 // Lower number = higher priority
});

// Low priority job
await scraperQueue.add(jobData, {
  priority: 10
});
```

### 3. Rate Limiting

```typescript
const queueOptions = {
  limiter: {
    max: 30,        // Max 30 jobs per duration
    duration: 60000, // 1 minute
  }
};
```

### 4. Memory Management

```typescript
// Clean up after processing
scraperQueue.on('completed', async (job) => {
  // Remove job data from memory
  await job.remove();
});

// Limit job retention
const queueOptions = {
  defaultJobOptions: {
    removeOnComplete: {
      age: 24 * 3600, // 24 hours
      count: 1000,    // Keep last 1000
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7 days
    }
  }
};
```

---

## Best Practices

### 1. Idempotency
```typescript
// Make jobs idempotent (safe to retry)
async function processJob(jobData) {
  // Check if already processed
  const existing = await prisma.product.findUnique({
    where: { externalId: jobData.externalId }
  });
  
  if (existing) {
    return { skipped: true, reason: 'Already exists' };
  }
  
  // Process job...
}
```

### 2. Error Handling
```typescript
try {
  await processJob(job.data);
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    // Retry with longer delay
    throw new Error('Rate limited'); // Bull will retry
  } else if (error.code === 'VALIDATION_ERROR') {
    // Don't retry validation errors
    await job.moveToFailed({ message: error.message });
    return;
  } else {
    // Log and retry
    apiLogger.logError('Job failed', { error });
    throw error;
  }
}
```

### 3. Progress Tracking
```typescript
scraperQueue.process(async (job) => {
  const totalPages = job.data.maxPage;
  
  for (let page = 1; page <= totalPages; page++) {
    await scrapePage(page);
    
    // Update progress
    await job.progress((page / totalPages) * 100);
  }
});
```

---

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT-GUIDE.md)
- [Upstash Redis Setup](./UPSTASH-REDIS.md)
- [Monitoring Guide](./MONITORING.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

---

**Last Updated**: 2026-01-28
