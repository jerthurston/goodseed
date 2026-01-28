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
│                     VERCEL (Next.js Application)                              │
│  ┌────────────────────────────────────────────────────────────────────┐                    │
│  │  PRESENTATION LAYER (Next.js 16 - App Router)                      │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │  │
│  │  │ Server Components│  │  Client Components│  │  Middleware(proxy.ts)     │  │  │
│  │  │ • SSR Pages      │  │  • Interactive UI │  │  • Auth Check   │  │  │
│  │  │ • SEO Optimized  │  │  • React Query    │  │  • Rate Limit   │  │  │
│  │  │ • Streaming      │  │  • State Mgmt     │  │  • Logging      │  │  │
│  │  └──────────────────┘  └──────────────────┘  └─────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  API LAYER (Serverless Functions)                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐   │  │
│  │  │ /api/auth/*  │  │ /api/seeds/* │  │ /api/scraper/*         │   │  │
│  │  │ Authentication│  │ Product CRUD │  │ Job Management         │   │  │
│  │  └──────────────┘  └──────────────┘  └────────────────────────┘   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐   │  │
│  │  │ /api/cron/*  │  │ /api/admin/* │  │ /api/webhooks/*        │   │  │
│  │  │ Scheduled    │  │ Admin Panel  │  │ External Integrations  │   │  │
│  │  └──────────────┘  └──────────────┘  └────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  EDGE FUNCTIONS (Ultra-low latency)                                │  │
│  │  • Geolocation-based content                                        │  │
│  │  • A/B Testing                                                       │  │
│  │  • Feature Flags                                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└────┬──────────┬─────────────┬──────────────┬─────────────┬──────────────┘
     │          │             │              │             │
     │          │             │              │             │
     ▼          ▼             ▼              ▼             ▼
┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐
│  NEON   │ │ UPSTASH  │ │ RESEND   │ │  VERCEL   │ │   SENTRY     │
│  (DB)   │ │ (Redis)  │ │ (Email)  │ │   Cron    │ │  (Errors)    │
└────┬────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘ └──────────────┘
     │           │            │             │
     │           │            │             │ Trigger
     │           │            │             ▼
     │           │            │      ┌──────────────────┐
     │           │            │      │  CRON TRIGGERS   │
     │           │            │      │  • Daily Scrape  │
     │           │            │      │  • Cleanup Jobs  │
     │           │            │      │  • Email Queue   │
     │           │            │      └────────┬─────────┘
     │           │            │               │
     │           ▼            │               ▼
     │    ┌──────────────┐   │        ┌─────────────────┐
     │    │  BULL QUEUE  │   │        │  WORKER PROCESS │
     │    │  (Job Queue) │◄──┼────────│  (Serverless)   │
     │    │              │   │        │  • Job Processor│
     │    │  Job Types:  │   │        │  • Error Handle │
     │    │  • Scraping  │   │        │  • Retry Logic  │
     │    │  • Email     │   │        └────────┬────────┘
     │    │  • Cleanup   │   │                 │
     │    │  • Reports   │   │                 │
     │    └──────┬───────┘   │                 │
     │           │            │                 │
     │           ▼            │                 ▼
     │    ┌──────────────┐   │         ┌──────────────────┐
     │    │   WORKER     │   │         │  EXTERNAL SITES  │
     │    │  SCRAPER     │◄──┼─────────│  • Seed Banks    │
     │    │  • Crawlee   │   │         │  • Product Data  │
     │    │  • Cheerio   │   │         │  • Pricing Info  │
     │    │  • Puppeteer │   │         └──────────────────┘
     │    └──────┬───────┘   │
     │           │            │
     │           ▼            ▼
     │    ┌──────────────────────────┐
     │    │   EMAIL WORKER           │
     │    │   • User Notifications   │
     │    │   • Job Alerts           │
     │    │   • System Emails        │
     │    └──────────────────────────┘
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
├── User (authentication)
├── Account (OAuth providers)
├── Session (user sessions)
├── Seller (seed bank vendors)
├── Product (cannabis seeds)
├── ScrapeJob (scraping job tracking)
├── ScrapingSource (data source config)
├── Notification (user alerts)
├── ContentPage (CMS content)
├── FAQ (help content)
└── WishlistFolder (user favorites)
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
   - New products available
   - Price alerts

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

### 5. Background Workers

**Purpose**: Process long-running tasks asynchronously

**Implementation Options**:

#### Option A: Vercel Serverless Functions (Current)
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
