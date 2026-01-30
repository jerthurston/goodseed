# Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the GoodSeed Cannabis App to production using Vercel, Neon PostgreSQL, Upstash Redis, and Resend email service.

**Total Deployment Time**: ~2-3 hours (first time)

---

## Prerequisites

### Required Accounts
- [ ] GitHub account (code repository)
- [ ] Vercel account (hosting)
- [ ] Neon account (database)
- [ ] Upstash account (Redis cache/queue)
- [ ] Resend account (email service)
- [ ] Domain name (optional, recommended)

### Local Development Setup
- [ ] Node.js 20+ installed
- [ ] pnpm package manager (`npm install -g pnpm`)
- [ ] Git installed and configured
- [ ] Code editor (VS Code recommended)
- [ ] Terminal/Command line access

### Knowledge Requirements
- Basic understanding of Git/GitHub
- Familiarity with environment variables
- Basic command line usage
- Understanding of DNS (if using custom domain)

---

## Deployment Tiers

Choose the tier that matches your needs:

| Tier | Cost | Use Case | Setup Time |
|------|------|----------|------------|
| **Free** | $0/month | Demo, MVP testing | 1-2 hours |
| **Production** | ~$95/month | Live application, moderate traffic | 2-3 hours |
| **Enterprise** | $500+/month | High traffic, SLA requirements | 3-4 hours |

---

## Phase 1: Service Setup (60 minutes)

### Step 1: Neon PostgreSQL Setup (15 min)

#### 1.1 Create Neon Account
```bash
1. Visit: https://neon.tech/
2. Click "Sign up" → "Continue with GitHub"
3. Authorize Neon to access your GitHub account
4. Complete registration
```

#### 1.2 Create Production Database
```bash
# In Neon Console:
1. Click "Create a project"
2. Configure:
   Project name: goodseed-production
   Region: us-east-2 (Ohio) or closest to your users
   Postgres version: 16
   Compute: Select appropriate tier
      - Free: 0.5GB storage (demo)
      - Launch: 10GB storage (production) - $19/month
      - Scale: 50GB storage (high-traffic) - $69/month
3. Click "Create project"
```

#### 1.3 Get Connection Strings
```bash
# After project creation:
1. Go to Dashboard → Connection Details
2. Copy both connection strings:

# Pooled connection (for application)
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Direct connection (for migrations)
DIRECT_URL="postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

3. Save these securely (we'll use them later)
```

#### 1.4 Configure Database Settings (Optional)
```bash
# In Neon Console → Settings:
1. Autosuspend delay: 5 minutes (recommended for production)
2. Enable connection pooling: Yes
3. Max connections: 100 (adjust based on tier)
4. Point-in-time recovery: Enable (7-30 days)
```

---

### Step 2: Upstash Redis Setup (10 min)

#### 2.1 Create Upstash Account
```bash
1. Visit: https://upstash.com/
2. Click "Sign up" → "Continue with GitHub"
3. Authorize Upstash
4. Complete registration
```

#### 2.2 Create Redis Database
```bash
# In Upstash Console:
1. Click "Create Database"
2. Configure:
   Name: goodseed-upstash-redis
   Type: Regional (cheaper, sufficient for most cases)
   Region: us-east-1 (or same as Neon for low latency)
   Plan:
      - Free: 10K commands/day (demo)
      - Pay-as-you-go: ~$10/month (production)
      - Pro: $50/month (high-traffic)
   Enable TLS: Yes (required)
   Enable Eviction: No (we handle cleanup)
3. Click "Create"
```

#### 2.3 Get Redis Credentials
```bash
# In Database Details page:
1. Copy connection details:

REDIS_HOST="xxx-xxx-12345.c-2.us-east-1.aws.upstash.io"
REDIS_PORT="6379"
REDIS_PASSWORD="your-password-here"

# Alternative: REST API (for serverless-friendly access)
UPSTASH_REDIS_REST_URL="https://xxx-12345.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXXXaaabbbccc..."

2. Save these credentials
```

#### 2.3 Configure Redis Settings
```bash
# In Database Settings:
1. Max database size: Unlimited (pay-as-you-go)
2. Max connection: 100
3. Enable multiZone: Optional (for high availability)
```

#### 2.4 Integrate Upstash with Vercel (Recommended)

**Option A: Direct Integration (Easiest)**
```bash
# In Vercel Project Dashboard:
1. Go to "Integrations" → Search "Upstash"
2. Click "Add Integration" → Select your project
3. Choose Upstash Redis database: goodseed-upstash-redis
4. Configure:
   Environments: ✓ Production, ✓ Preview, ✓ Development
   Custom Prefix: (leave empty) ← RECOMMENDED
   
   # If REDIS_URL already exists:
   - Delete existing REDIS_URL in Environment Variables first
   - Then add integration with empty prefix
   
   # OR use different prefix:
   - Custom Prefix: UPSTASH
   - Update code to use UPSTASH_REDIS_URL
5. Click "Add Integration"
6. Upstash automatically creates:
   - REDIS_URL (or UPSTASH_REDIS_URL)
   - REDIS_HOST
   - REDIS_PORT
   - REDIS_PASSWORD
```



**Verify Integration:**
```bash
# After integration:
1. Go to Vercel → Settings → Environment Variables
2. Check REDIS_* variables are created
3. Redeploy to apply changes
```

#### 2.5 Setup Redis Client Locally

**Step 1: Login to Vercel CLI**
```bash
# Login to Vercel
vercel login

# Link your project
cd /path/to/goodseed-app-vercel
vercel link

# Pull environment variables from Vercel
vercel env pull .env.development.local
```

**Step 2: Install Upstash Redis SDK**
```bash
# Install the SDK
pnpm add @upstash/redis

# Verify installation
grep "@upstash/redis" package.json
```

**Step 3: Verify Redis Client**
```bash
# Check lib/redis.ts exists with both clients:
# 1. ioredis (for Bull queue)
# 2. upstashRedis (for serverless caching)

# File should export:
# - redisConfig: Configuration object
# - ioredis: IORedis client for Bull
# - upstashRedis: Upstash client for REST API
# - default: ioredis instance
```

**Step 4: Test Redis Connection**
```bash
# Start dev server
pnpm dev

# Check console logs for:
# [Redis] Configuration: { host, port, tls, hasPassword, hasUpstash }

# If you see connection errors:
# 1. Verify REDIS_URL format in .env.development.local
# 2. Check TLS is enabled (rediss:// not redis://)
# 3. Ensure Upstash database is not paused
```

**Architecture:**
```
┌─────────────────────────────────────────────┐
│  Application Layer                          │
├─────────────────────────────────────────────┤
│  Bull Queue (ioredis)  │  API Cache         │
│  ├─ scraper-queue.ts   │  (upstashRedis)    │
│  ├─ Job processing     │  ├─ Rate limiting  │
│  └─ Worker management  │  └─ Session cache  │
├─────────────────────────────────────────────┤
│  lib/redis.ts (Client Manager)              │
│  ├─ redisConfig (parsed from env)           │
│  ├─ ioredis (TCP connection for Bull)       │
│  └─ upstashRedis (REST API for serverless)  │
├─────────────────────────────────────────────┤
│  Environment Variables                      │
│  ├─ REDIS_URL (rediss://...)                │
│  ├─ KV_REST_API_URL (https://...)           │
│  └─ KV_REST_API_TOKEN                       │
└─────────────────────────────────────────────┘
```

---

### Step 3: Resend Email Setup (10 min)

#### 3.1 Create Resend Account
```bash
1. Visit: https://resend.com/
2. Click "Sign up"
3. Verify your email
4. Complete registration
```

#### 3.2 Get API Key
```bash
# In Resend Dashboard:
1. Go to "API Keys"
2. Click "Create API Key"
3. Name: "goodseed-production"
4. Permissions: Full access
5. Click "Create"
6. Copy the API key (shown only once!)

RESEND_API_KEY="re_xxxxxxxxxxxx"

7. Save this securely
```

#### 3.3 Verify Domain (Recommended for Production)
```bash
# For sending emails from your domain:
1. Go to "Domains" → "Add Domain"
2. Enter your domain: lembooking.com
3. Add DNS records (provided by Resend):
   
   Type: TXT
   Name: resend._domainkey
   Value: [provided by Resend]
   
   Type: TXT
   Name: _dmarc
   Value: [provided by Resend]
   
4. Wait for verification (5-30 minutes)
5. Use verified domain in emails:
   RESEND_FROM_EMAIL="noreply@lembooking.com"
```

**Note**: For demo, you can use Resend's test email:
```bash
RESEND_FROM_EMAIL="onboarding@resend.dev"
```

#### 3.4 Choose Plan
```bash
Plans:
- Free: 100 emails/day, 3,000/month (demo)
- Pro: $20/month, 50,000 emails/month (production)
- Business: $80/month, 1,000,000 emails/month (high-volume)
```

---

### Step 4: Vercel Setup (15 min)

#### 4.1 Create Vercel Account
```bash
1. Visit: https://vercel.com/
2. Click "Sign up" → "Continue with GitHub"
3. Authorize Vercel to access your GitHub account
4. Complete registration
```

#### 4.2 Import GitHub Repository
```bash
# In Vercel Dashboard:
1. Click "Add New..." → "Project"
2. Import GitHub repository:
   - Repository: goodseed-app-vercel
   - Owner: Vietphu1211
3. Click "Import"
```

#### 4.3 Configure Build Settings
```bash
# In project configuration:
Framework Preset: Next.js
Root Directory: ./
Build Command: pnpm build
Output Directory: .next
Install Command: pnpm install --frozen-lockfile
Node.js Version: 20.x

# Click "Continue"
```

#### 4.4 DO NOT DEPLOY YET
```bash
# We need to add environment variables first
Click "Environment Variables" tab
```

---

### Step 5: Environment Variables Configuration (20 min)

#### 5.1 Generate Secrets
```bash
# Generate secure secrets:

# For NEXTAUTH_SECRET and AUTH_SECRET:
openssl rand -base64 32

# For CRON_SECRET:
openssl rand -base64 32

# Save these generated values
```

#### 5.2 Add Environment Variables to Vercel

In Vercel project settings → Environment Variables, add ALL of these:

```bash
# ===== DATABASE (Neon) =====
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# ===== REDIS (Upstash) =====
REDIS_HOST=xxx-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# ===== AUTHENTICATION =====
# Your Vercel URL will be: https://your-project.vercel.app
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=generated-secret-from-step-5.1
AUTH_URL=https://your-project.vercel.app
AUTH_SECRET=generated-secret-from-step-5.1
AUTH_TRUST_HOST=true

# ===== EMAIL (Resend) =====
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@lembooking.com

# ===== OAUTH PROVIDERS (Optional) =====
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
AUTH_FACEBOOK_ID=your-facebook-app-id
AUTH_FACEBOOK_SECRET=your-facebook-app-secret

# ===== SECURITY =====
CRON_SECRET=generated-secret-from-step-5.1

# ===== ENVIRONMENT =====
NODE_ENV=production

# ===== OPTIONAL: MONITORING =====
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=goodseed-app

# ===== OPTIONAL: WORKER =====
WORKER_HEALTH_URL=https://goodseed-worker.onrender.com/health

# ===== OPTIONAL: FEATURES =====
SCRAPER_VERBOSE=false
NEXT_PUBLIC_DEMO_PASSWORD=your-demo-password
```

**Important**: 
- Set environment for: Production, Preview, Development (check all three)
- Vercel will encrypt these automatically

---

## Phase 2: Database Migration (15 minutes)

### Step 6: Run Database Migrations

#### 6.1 Local Setup
```bash
# Clone repository (if not already)
git clone https://github.com/Vietphu1211/goodseed-app-vercel.git
cd goodseed-app-vercel

# Install dependencies
pnpm install

# Create .env.local with Neon credentials
cp .env.example .env.local
# Edit .env.local with your Neon DATABASE_URL
```

#### 6.2 Generate Prisma Client
```bash
# Set environment variable and generate
export DATABASE_URL="your-neon-connection-string"
npx prisma generate
```

#### 6.3 Push Schema to Neon
```bash
# Option A: Using db push (recommended for new database)
npx prisma db push

# Option B: Using migrations (for production)
npx prisma migrate deploy
```

#### 6.4 Verify Database
```bash
# Open Prisma Studio to verify
npx prisma studio

# Or check in Neon Console:
# Tables → Should see all tables created
```

#### 6.5 Seed Initial Data (Optional)
```bash
# Add initial sellers/data
npx tsx scripts/seed-dispensaries.ts

# Or create your own seed script
```

---

## Phase 3: Deployment (30 minutes)

### Step 7: Deploy to Vercel

#### 7.1 First Deployment
```bash
# In Vercel Dashboard:
1. Go to your project
2. Click "Deploy"
3. Wait for build to complete (3-5 minutes)
4. Check build logs for any errors
```

#### 7.2 Verify Deployment
```bash
# After deployment:
1. Click on deployment URL: https://your-project.vercel.app
2. Test homepage loads
3. Try to sign in/register
4. Check API routes: https://your-project.vercel.app/api/health
```

#### 7.3 Common Build Errors

**Error: Prisma Client not generated**
```bash
Solution: Add postinstall script to package.json
"scripts": {
  "postinstall": "prisma generate"
}
```

**Error: Environment variable not found**
```bash
Solution: Check Environment Variables in Vercel settings
- Ensure all required vars are set
- Restart deployment
```

**Error: Database connection failed**
```bash
Solution: Verify Neon connection string
- Must include ?sslmode=require
- Check username/password
- Verify database is not paused
```

---

### Step 8: Configure Custom Domain (Optional)

#### 8.1 Add Domain to Vercel
```bash
# In Vercel project settings:
1. Go to "Domains"
2. Click "Add"
3. Enter your domain: goodseed.lembooking.com
4. Vercel provides DNS records
```

#### 8.2 Update DNS Settings
```bash
# In your DNS provider (Cloudflare):
1. Add CNAME record:
   Type: CNAME
   Name: goodseed (or @ for root)
   Value: cname.vercel-dns.com
   TTL: Auto
   Proxy: Disabled (important!)

2. Wait for DNS propagation (5-60 minutes)
```

#### 8.3 Update Environment Variables
```bash
# Update in Vercel settings:
NEXTAUTH_URL=https://goodseed.lembooking.com
AUTH_URL=https://goodseed.lembooking.com

# Redeploy for changes to take effect
```

---

### Step 9: Configure Vercel Cron Jobs

**Note**: Cron jobs require Vercel Pro plan ($20/month)

#### 9.1 Create vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron/scraper",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/cleanup-rate-limits",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Cron Jobs Explained:**
- `/api/cron/scraper`: Triggers automated scraping for all active sellers (Daily at 2 AM UTC)
- `/api/cron/cleanup-rate-limits`: Cleans up old rate limit records older than 7 days (Daily at 2 AM UTC)

#### 9.2 Commit and Deploy
```bash
git add vercel.json
git commit -m "Add Vercel cron configuration"
git push origin main

# Vercel auto-deploys
```

#### 9.3 Alternative: External Cron Service (Free)

If using Vercel Hobby (free), use external cron:

**Option A: Cron-job.org**
```bash
1. Visit: https://cron-job.org/
2. Create account
3. Add cron jobs:
   
   Job 1 - Scraper:
   URL: https://your-app.vercel.app/api/cron/scraper
   Schedule: 0 2 * * * (daily at 2 AM)
   Headers: Authorization: Bearer YOUR_CRON_SECRET
   
   Job 2 - Cleanup:
   URL: https://your-app.vercel.app/api/cron/cleanup-rate-limits
   Schedule: 0 2 * * * (daily at 2 AM)
   Headers: Authorization: Bearer YOUR_CRON_SECRET
```

**Option B: GitHub Actions (Recommended for Free Tier)**
```yaml
# .github/workflows/cron-jobs.yml
name: Scheduled Jobs
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:

jobs:
  trigger-scraping:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Scraper
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/scraper" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
      
      - name: Trigger Cleanup
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/cleanup-rate-limits" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**Setup GitHub Actions:**
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add secrets:
   - `APP_URL`: `https://your-app.vercel.app`
   - `CRON_SECRET`: Your CRON_SECRET value from .env.production
3. Commit `.github/workflows/cron-jobs.yml` to repository
4. GitHub will automatically run daily at 2 AM UTC

---

## Phase 4: Worker Setup (Optional, 30 minutes)

For long-running scraping tasks, deploy a separate worker service on Render.com.

**Why Use a Separate Worker?**
- Scraping tasks can run for 10+ minutes (Vercel has 10s timeout on Hobby, 5min on Pro)
- Chromium requires significant memory (512MB+)
- Background processing doesn't block main application
- Better resource management and scaling

---

### Step 10: Prepare Worker Files

#### 10.1 Verify Dockerfile.worker Exists

The project should already have `Dockerfile.scraper-worker` in the root directory. If not, create it:

```dockerfile
FROM node:20-alpine

# Install dependencies required for Crawlee and Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/lib/chromium/

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Expose health check port
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Start worker
CMD ["pnpm", "run", "worker:scraper"]
```

**Key Points:**
- Uses Alpine Linux for smaller image size
- Installs Chromium and required fonts
- Health check on port 3001
- Runs `pnpm run worker:scraper` command

#### 10.2 Verify Worker Script

Check that `lib/workers/scraper-worker.ts` has health check endpoint:

```typescript
// At the end of the file:
import http from 'http';

const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      worker: 'scraper-worker',
      queueStatus: 'active'
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

healthServer.listen(3001, () => {
  apiLogger.info('[Scraper Worker] Health check server running on port 3001');
});
```

#### 10.3 Create render.yaml (Optional)

For easier deployment, create `render.yaml` in project root:

```yaml
services:
  - type: worker
    name: goodseed-worker
    env: docker
    dockerfilePath: ./Dockerfile.worker
    dockerContext: .
    region: oregon # Choose: oregon, frankfurt, singapore
    plan: starter # starter ($7/mo) or free (sleeps after 15min)
    branch: main
    
    healthCheckPath: /health
    autoDeploy: true
    
    envVars:
      - key: NODE_ENV
        value: production
      
      - key: DATABASE_URL
        sync: false # Set manually in dashboard
      
      - key: DIRECT_URL
        sync: false
      
      - key: REDIS_HOST
        sync: false
      
      - key: REDIS_PORT
        value: 6379
      
      - key: REDIS_PASSWORD
        sync: false
      
      - key: CRON_SECRET
        sync: false
      
      - key: WORKER_CONCURRENCY
        value: 1
```

---

### Step 11: Deploy to Render

#### 11.1 Create Render Account

```bash
1. Visit: https://render.com/
2. Click "Get Started" → "Sign up with GitHub"
3. Authorize Render to access your GitHub
4. Complete registration
```

#### 11.2 Connect GitHub Repository

```bash
# In Render Dashboard:
1. Click "New +" → "Background Worker"
2. Select "Build and deploy from a Git repository"
3. Connect to GitHub: goodseed-app-vercel
4. Select branch: main (or develop for testing)
5. Click "Connect"
```

#### 11.3 Configure Worker Settings

```yaml
# Worker Configuration:
Name: goodseed-worker
Environment: Docker
Dockerfile Path: ./Dockerfile.worker
Docker Context Path: . (root directory)
Docker Command: (leave empty - uses CMD from Dockerfile)

Region: 
  - Oregon (US West) - recommended for US users
  - Frankfurt (EU) - for European users
  - Singapore (Asia) - for Asian users
  
Plan Selection:
  - Free: $0/month
    • Sleeps after 15min of inactivity ❌ Not recommended
    • 512MB RAM
    • Use only for testing
  
  - Starter: $7/month ✅ Recommended for MVP
    • Always on
    • 512MB RAM
    • Sufficient for moderate scraping
  
  - Standard: $25/month
    • 1GB RAM
    • Better for high-volume scraping
    • Multiple concurrent jobs
```

**Important**: Choose **Starter** or higher for production. Free tier sleeps after 15min inactivity!

#### 11.4 Add Environment Variables

In Render Dashboard → Environment tab, add these variables:

```bash
# ===== CRITICAL: DATABASE =====
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# ===== CRITICAL: REDIS =====
# IMPORTANT: Use hostname only, NO rediss:// prefix
REDIS_HOST=xxx-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# ===== WORKER CONFIGURATION =====
NODE_ENV=production
WORKER_CONCURRENCY=1
SCRAPER_VERBOSE=true

# ===== CHROMIUM (Auto-set by Dockerfile) =====
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# ===== SECURITY =====
CRON_SECRET=your-cron-secret
```

**Critical Notes:**
- ✅ **REDIS_HOST**: Must be hostname only (e.g., `xxx.upstash.io`)
- ❌ **NOT**: `rediss://xxx.upstash.io` or `redis://xxx.upstash.io`
- ✅ Copy exact values from Vercel environment variables
- ✅ Use SAME Redis and Database as main application

#### 11.5 Deploy Worker

```bash
1. Click "Create Background Worker"
2. Wait for build process (5-10 minutes first time)
3. Monitor build logs for:
   - ✓ Dependencies installed
   - ✓ Prisma client generated
   - ✓ Docker image built successfully
   - ✓ Worker started
```

**Expected Build Output:**
```
==> Building image from Dockerfile.worker
==> Installing dependencies with pnpm...
==> Generating Prisma Client...
==> Building Docker image...
==> Starting worker...
[Scraper Worker] Starting worker process...
[Scraper Worker] Worker ready, waiting for jobs...
[Scraper Worker] Health check server running on port 3001
```

---

### Step 12: Verify Worker Deployment

#### 12.1 Check Health Endpoint

```bash
# Get worker URL from Render dashboard
# Example: goodseed-worker.onrender.com

curl https://goodseed-worker.onrender.com/health

# Expected response:
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2026-01-30T12:00:00.000Z",
  "worker": "scraper-worker",
  "queueStatus": "active"
}
```

**If health check fails:**
- Check Render logs for errors
- Verify port 3001 is exposed
- Ensure worker started successfully

#### 12.2 Check Worker Logs

```bash
# In Render Dashboard → Logs tab:

Expected logs:
✓ [Scraper Worker] Starting worker process...
✓ [Redis] Connected to Redis
✓ [Prisma] Database connection established
✓ [Scraper Worker] Worker ready, waiting for jobs...
✓ [Scraper Worker] Health check server running on port 3001

❌ Watch out for:
✗ Redis connection failed
✗ Database connection timeout
✗ Chromium launch failed
```

#### 12.3 Test Scraping Job

Test the worker with a manual scraping job:

```bash
# Step 1: In your main app (Vercel)
1. Go to: https://your-app.vercel.app/dashboard/admin/sellers
2. Click on a seller
3. Click "Trigger Manual Scrape"

# Step 2: Check Render worker logs
- Look for: "[INFO WORKER] Starting job..."
- Monitor progress logs
- Verify: "[INFO WORKER] Job completed successfully"

# Step 3: Check results
- Go back to admin dashboard
- Check scrape job status changed to "COMPLETED"
- Verify products were saved to database
```

#### 12.4 Update Main Application

After successful worker deployment, update Vercel environment variable:

```bash
# In Vercel → Settings → Environment Variables:
WORKER_HEALTH_URL=https://goodseed-worker.onrender.com/health

# Redeploy Vercel to apply changes
```

---

### Step 13: Worker Monitoring & Maintenance

#### 13.1 Set Up Health Monitoring

**Option A: UptimeRobot (Free)**
```bash
1. Visit: https://uptimerobot.com/
2. Create account
3. Add new monitor:
   Type: HTTP(s)
   URL: https://goodseed-worker.onrender.com/health
   Interval: 5 minutes
   Alert contacts: your-email@example.com
```

**Option B: Render Built-in Monitoring**
```bash
# In Render Dashboard:
1. Go to worker → Metrics
2. View:
   - CPU usage
   - Memory usage
   - Response time
   - Health check status
```

#### 13.2 Monitor Key Metrics

**Resource Usage:**
- **Memory**: Should stay < 80% (upgrade if consistently high)
- **CPU**: Should average < 50% (spikes are normal during scraping)
- **Network**: Monitor bandwidth usage

**Job Processing:**
- **Jobs completed per hour**: Track throughput
- **Average job duration**: Should be consistent (5-15 minutes)
- **Failed jobs rate**: Should be < 5%
- **Queue wait time**: Should be < 5 minutes

**Health Status:**
- **Uptime**: Target 99.9%
- **Health check response**: Should be < 100ms
- **Last restart**: Track unexpected restarts

#### 13.3 Common Issues & Solutions

**Issue: Worker Keeps Restarting**
```bash
Causes:
- Out of memory (upgrade to Standard plan)
- Unhandled errors in worker code
- Database connection issues

Debug:
1. Check Render logs for crash reason
2. Look for "SIGKILL" or "OOM" messages
3. Upgrade plan if memory-related
```

**Issue: Jobs Not Processing**
```bash
Causes:
- Redis connection failed
- Worker crashed
- Queue not connected

Solutions:
1. Verify REDIS_HOST has no prefix
2. Check worker logs for connection errors
3. Restart worker in Render dashboard
4. Test Redis connection:
   curl https://goodseed-worker.onrender.com/health
```

**Issue: Chromium Launch Failed**
```bash
Error: "Failed to launch the browser process"

Solutions:
1. Verify all dependencies in Dockerfile:
   - chromium
   - nss
   - freetype
   - harfbuzz
2. Check PUPPETEER_EXECUTABLE_PATH is set
3. Rebuild worker with:
   Manual Deploy → Clear build cache
```

**Issue: High Memory Usage**
```bash
Symptoms:
- Memory usage > 80%
- Worker restarts frequently
- Jobs fail with OOM errors

Solutions:
1. Upgrade to Standard plan (1GB RAM)
2. Reduce concurrency:
   WORKER_CONCURRENCY=1
3. Add memory limit:
   NODE_OPTIONS=--max-old-space-size=512
4. Optimize scraping code
```

---

### Step 14: Worker Scaling (Optional)

When you need to handle more scraping volume:

#### 14.1 Vertical Scaling (Upgrade Plan)

```bash
Plans comparison:
- Starter: $7/mo, 512MB RAM → ~5-10 jobs/hour
- Standard: $25/mo, 1GB RAM → ~20-30 jobs/hour
- Pro: $85/mo, 4GB RAM → ~50+ jobs/hour

When to upgrade:
- Jobs waiting > 5 minutes regularly
- Memory usage consistently > 80%
- Need faster processing
```

#### 14.2 Horizontal Scaling (Multiple Workers)

```bash
# Deploy multiple workers for parallel processing:

1. Create worker-2:
   - Same configuration as worker-1
   - Different name: goodseed-worker-2
   - Same Redis connection

2. Create worker-3, worker-4, etc.

Benefits:
- Process jobs in parallel
- Higher throughput
- Redundancy if one worker fails

Cost: $7/month per worker (Starter plan)
```

#### 14.3 Load Balancing

```bash
# Workers automatically load balance via Redis queue:
- Bull queue distributes jobs evenly
- Each worker processes one job at a time
- No additional configuration needed

Example with 3 workers:
- Worker 1: Processing seller A
- Worker 2: Processing seller B
- Worker 3: Processing seller C
- Total: 3x faster processing
```

---

## Phase 5: Monitoring Setup (15 minutes)

### Step 11: Configure Sentry (Optional but Recommended)

#### 11.1 Create Sentry Account
```bash
1. Visit: https://sentry.io/
2. Sign up with GitHub
3. Create organization and project
```

#### 11.2 Install Sentry
```bash
# In your project:
pnpm add @sentry/nextjs

# Run wizard:
npx @sentry/wizard@latest -i nextjs
```

#### 11.3 Add to Environment Variables
```bash
# In Vercel:
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-organization
SENTRY_PROJECT=goodseed-app
```

---

## Phase 6: Testing & Verification (30 minutes)

### Step 12: Comprehensive Testing

#### 12.1 Functional Testing
```bash
# Test these features:
□ Homepage loads correctly
□ User registration works
□ Email verification received
□ User login successful
□ Product listing displays
□ Search functionality works
□ Product details page loads
□ Admin dashboard accessible (if admin)
□ Manual scraping trigger works
□ Job status updates correctly
```

#### 12.2 Performance Testing
```bash
# Use tools:
1. Google PageSpeed Insights: https://pagespeed.web.dev/
   Target: > 90 score

2. WebPageTest: https://www.webpagetest.org/
   Target: < 2s load time

3. Vercel Analytics (in dashboard)
   Monitor: Core Web Vitals
```

#### 12.3 Security Testing
```bash
# Verify:
□ HTTPS enabled (automatic with Vercel)
□ Environment variables not exposed
□ API routes protected
□ CORS configured correctly
□ Rate limiting works
□ Authentication enforced
```

#### 12.4 Email Testing
```bash
# Test emails:
□ Registration email received
□ Password reset works
□ Notification emails sent
□ Email formatting correct
□ Links in emails work
```

---

## Phase 7: Post-Deployment (Ongoing)

### Step 13: Monitoring & Maintenance

#### 13.1 Set Up Alerts
```bash
# Vercel:
1. Go to Project Settings → Notifications
2. Enable:
   - Deployment failures
   - Build errors
   - Performance issues

# Sentry:
1. Configure alert rules
2. Set up Slack/email notifications

# Uptime Monitoring:
Consider: UptimeRobot, Pingdom, or StatusPage
```

#### 13.2 Regular Maintenance Tasks
```bash
# Daily:
- Check error logs (Sentry)
- Monitor scraping jobs
- Review email delivery rates

# Weekly:
- Check database size (Neon console)
- Review Redis usage (Upstash console)
- Analyze performance (Vercel Analytics)
- Update dependencies

# Monthly:
- Review costs
- Optimize database queries
- Clean up old data
- Update documentation
```

---

## Troubleshooting Common Issues

### Issue: Build Fails on Vercel
```bash
# Check build logs in Vercel dashboard
# Common causes:
1. Missing environment variables
2. Prisma client not generated
3. TypeScript errors
4. Missing dependencies

# Solutions:
- Add "postinstall": "prisma generate" to package.json
- Fix TypeScript errors locally first
- Verify all env vars are set
```

### Issue: Database Connection Fails
```bash
# Verify:
1. Connection string format correct
2. Database not paused (Neon auto-suspends)
3. SSL mode included: ?sslmode=require
4. Correct credentials

# Test connection locally:
npx prisma db push
```

### Issue: Redis Connection Timeout
```bash
# Check:
1. Redis host/port/password correct
2. TLS enabled (required for Upstash)
3. Network connectivity
4. Redis not hitting limits

# Test:
node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL); r.ping().then(console.log);"
```

### Issue: Emails Not Sending
```bash
# Verify:
1. RESEND_API_KEY is correct
2. Domain is verified (if using custom domain)
3. Email address format correct
4. Not hitting rate limits

# Check Resend dashboard for:
- Delivery status
- Bounce/spam rates
- Error messages
```

### Issue: Worker Not Processing Jobs
```bash
# Check:
1. Worker is running (Render logs)
2. Redis connection successful
3. Environment variables set correctly
4. Worker not crashed

# Debug:
- Check Render logs
- Verify job added to queue
- Test worker locally
```

---

## Rollback Procedure

If deployment has critical issues:

### Quick Rollback
```bash
# In Vercel Dashboard:
1. Go to Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"
4. Confirm rollback
```

### Database Rollback
```bash
# In Neon Console:
1. Go to "Restore"
2. Select point in time
3. Create branch from backup
4. Update DATABASE_URL to new branch
5. Redeploy with new connection string
```

---

## Success Checklist

Before considering deployment complete:

- [ ] Application accessible at production URL
- [ ] Database connected and migrations run
- [ ] Redis queue working
- [ ] Email service sending emails
- [ ] Authentication working (all providers)
- [ ] Admin panel accessible
- [ ] Scraping functionality working
- [ ] Cron jobs configured (or alternative)
- [ ] Worker deployed (if using separate service)
- [ ] Monitoring/alerts configured
- [ ] Performance targets met
- [ ] Security checklist completed
- [ ] Backup strategy in place
- [ ] Documentation updated
- [ ] Team trained on deployment process

---

## Cost Summary

### Estimated Monthly Costs

**Demo/MVP** (Free Tier):
```
Vercel Hobby:     $0
Neon Free:        $0
Upstash Free:     $0
Resend Free:      $0
Total:            $0/month
```

**Production** (Recommended):
```
Vercel Pro:       $20/month
Neon Launch:      $19/month
Upstash:          $10/month
Resend Pro:       $20/month
Sentry Team:      $26/month
Worker (Render):  $7/month
Total:            $102/month
```

**Enterprise**:
```
Vercel Enterprise: $300+/month
Neon Scale:        $69/month
Upstash Pro:       $50/month
Resend Business:   $80/month
Sentry Business:   $99/month
Workers:           $50+/month
Total:             $648+/month
```

---

## Next Steps

After successful deployment:

1. **Documentation**: Update README with production URLs
2. **Team Training**: Train team on deployment process
3. **Monitoring**: Set up regular monitoring routines
4. **Optimization**: Identify and fix performance bottlenecks
5. **Scaling**: Plan for traffic growth
6. **Backups**: Verify backup procedures work
7. **Security**: Schedule security audits
8. **Compliance**: Ensure regulatory compliance

---

## Support

Need help? Check these resources:

- **Documentation**: See other files in `docs/infrastructure(v2)/`
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Service Docs**: Individual service documentation files

---
