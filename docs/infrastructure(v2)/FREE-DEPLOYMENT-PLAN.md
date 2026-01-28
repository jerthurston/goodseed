# Free Deployment Plan for Demo

## 🎯 Objective
Deploy the GoodSeed Cannabis App completely FREE for customer demo using:
- Vercel (Frontend & API)
- Neon PostgreSQL (Database)
- Upstash Redis (Queue & Cache)
- Render (Background Worker)

**Total Cost: $0/month** ✅

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   VERCEL (Free Tier)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js App (SSR + API Routes)                      │   │
│  │  - Web Pages                                          │   │
│  │  - API Routes (/api/*)                                │   │
│  │  - Authentication (NextAuth)                          │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────┬─────────────────┬────────────────────────────┘
               │                 │
               ▼                 ▼
    ┌──────────────────┐  ┌──────────────────┐
    │  NEON (Free)     │  │  UPSTASH (Free)  │
    │  PostgreSQL      │  │  Redis           │
    │  - 0.5GB Storage │  │  - 10K cmds/day  │
    │  - Connection    │  │  - Bull Queue    │
    │    Pooling       │  │  - Cache         │
    └──────────────────┘  └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  RENDER (Free)   │
                          │  Background      │
                          │  Worker          │
                          │  - Scraper Jobs  │
                          │  - Process Queue │
                          └──────────────────┘
```

---

## 📋 Services Breakdown

### 1. **Vercel - Free Tier** (Frontend + API)

**Features**:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Edge Network (CDN)
- ✅ Preview deployments for PRs
- ✅ Environment variables
- ⚠️ No cron jobs (use external triggers)
- ⚠️ 10s function timeout

**Limits**:
- Serverless Function Execution: 100 hours/month
- Bandwidth: 100GB/month
- Builds: 6,000 minutes/month

**Sign Up**: https://vercel.com/signup

---

### 2. **Neon PostgreSQL - Free Tier**

**Features**:
- ✅ 0.5GB storage
- ✅ 1 project
- ✅ 10 branches
- ✅ Connection pooling (built-in)
- ✅ Auto-suspend (saves resources)
- ✅ Point-in-time restore (7 days)
- ✅ Compatible with Prisma

**Limits**:
- Storage: 0.5GB
- Compute: 191.9 hours/month
- Projects: 1

**Perfect for demo** with moderate data

**Sign Up**: https://neon.tech/

**Connection String Format**:
```
postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

---

### 3. **Upstash Redis - Free Tier**

**Features**:
- ✅ 10,000 commands/day
- ✅ Serverless & REST API
- ✅ Compatible with ioredis & Bull.js
- ✅ Global replication
- ✅ TLS support
- ✅ Max request size: 1MB

**Limits**:
- Commands: 10,000/day (~7 commands/minute)
- Storage: 256MB
- Concurrent connections: 100

**Good for demo** if moderate queue usage

**Sign Up**: https://upstash.com/

**Connection Options**:
```bash
# Traditional Redis
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=xxx

# Or REST API (recommended for serverless)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

---

### 4. **Render - Free Tier** (Background Worker)

**Features**:
- ✅ 750 hours/month (enough for 1 service)
- ✅ Support background workers
- ✅ Auto-deploy from GitHub
- ✅ Dockerfile support
- ✅ Environment variables
- ✅ Free SSL
- ⚠️ Auto-sleep after 15 min inactivity
- ⚠️ Cold start ~30s

**Limits**:
- RAM: 512MB
- CPU: Shared
- Storage: Temporary (ephemeral)
- Sleeping: After 15 min idle

**Alternative**: Railway Free Credits ($5 initial credit)

**Sign Up**: https://render.com/

---

### 5. **Cron Jobs - Cron-job.org** (External Trigger)

**Features**:
- ✅ Free external cron service
- ✅ Trigger API endpoints
- ✅ Monitoring & logs
- ✅ Email alerts

**Alternative**: 
- EasyCron (Free tier: 1 job)
- GitHub Actions (scheduled workflows)

**Sign Up**: https://cron-job.org/

---

## ⚠️ Limitations & Workarounds

### **1. Vercel Free - No Cron Jobs**
**Workaround**: Use external cron service (Cron-job.org) to trigger API routes

Example:
```
Cron-job.org → GET /api/cron/scraper?secret=xxx
```

### **2. Render Free - Auto Sleep**
**Workaround**: 
- Use cron to ping worker every 10 minutes to keep alive
- Or accept cold start delay for demo

### **3. Upstash - 10K Commands/Day Limit**
**Calculation**:
- 10,000 commands/day = ~7 commands/minute
- Each Bull job uses ~10-20 commands
- Can handle ~500-1000 jobs/day

**Workaround for demo**:
- Reduce scraping frequency
- Process fewer sites
- Clear old jobs regularly

### **4. Vercel - 10s Function Timeout**
**Workaround**:
- Move heavy scraping to Render worker
- Use API routes only for:
  - Adding jobs to queue
  - Fetching results
  - UI rendering

---

## 🚀 Deployment Steps

### **Phase 1: Setup Infrastructure** (30 minutes)

#### Step 1: Create Neon Database
```bash
1. Go to https://neon.tech/
2. Sign up with GitHub
3. Create new project: "goodseed-demo"
4. Copy connection string
5. Save to .env.local:
   DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/goodseed?sslmode=require"
```

#### Step 2: Create Upstash Redis
```bash
1. Go to https://upstash.com/
2. Sign up with GitHub
3. Create Redis database: "goodseed-queue"
4. Copy credentials:
   REDIS_HOST=xxx.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=xxx
```

#### Step 3: Setup Vercel Project
```bash
1. Go to https://vercel.com/
2. Import GitHub repo: goodseed-app-vercel
3. Configure build:
   - Framework Preset: Next.js
   - Build Command: npm run build
   - Output Directory: .next
4. Add environment variables (see below)
```

#### Step 4: Setup Render Worker
```bash
1. Go to https://render.com/
2. Create new "Background Worker"
3. Connect GitHub repo
4. Configure:
   - Name: goodseed-worker
   - Environment: Docker
   - Dockerfile: Dockerfile.worker (create this)
   - Start Command: npm run worker:scraper
5. Add environment variables (same as Vercel)
```

---

### **Phase 2: Configure Environment Variables**

Create `.env.production` for reference:

```bash
# Database (Neon)
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/goodseed?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.neon.tech/goodseed?sslmode=require"

# Redis (Upstash)
REDIS_HOST="xxx.upstash.io"
REDIS_PORT="6379"
REDIS_PASSWORD="your-password"

# NextAuth
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="https://your-app.vercel.app"

# Cron Security
CRON_SECRET="generate-random-secret"

# Email (Optional - use Resend free tier)
EMAIL_SERVER_USER=""
EMAIL_SERVER_PASSWORD=""
EMAIL_SERVER_HOST=""
EMAIL_SERVER_PORT=""
EMAIL_FROM="noreply@yourapp.com"

# Optional: Vercel Blob for images
# BLOB_READ_WRITE_TOKEN="xxx"
```

**Add these to**:
1. Vercel Project Settings → Environment Variables
2. Render Service → Environment Variables

---

### **Phase 3: Code Modifications**

#### 1. Create `Dockerfile.worker` for Render

```dockerfile
# Use Node 20 Alpine
FROM node:20-alpine

# Install dependencies for Puppeteer (if needed)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use installed chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy app files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Run worker
CMD ["pnpm", "run", "worker:scraper"]
```

#### 2. Update `lib/queue/scraper-queue.ts`

Add connection retry logic for free tier:

```typescript
const queueOptions: QueueOptions = {
  redis: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: 3, // Retry for free tier
    enableReadyCheck: true,
    connectTimeout: 10000,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  },
  // ... rest of config
};
```

#### 3. Create API route for external cron trigger

`app/api/cron/trigger/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Trigger scraping job
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/cron/scraper`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

#### 4. Create keep-alive endpoint for Render worker

`app/api/health/worker/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  // Ping to keep Render worker alive
  const workerUrl = process.env.WORKER_HEALTH_URL;
  
  if (workerUrl) {
    try {
      await fetch(workerUrl);
    } catch (error) {
      console.log('Worker ping failed');
    }
  }

  return NextResponse.json({ status: 'ok' });
}
```

---

### **Phase 4: Database Migration**

```bash
# Local - Generate migration
npx prisma migrate dev --name init

# Push to Neon
npx prisma migrate deploy

# Or use db push for development
npx prisma db push
```

---

### **Phase 5: Deploy**

```bash
# 1. Commit changes
git add .
git commit -m "Configure for Vercel + Render deployment"
git push origin main

# 2. Vercel auto-deploys from GitHub
# 3. Render auto-deploys worker from GitHub

# 4. Run migrations on Neon
# (Do this from local with DATABASE_URL pointing to Neon)
npx prisma migrate deploy
```

---

## 🔄 Setup External Cron (Cron-job.org)

1. Go to https://cron-job.org/
2. Create account
3. Create cron jobs:

**Daily Scraping** (2 AM):
```
Title: Daily Scraping
URL: https://your-app.vercel.app/api/cron/trigger?secret=YOUR_SECRET
Schedule: 0 2 * * *
```

**Cleanup Jobs** (Every 30 min):
```
Title: Cleanup Jobs  
URL: https://your-app.vercel.app/api/cron/cleanup?secret=YOUR_SECRET
Schedule: */30 * * * *
```

**Keep Render Alive** (Every 10 min):
```
Title: Keep Worker Alive
URL: https://your-app.vercel.app/api/health/worker
Schedule: */10 * * * *
```

---

## 📊 Monitoring Free Tier Usage

### Vercel Dashboard
- Function invocations
- Bandwidth usage
- Build minutes

### Neon Console
- Storage usage
- Compute hours
- Active connections

### Upstash Console
- Daily commands
- Storage size
- Peak connections

### Render Dashboard
- CPU/Memory usage
- Logs
- Uptime status

---

## ⚡ Performance Optimization for Free Tier

### 1. **Reduce Scraping Frequency**
```typescript
// Instead of hourly, run daily or twice daily
const CANNABIS_SITES_CONFIG = {
  priority: ['vancouverseedbank', 'sunwestgenetics'], // Limit sites
  frequency: 'daily' // Not hourly
};
```

### 2. **Implement Smart Caching**
```typescript
// Cache API responses longer on free tier
export const revalidate = 3600; // 1 hour
```

### 3. **Optimize Database Queries**
```typescript
// Use select to fetch only needed fields
const products = await prisma.product.findMany({
  select: {
    id: true,
    name: true,
    price: true,
    // Don't fetch large text fields unnecessarily
  }
});
```

### 4. **Lazy Load Images**
```typescript
// Use Next.js Image with lazy loading
<Image 
  src={product.image} 
  alt={product.name}
  loading="lazy"
/>
```

### 5. **Limit Concurrent Jobs**
```typescript
// Process jobs sequentially on free tier
const queueOptions = {
  limiter: {
    max: 5,        // Max 5 jobs per minute (not 30)
    duration: 60000,
  },
};
```

---

## 🎯 Demo Optimization Tips

### For Customer Demo:
1. ✅ Pre-populate database with sample data
2. ✅ Disable auto-scraping during demo (manual trigger only)
3. ✅ Use cached data for faster page loads
4. ✅ Show only 3-4 seed banks (not all)
5. ✅ Prepare staging environment on same free tier
6. ✅ Test all features before demo

### Demo Script:
```
1. Show homepage with product listings
2. Demo search & filtering
3. Show product detail page
4. Demonstrate admin dashboard
5. Trigger manual scrape (show job queue)
6. Show real-time updates
```

---

## 🚨 Known Issues & Solutions

### Issue 1: Render Worker Sleeping
**Symptom**: First scrape job takes 30s+ to start
**Solution**: 
- Accept it as demo limitation
- Or ping worker 5 min before demo
- Explain to customer: "In production, we'll use paid tier for instant response"

### Issue 2: Upstash Command Limit
**Symptom**: "Daily limit exceeded" error
**Solution**:
- Monitor usage in morning
- Don't run auto-scraping day before demo
- Manual trigger only during demo

### Issue 3: Vercel Function Timeout
**Symptom**: API routes timeout after 10s
**Solution**:
- Move scraping to Render worker
- API routes only add jobs to queue
- Already implemented in current architecture ✅

### Issue 4: Neon Storage Limit
**Symptom**: Database full at 0.5GB
**Solution**:
- Clean old scrape logs regularly
- Store only essential data
- Use image URLs, don't store blob data

---

## 📈 Upgrade Path (When Demo Succeeds)

### Month 1-2: Free Tier
- Prove concept
- Gather feedback
- ~500 products

### Month 3+: Paid Tier
```
Vercel Pro: $20/month
  - Longer timeouts (60s)
  - Built-in cron jobs
  - Better analytics

Neon Pro: $19/month
  - 10GB storage
  - Better performance
  - Higher connection limits

Upstash: ~$10/month
  - Unlimited commands
  - Better reliability

Render: $7/month
  - Always-on worker
  - 1GB RAM
  - Faster execution

Total: ~$56/month
```

---

## 📝 Deployment Checklist

- [ ] Neon database created
- [ ] Upstash Redis created
- [ ] Vercel project configured
- [ ] Render worker deployed
- [ ] Environment variables set (all services)
- [ ] Prisma migrations run
- [ ] External cron jobs configured
- [ ] Test scraping manually
- [ ] Test API routes
- [ ] Test authentication
- [ ] Monitor all dashboards
- [ ] Prepare demo data
- [ ] Test end-to-end flow

---

## 🔗 Useful Links

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Upstash Docs**: https://upstash.com/docs
- **Render Docs**: https://render.com/docs
- **Prisma + Neon**: https://neon.tech/docs/guides/prisma
- **Bull.js + Upstash**: https://github.com/OptimalBits/bull#basic-usage

---

## 💡 Summary

This free tier setup is **perfect for demo** with these trade-offs:

✅ **Pros**:
- $0 cost
- Production-like architecture
- Scalable when needed
- Professional demo experience

⚠️ **Limitations**:
- Auto-sleep on worker (30s cold start)
- Limited scraping frequency
- 10s API timeout
- Need external cron service

**Recommendation**: Use this for demo, then upgrade key services based on customer feedback.

**Estimated Demo Capacity**:
- ✅ 500-1000 products
- ✅ 5-10 seed banks
- ✅ Daily scraping
- ✅ 100+ concurrent users (for demo)
- ✅ Good performance for presentation

---

## 🎬 Ready to Deploy?

Follow the deployment steps above and you'll have a fully functional demo in ~2 hours!

**Need help?** Check the troubleshooting section or contact support for each service.
