# Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered during deployment and operation of the GoodSeed Cannabis App.

**Target Audience**: Developers and DevOps engineers troubleshooting production issues

---

## Table of Contents

1. [Deployment Issues](#deployment-issues)
2. [Database Issues](#database-issues)
3. [Redis/Queue Issues](#redisqueue-issues)
4. [Email Issues](#email-issues)
5. [Worker Issues](#worker-issues)
6. [Authentication Issues](#authentication-issues)
7. [Performance Issues](#performance-issues)
8. [Monitoring & Debugging](#monitoring--debugging)

---

## Deployment Issues

### Issue: Vercel Build Fails

#### Symptom
```
Error: Build failed with exit code 1
```

#### Common Causes & Solutions

**1. Prisma Client Not Generated**
```bash
# Error in logs:
Cannot find module '@prisma/client'

# Solution: Add postinstall script
# package.json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}

# Commit and redeploy
git add package.json
git commit -m "Add Prisma postinstall script"
git push origin main
```

**2. TypeScript Compilation Errors**
```bash
# Error in logs:
Type error: Cannot find name 'X'

# Solution: Fix TypeScript errors locally first
npm run build

# Check for errors
npm run type-check

# Fix all errors before deploying
```

**3. Missing Environment Variables**
```bash
# Error in logs:
Error: DATABASE_URL is not defined

# Solution: Check Vercel environment variables
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Verify all required variables are set
3. Ensure variables are enabled for Production, Preview, Development
4. Redeploy after adding variables
```

**4. Out of Memory During Build**
```bash
# Error in logs:
JavaScript heap out of memory

# Solution: Optimize build process
# next.config.ts
export default {
  experimental: {
    turbo: true, // Use Turbopack
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

# Or increase Node memory (in package.json)
"scripts": {
  "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
}
```

---

### Issue: Deployment Succeeds but App Returns 500 Error

#### Symptom
```
Application Error: 500 Internal Server Error
```

#### Common Causes & Solutions

**1. Database Connection Failed**
```bash
# Check Vercel function logs
Dashboard → Deployments → [Latest] → Functions

# Look for error:
Error: Connection refused

# Solution:
1. Verify DATABASE_URL in environment variables
2. Ensure Neon database is not paused
3. Check connection string format:
   postgresql://user:pass@host/db?sslmode=require
4. Test connection locally:
   npx prisma db push
```

**2. Redis Connection Failed**
```bash
# Error in logs:
Error: Redis connection timeout

# Solution:
1. Verify REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
2. Ensure Upstash Redis is active
3. Check TLS is enabled
4. Test connection:
```

```typescript
// test-redis.ts
import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT!),
  password: process.env.REDIS_PASSWORD,
  tls: {},
});

redis.ping().then(() => {
  console.log('✅ Redis connected');
  process.exit(0);
}).catch((err) => {
  console.error('❌ Redis connection failed:', err);
  process.exit(1);
});
```

**3. Environment Variable Missing**
```bash
# Solution: Check all required variables are set
# See ENVIRONMENT-SETUP.md for complete list

# Critical variables:
DATABASE_URL
NEXTAUTH_SECRET
AUTH_SECRET
NEXTAUTH_URL
```

---

### Issue: Changes Not Reflecting After Deployment

#### Symptom
Old code still running after new deployment

#### Solutions

**1. Clear Vercel Cache**
```bash
# In Vercel Dashboard:
Project Settings → General → Clear Build Cache
Click "Clear" → Redeploy
```

**2. Force Browser Cache Refresh**
```bash
# Hard refresh in browser:
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R

# Or clear browser cache completely
```

**3. Verify Correct Branch Deployed**
```bash
# Check deployment details
Dashboard → Deployments → Latest
Verify: Branch, Commit hash, Timestamp

# Ensure main branch is production branch
Settings → Git → Production Branch: main
```

---

## Database Issues

### Issue: Database Connection Timeout

#### Symptom
```
Error: Connection timed out
```

#### Solutions

**1. Neon Database Suspended**
```bash
# Neon free tier auto-suspends after 5 minutes inactivity

# Solution: Wake up database
1. Visit Neon Console
2. Click on project
3. Database should wake up automatically
4. Or trigger wake-up:
   curl "https://console.neon.tech/api/v2/projects/YOUR_PROJECT/wake"

# Permanent solution: Upgrade to paid tier (no auto-suspend)
```

**2. Connection Pool Exhausted**
```bash
# Error: Too many connections

# Solution: Use connection pooling
# DATABASE_URL should use pooled connection
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true"

# In prisma.config.ts
export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

# Adjust connection limit in Prisma
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error'],
})
```

**3. SSL/TLS Issues**
```bash
# Error: SSL connection error

# Solution: Ensure sslmode in connection string
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Not sslmode=disable or missing sslmode
```

---

### Issue: Slow Database Queries

#### Symptom
API responses taking >2 seconds

#### Solutions

**1. Missing Database Indexes**
```sql
-- Check slow queries in Neon Console
-- Add indexes for frequently queried fields

-- Products by seller
CREATE INDEX idx_products_seller_id ON "Product"("sellerId");

-- Products by created date
CREATE INDEX idx_products_created_at ON "Product"("createdAt");

-- Products by status
CREATE INDEX idx_products_status ON "Product"("status");

-- Scrape jobs by status
CREATE INDEX idx_scrapejobs_status ON "ScrapeJob"("status");

-- Scrape jobs by created date
CREATE INDEX idx_scrapejobs_created_at ON "ScrapeJob"("createdAt");

-- Users by email (if not already)
CREATE INDEX idx_users_email ON "User"("email");

-- Composite indexes for common queries
CREATE INDEX idx_products_seller_status ON "Product"("sellerId", "status");
```

**2. N+1 Query Problem**
```typescript
// ❌ Bad: N+1 queries
const products = await prisma.product.findMany();
for (const product of products) {
  const seller = await prisma.seller.findUnique({
    where: { id: product.sellerId },
  });
}

// ✅ Good: Single query with include
const products = await prisma.product.findMany({
  include: {
    seller: true,
  },
});

// ✅ Better: Select only needed fields
const products = await prisma.product.findMany({
  select: {
    id: true,
    name: true,
    price: true,
    seller: {
      select: {
        id: true,
        name: true,
      },
    },
  },
});
```

**3. Large Result Sets**
```typescript
// ❌ Bad: Fetch all records
const products = await prisma.product.findMany();

// ✅ Good: Use pagination
const products = await prisma.product.findMany({
  take: 20,
  skip: page * 20,
  orderBy: { createdAt: 'desc' },
});

// ✅ Better: Use cursor-based pagination
const products = await prisma.product.findMany({
  take: 20,
  cursor: lastId ? { id: lastId } : undefined,
  skip: lastId ? 1 : 0,
  orderBy: { id: 'asc' },
});
```

**4. Run VACUUM ANALYZE**
```sql
-- In Neon SQL Editor:
VACUUM ANALYZE;

-- Or per table:
VACUUM ANALYZE "Product";
VACUUM ANALYZE "ScrapeJob";
```

---

### Issue: Database Storage Full

#### Symptom
```
Error: Database storage limit exceeded
```

#### Solutions

**1. Clean Up Old Data**
```sql
-- Delete old scrape jobs (older than 30 days)
DELETE FROM "ScrapeJob" 
WHERE "createdAt" < NOW() - INTERVAL '30 days'
AND "status" IN ('COMPLETED', 'FAILED');

-- Delete old notifications
DELETE FROM "Notification"
WHERE "createdAt" < NOW() - INTERVAL '90 days'
AND "read" = true;

-- Delete soft-deleted records
DELETE FROM "Product"
WHERE "deletedAt" IS NOT NULL
AND "deletedAt" < NOW() - INTERVAL '90 days';
```

**2. Optimize Storage**
```sql
-- Run VACUUM FULL (requires maintenance window)
VACUUM FULL;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**3. Upgrade Storage**
```bash
# In Neon Console:
Settings → Plan → Upgrade
Free (0.5GB) → Launch (10GB) → Scale (50GB)
```

---

## Redis/Queue Issues

### Issue: Redis Connection Failed

#### Symptom
```
Error: Redis connection timeout
Error: ECONNREFUSED
```

#### Solutions

**1. Verify Credentials**
```bash
# Check environment variables
echo $REDIS_HOST
echo $REDIS_PORT
echo $REDIS_PASSWORD

# Test connection
node -e "
const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  tls: {},
});
redis.ping().then(console.log).catch(console.error);
"
```

**2. TLS Configuration**
```typescript
// Upstash requires TLS
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT!),
  password: process.env.REDIS_PASSWORD,
  tls: {}, // Required for Upstash
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  enableOfflineQueue: false,
});
```

**3. Network/Firewall Issues**
```bash
# Test connectivity
curl https://YOUR-REDIS-HOST:6379

# Check Upstash console for errors
# Dashboard → Database → Metrics
```

---

### Issue: Queue Jobs Not Processing

#### Symptom
Jobs stuck in "waiting" state

#### Solutions

**1. Worker Not Running**
```bash
# Check worker status (if using separate service)
# Render: Dashboard → Service → Logs
# Railway: Dashboard → Deployment → Logs

# Look for:
✅ "Worker started"
✅ "Connected to Redis"
✅ "Listening for jobs"

# If not running, check:
1. Service deployed successfully
2. Environment variables set
3. No crash loops in logs
```

**2. Worker Sleeping (Free Tier)**
```bash
# Free tier services sleep after inactivity

# Solution: Ping worker to wake up
curl https://your-worker.onrender.com/health

# Or implement keep-alive
# .github/workflows/keep-alive.yml
name: Keep Worker Alive
on:
  schedule:
    - cron: '*/10 * * * *' # Every 10 minutes
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Worker
        run: curl ${{ secrets.WORKER_URL }}/health
```

**3. Queue Configuration Issues**
```typescript
// lib/queue/scraper-queue.ts
import Queue from 'bull';

const scraperQueue = new Queue('scraper', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!),
    password: process.env.REDIS_PASSWORD,
    tls: {},
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true, // Clean up completed jobs
    removeOnFail: false, // Keep failed jobs for debugging
  },
});

// Verify queue connected
scraperQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

scraperQueue.on('waiting', (jobId) => {
  console.log('Job waiting:', jobId);
});
```

---

### Issue: Redis Daily Limit Exceeded

#### Symptom (Upstash Free Tier)
```
Error: Daily command limit reached (10,000)
```

#### Solutions

**1. Optimize Redis Usage**
```typescript
// Reduce command count

// ❌ Bad: Multiple get calls
const val1 = await redis.get('key1');
const val2 = await redis.get('key2');
const val3 = await redis.get('key3');

// ✅ Good: Use pipeline
const pipeline = redis.pipeline();
pipeline.get('key1');
pipeline.get('key2');
pipeline.get('key3');
const [val1, val2, val3] = await pipeline.exec();

// ✅ Better: Use mget
const [val1, val2, val3] = await redis.mget('key1', 'key2', 'key3');
```

**2. Increase TTL for Cache**
```typescript
// Cache for longer periods
await redis.setex('product:list', 3600, data); // 1 hour instead of 5 minutes

// Use stale-while-revalidate pattern
async function getCachedData(key: string, fetchFn: () => Promise<any>) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetchFn();
  await redis.setex(key, 3600, JSON.stringify(data));
  return data;
}
```

**3. Upgrade to Paid Tier**
```bash
# Upstash Pay-as-you-go: ~$10-20/month
# Unlimited commands
# Pay only for what you use
```

---

## Email Issues

### Issue: Emails Not Sending

#### Symptom
No emails received, no errors in logs

#### Solutions

**1. Verify Resend Configuration**
```bash
# Check API key is correct
curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "your-email@example.com",
    "subject": "Test Email",
    "html": "<p>Test</p>"
  }'

# Should return 200 OK
```

**2. Domain Not Verified**
```bash
# Error: Domain not verified

# Solution:
1. Go to Resend Dashboard → Domains
2. Add your domain
3. Add DNS records provided by Resend
4. Wait for verification (5-30 minutes)
5. Use verified domain in FROM address:
   from: "noreply@yourdomain.com"

# Or use Resend's test domain:
from: "onboarding@resend.dev"
```

**3. Rate Limit Exceeded**
```bash
# Free tier: 100 emails/day

# Check Resend dashboard for usage
# Solution: Upgrade to Pro ($20/month, 50K emails/month)

# Or implement email queuing
async function sendEmail(to: string, subject: string, body: string) {
  // Check daily limit
  const count = await redis.incr('email:count:today');
  if (count === 1) {
    await redis.expire('email:count:today', 86400); // 24 hours
  }
  
  if (count > 100) {
    // Queue for tomorrow
    await emailQueue.add({ to, subject, body }, {
      delay: getTimeUntilMidnight(),
    });
    return;
  }
  
  // Send email
  await resend.emails.send({ to, subject, html: body });
}
```

**4. Email Bouncing**
```bash
# Check Resend dashboard for bounce rate

# Common causes:
- Invalid email address
- Recipient mailbox full
- Spam filters

# Solution: Implement bounce handling
// app/api/webhooks/resend/route.ts
export async function POST(request: Request) {
  const event = await request.json();
  
  if (event.type === 'email.bounced') {
    // Mark email as bounced
    await prisma.user.update({
      where: { email: event.data.email },
      data: { emailBounced: true },
    });
  }
  
  return Response.json({ received: true });
}
```

---

### Issue: Emails Going to Spam

#### Solutions

**1. Verify Domain with SPF, DKIM, DMARC**
```bash
# Add DNS records (provided by Resend)
resend._domainkey TXT v=DKIM1; k=rsa; p=MIGfMA0GCS...
_dmarc TXT v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

**2. Improve Email Content**
```typescript
// Avoid spam triggers:
- Don't use all caps in subject: "FREE CANNABIS SEEDS!!!"
- Avoid excessive links
- Include unsubscribe link
- Use proper HTML structure
- Include plain text version

// Good email template
const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
  <p>Hi ${userName},</p>
  <p>Your password reset link: <a href="${resetLink}">Reset Password</a></p>
  <p>If you didn't request this, please ignore.</p>
  <hr>
  <p><a href="${unsubscribeLink}">Unsubscribe</a></p>
</body>
</html>
`;
```

**3. Warm Up Dedicated IP (Business Tier)**
```bash
# If using Resend Business with dedicated IP
# Gradually increase sending volume:
Day 1-3: 50 emails/day
Day 4-7: 200 emails/day
Day 8-14: 500 emails/day
Day 15+: Normal volume
```

---

## Worker Issues

### Issue: Worker Crashing

#### Symptom
Worker restarts repeatedly, jobs fail

#### Solutions

**1. Check Logs for Errors**
```bash
# Render: Dashboard → Service → Logs
# Railway: Dashboard → Deployment → Logs

# Common errors:
- Out of memory
- Unhandled promise rejection
- Scraper timeout
```

**2. Memory Issues**
```typescript
// lib/workers/scraper-worker.ts
import { scraperQueue } from '../queue/scraper-queue';

scraperQueue.process(5, async (job) => {
  try {
    // Process job
    const result = await processScrapingJob(job.data);
    
    // Explicitly clean up
    if (global.gc) {
      global.gc(); // Force garbage collection
    }
    
    return result;
  } catch (error) {
    console.error('Job failed:', error);
    throw error; // Let Bull retry
  }
});

// Increase worker memory
// In Render/Railway:
Environment Variables → NODE_OPTIONS=--max-old-space-size=2048
```

**3. Implement Graceful Shutdown**
```typescript
// lib/workers/scraper-worker.ts
let isShuttingDown = false;

process.on('SIGTERM', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('Received SIGTERM, shutting down gracefully...');
  
  // Stop accepting new jobs
  await scraperQueue.pause();
  
  // Wait for active jobs to complete (max 30s)
  await scraperQueue.close(30000);
  
  // Close database connection
  await prisma.$disconnect();
  
  console.log('Shutdown complete');
  process.exit(0);
});
```

---

### Issue: Scraping Jobs Timing Out

#### Symptom
```
Error: Scraping timeout after 60 seconds
```

#### Solutions

**1. Increase Timeout**
```typescript
// lib/queue/scraper-queue.ts
const scraperQueue = new Queue('scraper', {
  defaultJobOptions: {
    timeout: 180000, // 3 minutes instead of 1 minute
  },
});
```

**2. Optimize Scraper**
```typescript
// scrapers/[site]/scraper.ts
import { CheerioCrawler } from 'crawlee';

const crawler = new CheerioCrawler({
  maxConcurrency: 3, // Reduce concurrency
  maxRequestRetries: 2, // Reduce retries
  requestHandlerTimeoutSecs: 60, // Per-request timeout
  
  async requestHandler({ $, request }) {
    // Optimize selectors
    const products = $('div.product').map((i, el) => {
      return {
        name: $(el).find('.name').text().trim(),
        price: $(el).find('.price').text().trim(),
      };
    }).get();
    
    return products;
  },
});
```

**3. Split Large Jobs**
```typescript
// Instead of scraping all products in one job
// Split into smaller jobs

async function triggerScrapingForSeller(sellerId: string) {
  const pages = 10; // Total pages to scrape
  
  for (let page = 1; page <= pages; page++) {
    await scraperQueue.add({
      sellerId,
      page,
      url: `${sellerUrl}?page=${page}`,
    });
  }
}
```

---

## Authentication Issues

### Issue: OAuth Login Not Working

#### Symptom
"OAuth error" or redirect fails

#### Solutions

**1. Verify OAuth Configuration**
```bash
# Google OAuth
1. Go to Google Cloud Console
2. APIs & Services → Credentials
3. Check Authorized redirect URIs:
   https://your-app.vercel.app/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google

# Facebook OAuth
1. Go to Facebook Developers
2. App → Settings → Basic
3. Check Valid OAuth Redirect URIs:
   https://your-app.vercel.app/api/auth/callback/facebook
```

**2. Environment Variables**
```bash
# Verify all auth variables set correctly
AUTH_GOOGLE_ID=xxx
AUTH_GOOGLE_SECRET=xxx
AUTH_FACEBOOK_ID=xxx
AUTH_FACEBOOK_SECRET=xxx
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=generated-secret
AUTH_URL=https://your-app.vercel.app
AUTH_SECRET=generated-secret
AUTH_TRUST_HOST=true
```

**3. NextAuth Configuration**
```typescript
// auth/auth.ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // Important for Vercel
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Your logic
      return true;
    },
  },
});
```

---

### Issue: Session Not Persisting

#### Symptom
User logged out after page refresh

#### Solutions

**1. Check Cookie Settings**
```typescript
// auth/auth.config.ts
export default {
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  session: {
    strategy: 'database', // Use database sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
```

**2. Database Adapter**
```typescript
// Ensure Prisma adapter is configured
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const { handlers, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // ... other config
});
```

---

## Performance Issues

### Issue: Slow Page Load Times

#### Symptom
TTFB > 1s, LCP > 2.5s

#### Solutions

**1. Enable Edge Runtime**
```typescript
// app/api/products/route.ts
export const runtime = 'edge'; // Run on edge

export async function GET() {
  // Your logic
}
```

**2. Implement Caching**
```typescript
// app/products/page.tsx
export const revalidate = 3600; // ISR: 1 hour

export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductList products={products} />;
}

// API route with cache headers
export async function GET() {
  const data = await fetchData();
  
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
```

**3. Optimize Images**
```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src={product.image}
  alt={product.name}
  width={300}
  height={300}
  loading="lazy"
  quality={75}
/>
```

**4. Code Splitting**
```typescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false, // Disable SSR if not needed
});
```

---

### Issue: High Function Execution Time

#### Symptom
Vercel billing high, functions timing out

#### Solutions

**1. Move Heavy Tasks to Workers**
```typescript
// ❌ Bad: Scraping in API route (slow, expensive)
export async function POST(request: Request) {
  const products = await scrapeWebsite(url); // Takes 30s+
  return Response.json(products);
}

// ✅ Good: Queue job for worker
export async function POST(request: Request) {
  const job = await scraperQueue.add({ url });
  return Response.json({ jobId: job.id });
}
```

**2. Optimize Database Queries**
```typescript
// Add indexes, use select, implement pagination
// See Database Issues section above
```

**3. Use Vercel Edge Functions**
```typescript
// Runs on edge, faster and cheaper than serverless
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Lightweight operations only
  return new Response('Hello from edge');
}
```

---

## Monitoring & Debugging

### Enable Debug Logging

```bash
# Environment variable
DEBUG=* npm run dev

# Or specific namespaces
DEBUG=prisma:* npm run dev
DEBUG=bull:* npm run dev
```

### Vercel Function Logs

```bash
# Real-time logs
vercel logs --follow

# Filter by function
vercel logs --filter=/api/products

# Production logs
vercel logs --prod
```

### Sentry Error Tracking

```typescript
// Capture custom errors
import * as Sentry from '@sentry/nextjs';

try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'scraper',
      seller: sellerId,
    },
    extra: {
      jobId: job.id,
      url: job.data.url,
    },
  });
  throw error;
}

// Track performance
const transaction = Sentry.startTransaction({
  name: 'Scraping Job',
  op: 'scraper',
});

// ... do work ...

transaction.finish();
```

### Database Query Logging

```typescript
// Enable query logging
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

---

## Emergency Procedures

### Complete Service Outage

```bash
# 1. Check service status
- Vercel: https://vercel-status.com
- Neon: https://neonstatus.com
- Upstash: https://upstash.statuspage.io

# 2. Quick rollback
- Vercel: Dashboard → Deployments → Last working → Promote to Production

# 3. Enable maintenance mode
# Create app/maintenance/page.tsx
export default function Maintenance() {
  return <div>Site under maintenance. Back soon!</div>;
}

# Redirect all traffic
# middleware.ts
if (process.env.MAINTENANCE_MODE === 'true') {
  return NextResponse.redirect('/maintenance');
}
```

### Database Corruption

```bash
# 1. Stop all writes
# Disable API routes that write to DB

# 2. Create backup branch in Neon
Dashboard → Branches → Create from main

# 3. Restore from backup
Dashboard → Restore → Select point in time

# 4. Test restored database
# 5. Update DATABASE_URL
# 6. Redeploy
```

---

## Getting Help

### Documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - Deployment steps
- [MONITORING.md](./MONITORING.md) - Monitoring setup
- [SCALING-GUIDE.md](./SCALING-GUIDE.md) - Scaling strategies

### Service Support
- **Vercel**: https://vercel.com/support
- **Neon**: https://neon.tech/docs/introduction
- **Upstash**: https://upstash.com/docs
- **Resend**: https://resend.com/docs

### Community
- Vercel Discord: https://vercel.com/discord
- Prisma Discord: https://pris.ly/discord
- Next.js GitHub: https://github.com/vercel/next.js

---

## Prevention Best Practices

### Before Each Deployment

- [ ] Test locally first
- [ ] Run type checking: `npm run type-check`
- [ ] Run linting: `npm run lint`
- [ ] Build successfully: `npm run build`
- [ ] Check environment variables
- [ ] Review changes in staging
- [ ] Have rollback plan ready

### Regular Maintenance

- [ ] Monitor error rates daily (Sentry)
- [ ] Check database size weekly (Neon)
- [ ] Review logs weekly (Vercel)
- [ ] Update dependencies monthly
- [ ] Test backup restore quarterly
- [ ] Review security quarterly

---

**Remember**: Most issues are related to configuration, not code. Always check environment variables and service status first! 🔍
