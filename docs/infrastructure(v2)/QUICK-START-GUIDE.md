# Quick Start Guide - Free Deployment

## 🚀 Deploy in 1 Hour

### Prerequisites
- GitHub account
- Domain (optional)
- 1 hour of your time

---

## Step-by-Step Instructions

### 1️⃣ Setup Neon PostgreSQL (10 minutes)

```bash
# 1. Sign up at https://neon.tech/
# 2. Create new project
Project Name: goodseed-demo
Region: Choose closest to your users (US East, EU West, Asia)
Postgres Version: 16 (latest)

# 3. Copy connection string
# Format: postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# 4. Save to local .env.local for testing
DATABASE_URL="your-connection-string"
DIRECT_URL="your-connection-string"
```

**Test Connection**:
```bash
npx prisma db push
```

---

### 2️⃣ Setup Upstash Redis (5 minutes)

```bash
# 1. Sign up at https://upstash.com/
# 2. Create Redis database
Name: goodseed-queue
Region: Same as Neon (for low latency)
Type: Regional (not global for free tier)

# 3. Copy credentials from "Details" tab
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=xxx

# 4. Add to .env.local
```

**Test Connection**:
```bash
# Create test file: test-redis.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT!),
  password: process.env.REDIS_PASSWORD,
});

redis.ping().then(() => {
  console.log('✅ Redis connected');
  redis.quit();
});
```

Run: `tsx test-redis.ts`

---

### 3️⃣ Deploy to Vercel (10 minutes)

```bash
# 1. Install Vercel CLI (optional)
npm i -g vercel

# 2. Or use Vercel Dashboard:
# Go to https://vercel.com/new

# 3. Import GitHub repository
Repository: goodseed-app-vercel
Framework: Next.js
Root Directory: ./

# 4. Configure Build Settings
Build Command: npm run build
Output Directory: .next
Install Command: npm install

# 5. Add Environment Variables
# Copy from section below

# 6. Deploy!
```

**Environment Variables for Vercel**:
```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Redis
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=xxx

# Auth
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=run: openssl rand -base64 32
AUTH_URL=https://your-app.vercel.app

# Security
CRON_SECRET=run: openssl rand -base64 32

# Email (optional for demo)
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_FROM=noreply@yourapp.com

# Node
NODE_ENV=production
```

---

### 4️⃣ Run Database Migrations (5 minutes)

```bash
# After Vercel deployment completes:

# 1. Make sure DATABASE_URL points to Neon in .env.local

# 2. Generate Prisma Client
npx prisma generate

# 3. Push schema to Neon
npx prisma db push

# Or run migrations
npx prisma migrate deploy

# 4. Seed initial data (optional)
npx tsx scripts/seed-initial-data.ts
```

---

### 5️⃣ Setup Render Worker (15 minutes)

```bash
# 1. Create Dockerfile.worker (already provided below)

# 2. Go to https://render.com/
# 3. Create "Background Worker"

Service Name: goodseed-worker
Environment: Docker
Branch: main
Dockerfile Path: ./Dockerfile.worker

# 4. Add same environment variables as Vercel

# 5. Deploy
```

**Dockerfile.worker**:
```dockerfile
FROM node:20-alpine

# Install Chromium for Crawlee
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start worker
CMD ["pnpm", "run", "worker:scraper"]
```

---

### 6️⃣ Setup External Cron (10 minutes)

Since Vercel Free doesn't have cron, use external service:

#### Option A: Cron-job.org (Recommended)

```bash
# 1. Sign up at https://cron-job.org/
# 2. Create cron jobs:

Job 1: Daily Scraping
URL: https://your-app.vercel.app/api/cron/trigger?secret=YOUR_CRON_SECRET
Schedule: 0 2 * * * (2 AM daily)
Method: GET

Job 2: Cleanup Stuck Jobs
URL: https://your-app.vercel.app/api/cron/cleanup?secret=YOUR_CRON_SECRET
Schedule: */30 * * * * (Every 30 min)
Method: GET

Job 3: Keep Render Worker Alive
URL: https://your-worker.onrender.com/health
Schedule: */10 * * * * (Every 10 min)
Method: GET
```

#### Option B: GitHub Actions (Alternative)

Create `.github/workflows/cron-jobs.yml`:
```yaml
name: Scheduled Jobs

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:  # Manual trigger

jobs:
  trigger-scraping:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Scraping
        run: |
          curl -X GET "https://your-app.vercel.app/api/cron/trigger?secret=${{ secrets.CRON_SECRET }}"
```

---

### 7️⃣ Test Everything (10 minutes)

```bash
# 1. Test API health
curl https://your-app.vercel.app/api/health

# 2. Test authentication
# Visit: https://your-app.vercel.app/auth/signin

# 3. Test manual scraping
# Login as admin → Go to dashboard → Trigger scrape manually

# 4. Check worker logs in Render dashboard

# 5. Check database in Neon console

# 6. Check Redis in Upstash console
```

---

## 🎯 Post-Deployment Checklist

- [ ] Vercel deployment successful
- [ ] Can access https://your-app.vercel.app
- [ ] Database connected (check Neon dashboard)
- [ ] Redis connected (check Upstash dashboard)
- [ ] Render worker running (check logs)
- [ ] Can login with test account
- [ ] Manual scrape works
- [ ] Cron jobs configured
- [ ] All API routes working
- [ ] No errors in Vercel logs

---

## 🔧 Troubleshooting

### Issue: "Database connection failed"
```bash
# Check DATABASE_URL format
# Must include ?sslmode=require for Neon

# Test with Prisma Studio
npx prisma studio
```

### Issue: "Redis connection timeout"
```bash
# Check firewall/network
# Upstash requires TLS

# Test connection
npm install ioredis
node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL); r.ping().then(console.log);"
```

### Issue: "Worker not processing jobs"
```bash
# Check Render logs
# Common issues:
# 1. Worker sleeping (expected on free tier)
# 2. Missing environment variables
# 3. Prisma client not generated

# Force wake up
curl https://your-worker.onrender.com/health
```

### Issue: "Vercel function timeout"
```bash
# Free tier has 10s timeout
# Make sure heavy work is in worker, not API routes

# Check which route is timing out
# Move to background job if needed
```

---

## 📊 Monitor Your Demo

### Daily Checks:
1. **Vercel Dashboard**: Check function invocations, bandwidth
2. **Neon Console**: Check storage usage, connections
3. **Upstash Dashboard**: Check daily commands count
4. **Render Logs**: Check worker health, errors

### Before Demo:
1. Wake up Render worker (visit health endpoint)
2. Check all services are green
3. Test login flow
4. Pre-load some product data
5. Clear browser cache

---

## 🎬 Demo Flow

### 1. Homepage (30 seconds)
- Show product listings
- Demonstrate search
- Show filters working

### 2. Product Detail (30 seconds)
- Click on a product
- Show product details
- Show seller information

### 3. Admin Dashboard (2 minutes)
- Login as admin
- Show scraping jobs list
- Trigger manual scrape
- Show job queue in real-time
- Show logs

### 4. Features Highlight (1 minute)
- Show responsive design
- Show authentication
- Show data freshness

---

## 🚀 Quick Commands Reference

```bash
# Local development
npm run dev

# Build locally
npm run build

# Run worker locally
npm run worker:scraper

# Database commands
npx prisma studio          # Open database GUI
npx prisma db push         # Push schema changes
npx prisma migrate deploy  # Run migrations

# Deploy
git push origin main       # Auto-deploys to Vercel & Render

# Generate secrets
openssl rand -base64 32    # For NEXTAUTH_SECRET, CRON_SECRET
```

---

## 📞 Support Resources

- **Vercel Support**: https://vercel.com/support
- **Neon Docs**: https://neon.tech/docs
- **Upstash Discord**: https://upstash.com/discord
- **Render Support**: https://render.com/docs/support

---

## ✅ Success Criteria

Your demo is ready when:
- ✅ Homepage loads in < 2 seconds
- ✅ Can login as admin
- ✅ Can trigger manual scrape
- ✅ Worker processes jobs (may take 30s cold start)
- ✅ Product data displays correctly
- ✅ No console errors
- ✅ Mobile responsive

---

## 🎉 You're Done!

Deployment complete! Your free demo is now live at:
**https://your-app.vercel.app**

Time to demo to customers! 🚀

**Next Steps**:
1. Share demo link with customers
2. Gather feedback
3. Plan paid tier upgrade based on traction
4. Scale as you grow

---

## 💰 Cost After Free Credits Run Out

If demo succeeds and you need to upgrade:

**Minimum Production Setup** (~$50/month):
- Vercel Pro: $20/month (cron, longer timeouts)
- Neon Launch: $19/month (10GB, better performance)
- Upstash: $10/month (unlimited commands)
- Render: $7/month (always-on worker)

**Total**: ~$56/month for production-grade infrastructure

But for demo: **$0/month** ✅
