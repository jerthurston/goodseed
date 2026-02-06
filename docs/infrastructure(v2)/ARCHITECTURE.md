# Production Infrastructure Architecture

## System Overview

The GoodSeed Cannabis App uses a modern, serverless-first architecture designed for scalability, reliability, and cost-efficiency. This document outlines the complete system architecture for production deployment.

---

## 🏗️ Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              END USERS                                    │
│  • Web Browsers (Desktop/Mobile)                                         │
│  • API Consumers                                                          │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 │ HTTPS/TLS 1.3
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         VERCEL EDGE NETWORK                               │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Global CDN (100+ Edge Locations)                                  │  │
│  │  • Automatic HTTPS/SSL                                              │  │
│  │  • DDoS Protection (Layer 3/4/7)                                    │  │
│  │  • Edge Caching (Static Assets, API Responses)                     │  │
│  │  • Geolocation Routing                                              │  │
│  │  • Web Application Firewall (WAF)                                   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     VERCEL (Next.js Application)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  PRESENTATION LAYER (Next.js 16 - App Router)                       │    │
│  │  ┌──────────────────┐  ┌──────────────────┐    ┌─────────────────┐  │    │
│  │  │ Server Components│  │  Client Components│   │  Middleware     │  │    │
│  │  │ • SSR Pages      │  │  • Interactive UI │   │  • Auth Check   │  │    │
│  │  │ • SEO Optimized  │  │  • React Query    │   │  • Rate Limit   │  │    │
│  │  │ • Streaming      │  │  • State Mgmt     │   │  • Logging      │  │    │
│  │  └──────────────────┘  └──────────────────┘    └─────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  API LAYER (Serverless Functions)                                  │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐    │     │
│  │  │ /api/auth/*  │  │ /api/seeds/* │  │ /api/scraper/*         │    │     │ 
│  │  │ Authentication│  │ Product CRUD │  │ Job Management         │   │     │
│  │  └──────────────┘  └──────────────┘  └────────────────────────┘    │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐    │     │
│  │  │ /api/cron/*  │  │ /api/admin/* │  │ /api/webhooks/*        │    │     │
│  │  │ Scheduled    │  │ Admin Panel  │  │ External Integrations  │    │     │
│  │  └──────────────┘  └──────────────┘  └────────────────────────┘    │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  EDGE FUNCTIONS (Ultra-low latency)                                  │   │
│  │  • Geolocation-based content                                         │   │
│  │  • A/B Testing                                                       │   │
│  │  • Feature Flags                                                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────┬──────────┬─────────────┬──────────────┬─────────────┬──────────────────┘
     │          │             │              │             │
     │          │             │              │             │
     ▼          ▼             ▼              ▼             ▼
┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐
│  NEON   │ │ UPSTASH  │ │ RESEND   │ │  GITHUB    │ │   SENTRY     │
│  (DB)   │ │ (Redis)  │ │ (Email)  │ │  ACTIONS   │ │  (Errors)    │
└────┬────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘ └──────────────┘
     │           │            │             │
     │           │            │             │ Cron Trigger (Cleanup Only)
     │           │            │             │ • Weekly Sunday 2 AM UTC
     │           │            │             ▼
     │           │            │      ┌───────────────────────────┐
     │           │            │      │  /api/cron/cleanup-*      │
     │           │            │      │  (Vercel API Routes)      │
     │           │            │      │  • cleanup-stuck-jobs     │
     │           │            │      │  • cleanup-rate-limits    │
     │           │            │      │  (Short-term tasks only)  │
     │           │            │      └───────────────────────────┘
     │           │            │
     │           ▼            │                 
     │    ┌──────────────┐    │                 
     │    │  BULL QUEUE  │◄───┼─── Dashboard RUN Button (PRIMARY)
     │    │  (Upstash)   │    │    Admin schedules repeatable jobs
     │    │              │    │    POST /api/admin/scraper/schedule-all
     │    │  Job Types:  │    │
     │    │  • Scraping  │    │
     │    │  • Price     │    │
     │    │    Detection │    │
     │    │  • Email     │    │
     │    │  • Reports   │    │
     │    └──────┬───────┘    │
     │           │            │
     │           │ Pick Jobs  │
     │           ▼            │
     │    ┌─────────────────────────────────────────────────┐
     │    │   RENDER WORKER SERVICE (Background Worker)     │
     │    │   Docker Container - Always Running             │
     │    │  ┌──────────────────────────────────────────┐   │
     │    │  │  Scraper Worker (lib/workers/scraper-    │   │
     │    │  │  worker.ts)                              │   │
     │    │  │  • Pick jobs from Bull Queue             │   │
     │    │  │  • Process with Crawlee/Cheerio          │   │
     │    │  │  • Normalize & validate data             │   │
     │    │  │  • Save to Neon DB (Pricing + History)   │   │
     │    │  │  • Detect price changes (≥5% drops)      │   │
     │    │  │  • Find users with wishlist matches      │   │
     │    │  │  • Send price alert emails               │   │
     │    │  │  • Update job status                     │   │
     │    │  │  • Error handling & retry logic          │   │
     │    │  └──────────────────┬───────────────────────┘   │
     │    │                     │                           │
     │    │  Health Endpoint:   │                           │
     │    │  GET /health → 200 OK                           │
     │    └─────────────────────┼───────────────────────────┘
     │                          │
     │                          │ Scrape
     │                          ▼
     │                   ┌──────────────────┐
     │                   │  EXTERNAL SITES  │
     │                   │  • Seed Banks    │
     │                   │  • Product Data  │
     │                   │  • Pricing Info  │
     │                   └──────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│      NEON POSTGRESQL DATABASE         │
│  ┌────────────────────────────────┐  │
│  │  Production Database            │  │
│  │  • Auto-scaling                 │  │
│  │  • Connection Pooling           │  │
│  │  • Point-in-time Recovery       │  │
│  │  • Automatic Backups            │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  Database Branching             │  │
│  │  • main (production)            │  │
│  │  • preview-* (PR environments)  │  │
│  │  • dev (development)            │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

## 🔧 Component Details

### 1. Vercel Platform

**Purpose**: Application hosting, serverless functions, edge network

**Key Features**:
- **Global Edge Network**: 100+ edge locations worldwide
- **Automatic Scaling**: Handles traffic spikes automatically
- **Zero-Config Deployments**: Push to deploy
- **Preview Deployments**: Every PR gets a unique URL
- **Built-in Analytics**: Web Vitals, Core Web Vitals
- **Edge Functions**: Ultra-low latency compute at the edge

**Configuration**:
```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "outputDirectory": ".next"
}
```

**Serverless Function Limits**:
- **Hobby**: 10s timeout, 1024MB memory
- **Pro**: 60s timeout, 3008MB memory
- **Enterprise**: 900s timeout, 3008MB memory

---

### 2. Neon PostgreSQL

**Purpose**: Primary application database

**Key Features**:
- **Serverless Architecture**: Pay only for compute used
- **Instant Database Branching**: Create database copies in seconds
- **Connection Pooling**: Built-in PgBouncer
- **Point-in-Time Recovery**: Restore to any point in the last 7-30 days
- **Autoscaling**: Automatically scales compute based on demand
- **Autosuspend**: Pauses compute during inactivity (saves costs)

**Database Schema**:
```
Tables:
├── User (authentication & preferences)
│   └── receivePriceAlerts (boolean) - opt-in for price alerts
├── Account (OAuth providers)
├── Session (user sessions)
├── Seller (seed bank vendors)
├── SeedProduct (cannabis seeds)
├── Pricing (current product prices) ⭐
├── PricingHistory (historical price records) ⭐
├── Wishlist (user favorite products) ⭐
├── WishlistFolder (user wishlist organization)
├── ScrapeJob (scraping job tracking)
├── ScrapingSource (data source config)
├── Notification (user alerts)
├── ContentPage (CMS content)
└── FAQ (help content)

⭐ New tables for Price Alert System
```

**Connection Configuration**:
```typescript
// Pooled connection (recommended)
DATABASE_URL="postgresql://user:pass@ep-xxx.aws.neon.tech/db?sslmode=require"

// Direct connection (for migrations)
DIRECT_URL="postgresql://user:pass@ep-xxx.aws.neon.tech/db?sslmode=require"
```

---

### 3. Upstash Redis

**Purpose**: In-memory cache, job queue, session storage

**Key Features**:
- **Serverless Redis**: Pay-per-request pricing
- **Global Replication**: Multi-region support
- **REST API**: HTTP-based access (no connection pooling issues)
- **Durable Storage**: Data persisted to disk
- **Built-in Metrics**: Monitor usage in real-time

**Use Cases**:

1. **Bull Queue (Job Scheduling)**:
```typescript
// Job types
- Scraping jobs (scheduled/manual)
- Email sending (transactional/bulk)
- Database cleanup
- Report generation
```

2. **Application Caching**:
```typescript
// Cached data
- Product listings (5 min TTL)
- Seller information (1 hour TTL)
- Search results (10 min TTL)
- API responses (configurable)
```

3. **Rate Limiting**:
```typescript
// Limits
- API: 100 requests/minute per IP
- Scraping: 30 jobs/minute per seller
- Email: 10 emails/minute per user
```

4. **Session Storage**:
```typescript
// NextAuth sessions
- User sessions
- OAuth states
- CSRF tokens
```

**Configuration**:
```typescript
{
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    tls: {}, // Required for Upstash
    maxRetriesPerRequest: 3,
    enableReadyCheck: true
  }
}
```

---

### 4. Resend Email Service

**Purpose**: Transactional email delivery

**Key Features**:
- **99.9% Uptime SLA**: Reliable email delivery
- **Developer-First API**: Simple, modern API
- **Email Templates**: React-based email templates
- **Domain Verification**: Send from your own domain
- **Analytics**: Open rates, click tracking, bounces
- **Webhooks**: Real-time delivery notifications

**Email Types**:

1. **Authentication Emails**:
   - Email verification
   - Password reset
   - Magic link login
   - Account activation

2. **Notification Emails**:
   - Scraping job completed
   - Scraping job failed
   - Price drop alerts ⭐ NEW
   - New products available
   - User wishlist updates

3. **System Emails**:
   - Admin alerts
   - Error notifications
   - Weekly reports
   - User feedback

**Configuration**:
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'GoodSeed <noreply@lembooking.com>',
  to: user.email,
  subject: 'Welcome to GoodSeed',
  react: WelcomeEmail({ name: user.name })
});
```

---

### 5. Render Worker Service

**Purpose**: Process long-running scraping jobs from Bull Queue

**⚠️ CRITICAL REQUIREMENT: Render Starter Plan ($7/month) is REQUIRED for production**

**Why Starter Plan is Mandatory:**
- ✅ **Always-On**: Worker runs 24/7, no auto-sleep
- ✅ **Instant Processing**: No cold start delays (30s on free tier)
- ✅ **Scheduled Jobs**: Dashboard RUN button creates repeatable jobs that require always-on worker
- ✅ **Reliable**: Free tier auto-sleeps after 15 minutes → jobs stuck in queue
- ❌ **Free Tier NOT Supported**: Auto-sleep breaks Bull Queue repeatable jobs

**Key Features**:
- **Always-On Workers**: No cold starts, always ready to process jobs
- **Docker Support**: Custom environment with Chromium for scraping
- **Auto-Deploy**: Deploys automatically from GitHub on push
- **Health Monitoring**: Built-in health checks and auto-restart
- **Persistent Disk**: Optional disk storage for large files

**Pricing Tiers**:
```
❌ Free Tier ($0/month):
- 750 hours/month
- Auto-sleep after 15 min inactivity
- NOT SUITABLE: Breaks scheduled jobs, requires wake-up mechanism
- Use only for: Development/testing

✅ Starter ($7/month) - REQUIRED FOR PRODUCTION:
- Always-on, no sleep
- 512MB RAM
- Shared CPU
- Perfect for: Production workloads with scheduled jobs

Standard ($25/month):
- 2GB RAM
- Faster processing
- Suitable for: Medium traffic

Pro ($85/month):
- 4GB RAM
- Dedicated CPU
- Auto-scaling
- Suitable for: High traffic, enterprise
```

**Worker Implementation**:
```typescript
// lib/workers/scraper-worker.ts
import { scraperQueue } from '@/lib/queue/scraper-queue';
import { apiLogger } from '@/lib/helpers/api-logger';
import express from 'express';

// Health check HTTP server (required for Render monitoring)
const app = express();
const PORT = process.env.PORT || 3001;

app.get('/health', async (req, res) => {
  const queueStats = {
    waiting: await scraperQueue.getWaitingCount(),
    active: await scraperQueue.getActiveCount(),
    completed: await scraperQueue.getCompletedCount(),
    failed: await scraperQueue.getFailedCount()
  };
  
  res.status(200).json({ 
    status: 'healthy',
    uptime: process.uptime(),
    queue: queueStats,
    timestamp: new Date().toISOString()
  });
});

// Start HTTP server for health checks
app.listen(PORT, () => {
  apiLogger.info(`[Worker] Health endpoint running on port ${PORT}`);
});

// Process jobs from Bull Queue (always running on Starter plan)
scraperQueue.process(async (job) => {
  const { jobId, sellerId, scrapingSources } = job.data;
  
  apiLogger.info(`[Worker] Processing job ${jobId} for seller ${sellerId}`);
  
  try {
    // 1. Update job status to PROCESSING
    await updateJobStatus(jobId, 'PROCESSING');
    
    // 2. Run scraper with Crawlee
    const scrapedData = await runCrawlee({
      sellerId,
      sources: scrapingSources
    });
    
    // 3. Normalize and validate data
    const normalizedData = normalizeProducts(scrapedData);
    
    // 4. Save to Neon database
    // ⭐ CRITICAL: Save OLD prices to PricingHistory BEFORE updating Pricing
    const saveResult = await saveProductsToDatabase(normalizedData);
    
    // 5. Populate seedIds for price detection
    const seedIds = await populateSeedIds(normalizedData, sellerId);
    
    // 6. ⭐ NEW: Detect price changes
    const priceChanges = await detectPriceChanges(seedIds);
    apiLogger.info(`[Worker] Detected ${priceChanges.length} price drops ≥5%`);
    
    // 7. ⭐ NEW: Find users to notify
    if (priceChanges.length > 0) {
      const usersToNotify = await findUsersToNotify(priceChanges);
      apiLogger.info(`[Worker] Found ${usersToNotify.length} users to notify`);
      
      // 8. ⭐ NEW: Send price alert emails
      for (const userNotification of usersToNotify) {
        await sendPriceAlertEmail(userNotification);
      }
    }
    
    // 9. Update job status to COMPLETED
    await updateJobStatus(jobId, 'COMPLETED', {
      productsScraped: normalizedData.length,
      priceChangesDetected: priceChanges.length,
      emailsSent: usersToNotify?.length || 0,
      completedAt: new Date()
    });
    
    // 10. Send job completion notification to admin
    await sendJobCompleteEmail(jobId, sellerId);
    
    apiLogger.info(`[Worker] Job ${jobId} completed successfully`);
    
  } catch (error) {
    apiLogger.logError(`[Worker] Job ${jobId} failed`, error);
    
    // Update job status to FAILED
    await updateJobStatus(jobId, 'FAILED', {
      error: error.message
    });
    
    // Bull will retry based on job options
    throw error;
  }
});

apiLogger.info('[Worker] Scraper worker started and listening for jobs');
```

**Dockerfile Configuration**:
```dockerfile
FROM node:20-alpine

# Install Chromium for Crawlee/Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use system Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose health check port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start worker
CMD ["pnpm", "run", "worker:scraper"]
```

**Deployment Steps**:
1. Create Render account (free signup)
2. Connect GitHub repository
3. Create "Background Worker" service
4. **Select Starter Plan ($7/month)** - REQUIRED
5. Configure environment variables (same as Vercel)
6. Select Dockerfile deployment
7. Deploy and verify health endpoint

**Monitoring**:
- **Health Checks**: Automatic via `/health` endpoint every 30 seconds
- **Logs**: Real-time logs in Render dashboard
- **Metrics**: CPU, memory, network usage
- **Alerts**: Email/Slack notifications on failures
- **Uptime**: 99.9% SLA on Starter plan and above

**Integration with Dashboard**:
```typescript
// Admin Dashboard → RUN Button Flow
// app/dashboard/(components)/AutoScraperTabContent.tsx

Admin clicks RUN button
         ↓
POST /api/admin/scraper/schedule-all
         ↓
AutoScraperScheduler.initializeAllAutoJobs()
         ↓
Query sellers: WHERE isActive=true AND autoScrapeInterval > 0
         ↓
For each eligible seller:
  - Create repeatable job in Bull Queue (Upstash Redis)
  - Schedule pattern: `0 */${autoScrapeInterval} * * *`
  - Example: Seller A (6h), Seller B (24h)
         ↓
Render Worker (ALWAYS RUNNING on Starter plan):
  - Picks up jobs immediately from queue
  - Processes according to schedule
  - Repeats automatically every interval
  - No sleep, no wake-up needed
```

**Why Dashboard RUN is Primary Method**:
- ✅ Admin full control over scheduling
- ✅ Per-seller interval configuration (6h, 24h, etc.)
- ✅ Repeatable jobs work perfectly with always-on worker
- ✅ Instant job processing (no cold start)
- ✅ Real-time monitoring in dashboard
- ✅ Easy to start/stop individual sellers or all at once

---

### 6. GitHub Actions (Cron Scheduler)

**Purpose**: Scheduled cleanup and monitoring tasks (NOT for scraping trigger)

**⚠️ NOTE: Scraping is controlled via Dashboard RUN button, not GitHub Actions**

**Key Features**:
- **100% Free**: Unlimited for public repositories
- **Reliable Scheduling**: Industry-standard cron syntax
- **Manual Triggers**: Can trigger workflows manually
- **Secrets Management**: Secure environment variables
- **Workflow History**: Full audit log of all runs

**Configuration** (`.github/workflows/cron-jobs.yml`):
```yaml
name: Cleanup & Monitoring Jobs
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday at 2 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  cleanup-stuck-jobs:
    name: Cleanup Stuck Scraping Jobs
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup Jobs Older Than 30 Minutes
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/cleanup-stuck-jobs" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
      
  cleanup-rate-limits:
    name: Cleanup Old Rate Limit Records
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup Records Older Than 7 Days
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/cleanup-rate-limits" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**Secrets Setup**:
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add secrets:
   - `APP_URL`: `https://your-app.vercel.app`
   - `CRON_SECRET`: Your CRON_SECRET from .env.production

**Jobs Handled by GitHub Actions**:
- ✅ **Cleanup Stuck Jobs**: Remove jobs stuck in WAITING status
- ✅ **Cleanup Rate Limits**: Remove old rate limit records
- ✅ **Health Monitoring**: Optional health checks (can be added)
- ❌ **Scraping Trigger**: NOT handled here (use Dashboard RUN button)

**Why NOT Use GitHub Actions for Scraping:**
- ❌ Less flexible than dashboard control
- ❌ Admin can't adjust schedules easily
- ❌ Can't control per-seller intervals
- ✅ Dashboard RUN button is primary method with Render Starter

---

### 7. Background Workers (Legacy - Deprecated)
```typescript
// API Route: /api/scraper/process
export async function POST(request: Request) {
  const job = await scraperQueue.add({
    jobId: crypto.randomUUID(),
    sellerId: '123',
    scrapingSources: [...]
  });
  
  return Response.json({ jobId: job.id });
}

// Worker processes jobs from queue
scraperQueue.process(async (job) => {
  const result = await scrapeSeeds(job.data);
  await saveToDatabase(result);
});
```

**Limitations**:
- 10s timeout (Hobby), 60s (Pro)
- Not suitable for heavy scraping
- Cold starts

#### Option B: Dedicated Worker Service (Recommended for Production)

**Options**:
1. **Railway** ($5-10/month)
   - Always-on workers
   - Dockerfile support
   - Auto-deploy from GitHub
   
2. **Render** ($7/month)
   - Background workers
   - Free tier available (with sleep)
   
3. **Fly.io** (Pay-as-you-go)
   - Global distribution
   - Persistent storage

**Worker Architecture**:
```typescript
// lib/workers/scraper-worker.ts
import { scraperQueue } from '@/lib/queue/scraper-queue';

scraperQueue.process(async (job) => {
  apiLogger.info(`Processing job ${job.id}`);
  
  try {
    // Scrape data
    const data = await scraper.run(job.data);
    
    // Normalize and save
    await db.products.upsertMany(data);
    
    // Update job status
    await db.scrapeJob.update({
      where: { jobId: job.data.jobId },
      data: { status: 'COMPLETED' }
    });
    
    // Send notification
    await emailService.sendJobComplete(job.data);
    
  } catch (error) {
    apiLogger.logError('Job failed', { error });
    throw error; // Bull will retry
  }
});
```

---

### 6. Vercel Cron Jobs

**Purpose**: Schedule recurring tasks

**Configuration** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/scraper",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/cleanup-jobs",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/send-emails",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Cron Jobs**:

1. **Daily Scraping** (2 AM daily)
   - Scrape priority seed banks
   - Update product pricing
   - Check product availability

2. **Job Cleanup** (Every 30 min)
   - Remove completed jobs (>7 days old)
   - Retry failed jobs
   - Clear stuck jobs

3. **Email Queue** (Every 5 min)
   - Process email queue
   - Send pending notifications
   - Handle retries

4. **Database Maintenance** (Weekly)
   - Vacuum database
   - Update statistics
   - Archive old data

---

### 7. Monitoring & Observability

**Recommended Tools**:

#### Sentry (Error Tracking)
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

**Features**:
- Error tracking and grouping
- Performance monitoring
- Release tracking
- User feedback collection

#### Vercel Analytics
- Web Vitals monitoring
- Real User Monitoring (RUM)
- Page performance insights
- Traffic analytics

#### Custom Logging (apiLogger)
```typescript
// lib/helpers/api-logger.ts
export const apiLogger = {
  info: (message, meta) => console.log(JSON.stringify({...})),
  warn: (message, meta) => console.warn(JSON.stringify({...})),
  logError: (message, meta) => console.error(JSON.stringify({...}))
};
```

---

## 🔐 Security Architecture

### Authentication Flow
```
User Login Request
    ↓
NextAuth.js Middleware
    ↓
Provider Authentication (Google/Facebook/Email)
    ↓
Create/Update Session (Prisma Adapter)
    ↓
Store Session in Database
    ↓
Set Secure HTTP-Only Cookie
    ↓
Return to Application
```

### Authorization Layers
1. **Route Protection**: Middleware checks auth status
2. **API Authorization**: Role-based access control (RBAC)
3. **Database Security**: Row-level security with Prisma
4. **Rate Limiting**: Upstash-based rate limiting

### Data Encryption
- **In Transit**: TLS 1.3 (Vercel automatic)
- **At Rest**: AES-256 (Neon automatic)
- **Secrets**: Vercel encrypted environment variables

---

## 📊 Data Flow Examples

### 1. User Browsing Products
```
User → Edge CDN (cache hit?) → Return cached HTML
     ↓ (cache miss)
     Next.js SSR → Neon DB → Render & Cache → Return to user
```

### 2. Admin Triggers Scraping
```
Admin UI → API /api/scraper/trigger
         ↓
    Add job to Bull Queue (Upstash Redis)
         ↓
    Worker picks up job
         ↓
    Scrape external site (Crawlee)
         ↓
    Normalize data
         ↓
    Save to Neon DB
         ↓
    Send completion email (Resend)
         ↓
    Update job status
```

### 3. Scheduled Daily Scraping
```
Vercel Cron (2 AM) → Trigger /api/cron/scraper
                   ↓
              For each seller:
                   ↓
              Add scraping job to queue
                   ↓
              Worker processes jobs
                   ↓
              Update database
                   ↓
              Send summary email
```

---

## 🎯 Performance Optimization

### Edge Caching Strategy
```typescript
// Static pages: 1 hour
export const revalidate = 3600;

// Product listings: 5 minutes
export const revalidate = 300;

// Dynamic content: No cache
export const revalidate = 0;
```

### Database Query Optimization
- **Indexes**: On frequently queried columns
- **Connection Pooling**: Prevent connection exhaustion
- **Query Batching**: Reduce round trips
- **Selective Fetching**: Only fetch needed fields

### Redis Caching Strategy
```typescript
// Cache hierarchy
1. Edge Cache (Vercel) - Static assets
2. Redis Cache (Upstash) - API responses
3. Database (Neon) - Source of truth
```

---

## 🔄 Disaster Recovery

### Backup Strategy
- **Database**: Neon automatic daily backups (7-30 day retention)
- **Code**: GitHub repository (with version history)
- **Environment**: Vercel environment variables (encrypted)
- **Redis**: Upstash automatic persistence

### Recovery Procedures
1. **Application Failure**: Rollback deployment in Vercel (1-click)
2. **Database Corruption**: Point-in-time recovery via Neon
3. **Data Loss**: Restore from latest backup
4. **Service Outage**: Automatic failover (provider-managed)

---

## 📈 Scaling Strategy

### Horizontal Scaling
- **Application**: Automatic (Vercel serverless)
- **Database**: Connection pooling + read replicas
- **Workers**: Add more worker instances
- **Cache**: Upstash global replication

### Vertical Scaling
- **Database**: Upgrade Neon compute tier
- **Functions**: Upgrade Vercel plan (longer timeouts)
- **Redis**: Upgrade Upstash tier (more storage)

---

## 📝 Summary

This architecture provides:
- ✅ **Scalability**: Auto-scales from 0 to millions of requests
- ✅ **Reliability**: 99.9%+ uptime across all services
- ✅ **Performance**: Edge caching, optimized queries
- ✅ **Security**: End-to-end encryption, role-based access
- ✅ **Observability**: Comprehensive logging and monitoring
- ✅ **Cost-Efficiency**: Pay only for what you use
- ✅ **Developer Experience**: Simple deployment, easy debugging

**Next Steps**: See [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) for implementation details.
