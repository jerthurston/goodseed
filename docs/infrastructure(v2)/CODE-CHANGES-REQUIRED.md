# Required Code Changes for Vercel Deployment

## Overview
These changes adapt the AWS-based architecture to work with Vercel's serverless environment and free tier services.

---

## 1. Create Dockerfile for Render Worker

**File**: `Dockerfile.worker`

```dockerfile
FROM node:20-alpine

# Install system dependencies for Crawlee/Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Set environment variables for Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/lib/chromium/

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install production dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript (if needed)
RUN pnpm build || echo "No build script"

# Expose health check port (optional)
EXPOSE 3001

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start worker
CMD ["pnpm", "run", "worker:scraper"]
```

---

## 2. Add Health Check to Worker

**File**: `lib/workers/scraper-worker-health.ts` (NEW)

```typescript
import http from 'http';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Health check server for Render
 * Keeps worker alive and allows monitoring
 */
const PORT = process.env.HEALTH_CHECK_PORT || 3001;

export function startHealthCheckServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'healthy', 
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        worker: 'scraper-worker'
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

**Update**: `lib/workers/scraper-worker.ts`

Add at the top of the file:

```typescript
import { startHealthCheckServer } from './scraper-worker-health';

// Start health check server
const healthServer = startHealthCheckServer();

// Cleanup on exit
process.on('SIGTERM', () => {
  apiLogger.info('[Scraper Worker] SIGTERM received, shutting down...');
  healthServer.close();
  process.exit(0);
});
```

---

## 3. Update Redis Connection for Serverless

**File**: `lib/queue/scraper-queue.ts`

Add retry logic and better error handling:

```typescript
import Bull, { Queue, QueueOptions } from 'bull';
import { apiLogger } from '../helpers/api-logger';
import { ScrapeJobConfig } from '@/types/scrapeJob.type';

// Redis connection configuration with fallbacks
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

// Upstash specific settings
const IS_UPSTASH = REDIS_HOST.includes('upstash.io');

const queueOptions: QueueOptions = {
  redis: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    // Upstash requires these settings
    tls: IS_UPSTASH ? {} : undefined,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    connectTimeout: 30000,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      apiLogger.warn(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
  limiter: {
    // Reduced for free tier to avoid hitting limits
    max: 10,        // Max 10 jobs per minute (was 30)
    duration: 60000,
  },
  settings: {
    // Increased timeouts for free tier cold starts
    stalledInterval: 60000,  // Check for stalled jobs every 60s (was 30s)
    maxStalledCount: 2,      // More lenient for cold starts
  }
};

export const scraperQueue: Queue<ScraperJobData> = new Bull('scraper-queue', queueOptions);

// Enhanced error handlers
scraperQueue.on('error', (error) => {
  apiLogger.logError('[Scraper Queue] Error:', { error: error.message });
});

scraperQueue.on('waiting', (jobId) => {
  apiLogger.info(`[Scraper Queue] Job ${jobId} is waiting`);
});

scraperQueue.on('active', (job) => {
  apiLogger.info(`[Scraper Queue] Job ${job.id} started processing`);
});

scraperQueue.on('stalled', (job) => {
  apiLogger.warn(`[Scraper Queue] Job ${job.id} stalled - likely worker cold start`, {
    jobData: job.data,
  });
});

scraperQueue.on('failed', (job, error) => {
  apiLogger.logError(`[Scraper Queue] Job ${job?.id} failed:`, { 
    error: error.message,
    jobData: job?.data 
  });
});

scraperQueue.on('completed', (job, result) => {
  apiLogger.info(`[Scraper Queue] Job ${job.id} completed successfully`, {
    duration: Date.now() - job.processedOn!,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  apiLogger.info('[Scraper Queue] Closing queue...');
  await scraperQueue.close();
});

export interface ScraperJobData {
  jobId: string;
  sellerId: string;
  scrapingSources: Array<{
    scrapingSourceUrl: string;
    scrapingSourceName: string;
    maxPage: number;
  }>;
  config: ScrapeJobConfig;
}

export interface RepeatJobOptions {
  repeat: {
    cron?: string;
    every?: number;
    startDate?: Date | string | number;
    endDate?: Date | string | number;
    limit?: number;
  };
  jobId?: string;
}
```

---

## 4. Create External Cron Trigger API Route

**File**: `app/api/cron/trigger/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * External Cron Trigger Endpoint
 * Used by Cron-job.org or GitHub Actions to trigger scraping
 * 
 * Usage: GET /api/cron/trigger?secret=YOUR_SECRET&action=scrape
 */
export async function GET(request: NextRequest) {
  try {
    // Verify secret
    const secret = request.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      apiLogger.logError('[Cron Trigger] CRON_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    if (secret !== expectedSecret) {
      apiLogger.warn('[Cron Trigger] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get action
    const action = request.nextUrl.searchParams.get('action') || 'scrape';

    apiLogger.info(`[Cron Trigger] Triggered action: ${action}`);

    // Trigger the actual cron job
    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
    const cronUrl = `${baseUrl}/api/cron/scraper`;

    const response = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Cron-Trigger',
        'X-Cron-Secret': expectedSecret,
      },
    });

    if (!response.ok) {
      throw new Error(`Cron job failed: ${response.statusText}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      action,
      result,
      triggeredAt: new Date().toISOString(),
    });

  } catch (error: any) {
    apiLogger.logError('[Cron Trigger] Failed:', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to trigger cron job', details: error.message },
      { status: 500 }
    );
  }
}

// Support POST as well
export async function POST(request: NextRequest) {
  return GET(request);
}
```

---

## 5. Create Worker Keep-Alive Endpoint

**File**: `app/api/health/worker/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Worker Health Check & Keep-Alive
 * Pings Render worker to prevent auto-sleep
 * 
 * Usage: GET /api/health/worker
 */
export async function GET() {
  try {
    const workerUrl = process.env.WORKER_HEALTH_URL;

    if (!workerUrl) {
      return NextResponse.json({
        status: 'unknown',
        message: 'WORKER_HEALTH_URL not configured',
      });
    }

    // Ping worker
    const startTime = Date.now();
    const response = await fetch(workerUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Vercel-Health-Check',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    if (response.ok) {
      apiLogger.info(`[Worker Health] Worker healthy, response time: ${responseTime}ms`);
      return NextResponse.json({
        status: 'healthy',
        worker: data,
        responseTime,
        checkedAt: new Date().toISOString(),
      });
    } else {
      throw new Error('Worker responded with error');
    }

  } catch (error: any) {
    apiLogger.warn('[Worker Health] Worker unreachable (may be sleeping):', {
      error: error.message,
    });

    return NextResponse.json({
      status: 'sleeping',
      message: 'Worker is sleeping (free tier), will wake up on next job',
      error: error.message,
      checkedAt: new Date().toISOString(),
    }, { status: 503 });
  }
}
```

---

## 6. Update Environment Variables Template

**File**: `.env.example`

```bash
# ==================================
# FREE TIER DEPLOYMENT CONFIGURATION
# ==================================

# Database - Neon PostgreSQL (Free Tier)
# Get from: https://neon.tech/
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"

# Redis - Upstash (Free Tier)
# Get from: https://upstash.com/
REDIS_HOST="xxx.upstash.io"
REDIS_PORT="6379"
REDIS_PASSWORD="your-password-here"

# NextAuth Configuration
# Generate with: openssl rand -base64 32
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-secret-here"
AUTH_URL="https://your-app.vercel.app"

# Cron Job Security
# Generate with: openssl rand -base64 32
CRON_SECRET="your-cron-secret-here"

# Worker Health Check (Render)
# Format: https://your-worker.onrender.com/health
WORKER_HEALTH_URL="https://goodseed-worker.onrender.com/health"

# Email Configuration (Optional for demo)
EMAIL_SERVER_USER=""
EMAIL_SERVER_PASSWORD=""
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_FROM="noreply@yourapp.com"

# Environment
NODE_ENV="production"

# Optional: Vercel Blob Storage
# BLOB_READ_WRITE_TOKEN=""
```

---

## 7. Add Render-Specific Scripts

**File**: `package.json`

Update scripts section:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "type-check": "tsc --noEmit",
    
    "# Production Scripts": "",
    "cron:start": "tsx scripts/cron/cron-server.ts",
    "db:seed:dispensaries": "tsx scripts/seed-dispensaries.ts",
    
    "# Worker Scripts": "",
    "worker:scraper": "tsx lib/workers/scraper-worker.ts",
    "worker:health": "tsx lib/workers/scraper-worker-health.ts",
    
    "# Deployment": "",
    "deploy:worker": "docker build -f Dockerfile.worker -t goodseed-worker .",
    "postinstall": "prisma generate"
  }
}
```

---

## 8. GitHub Actions for Cron (Alternative to Cron-job.org)

**File**: `.github/workflows/scheduled-scraping.yml` (NEW)

```yaml
name: Scheduled Scraping Jobs

on:
  schedule:
    # Daily at 2 AM UTC
    - cron: '0 2 * * *'
  # Manual trigger
  workflow_dispatch:
    inputs:
      action:
        description: 'Action to perform'
        required: false
        default: 'scrape'

jobs:
  trigger-scraping:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Daily Scraping
        run: |
          curl -f -X GET "${{ secrets.APP_URL }}/api/cron/trigger?secret=${{ secrets.CRON_SECRET }}&action=scrape" \
            || echo "Scraping trigger failed"

  cleanup-jobs:
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup Stuck Jobs
        run: |
          curl -f -X GET "${{ secrets.APP_URL }}/api/cron/cleanup?secret=${{ secrets.CRON_SECRET }}" \
            || echo "Cleanup trigger failed"

  keep-worker-alive:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Worker
        run: |
          curl -f "${{ secrets.WORKER_HEALTH_URL }}" \
            || echo "Worker is sleeping (expected on free tier)"
```

**Required GitHub Secrets**:
- `APP_URL`: https://your-app.vercel.app
- `CRON_SECRET`: Your cron secret
- `WORKER_HEALTH_URL`: https://your-worker.onrender.com/health

---

## 9. Vercel Configuration

**File**: `vercel.json`

```json
{
  "buildCommand": "pnpm run build",
  "devCommand": "pnpm run dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/:path*",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

---

## 10. Update Prisma Configuration for Neon

**File**: `prisma/schema.prisma`

Ensure this configuration:

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ... rest of schema
```

---

## Summary of Changes

### New Files:
1. ✅ `Dockerfile.worker` - Worker container for Render
2. ✅ `lib/workers/scraper-worker-health.ts` - Health check server
3. ✅ `app/api/cron/trigger/route.ts` - External cron trigger
4. ✅ `app/api/health/worker/route.ts` - Worker keep-alive
5. ✅ `.github/workflows/scheduled-scraping.yml` - GitHub Actions cron
6. ✅ `vercel.json` - Vercel configuration
7. ✅ `.env.example` - Updated environment template

### Modified Files:
1. ✅ `lib/queue/scraper-queue.ts` - Better error handling, Upstash support
2. ✅ `lib/workers/scraper-worker.ts` - Add health check server
3. ✅ `package.json` - Add deployment scripts

### Configuration Changes:
1. ✅ Environment variables for Neon, Upstash, Render
2. ✅ Redis connection with TLS for Upstash
3. ✅ Reduced rate limits for free tier
4. ✅ Better retry logic

---

## Testing Locally

```bash
# 1. Copy .env.example to .env.local
cp .env.example .env.local

# 2. Fill in credentials from Neon and Upstash

# 3. Test database connection
npx prisma db push

# 4. Test Redis connection
npm run test:redis

# 5. Run development server
npm run dev

# 6. Test worker locally
npm run worker:scraper

# 7. Test health endpoint
curl http://localhost:3001/health
```

---

## Next Steps

1. ✅ Create all new files listed above
2. ✅ Update modified files
3. ✅ Test locally
4. ✅ Commit and push to GitHub
5. ✅ Deploy to Vercel
6. ✅ Deploy to Render
7. ✅ Configure external cron
8. ✅ Test end-to-end

Ready to implement? Let me know which files to create first!
