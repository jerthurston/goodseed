# Monitoring & Observability Guide

## Overview

This guide covers comprehensive monitoring, logging, and observability setup for the GoodSeed Cannabis App production environment.

**Target Audience**: DevOps engineers and developers responsible for system reliability

---

## Table of Contents

1. [Monitoring Stack](#monitoring-stack)
2. [Sentry Setup](#sentry-setup)
3. [Vercel Analytics](#vercel-analytics)
4. [Database Monitoring](#database-monitoring)
5. [Redis Monitoring](#redis-monitoring)
6. [Worker Monitoring](#worker-monitoring)
7. [Uptime Monitoring](#uptime-monitoring)
8. [Alerting Strategy](#alerting-strategy)
9. [Logging Best Practices](#logging-best-practices)
10. [Performance Metrics](#performance-metrics)

---

## Monitoring Stack

### Recommended Tools by Tier

#### **Free Tier ($0/month)**
```
✅ Sentry Developer (Free)
   - 5K errors/month
   - 10K transactions/month
   - 30-day retention

✅ Vercel Analytics (Built-in)
   - Real User Monitoring
   - Core Web Vitals
   - Basic insights

✅ Neon Metrics (Built-in)
   - Database metrics
   - Connection count
   - Storage usage

✅ Upstash Metrics (Built-in)
   - Command count
   - Memory usage
   - Latency

✅ UptimeRobot (Free)
   - 50 monitors
   - 5-minute checks
   - Email alerts
```

#### **Production Tier ($26-99/month)**
```
✅ Sentry Team ($26/month)
   - 50K errors/month
   - Unlimited transactions
   - 90-day retention
   - Team collaboration

✅ Vercel Pro Analytics ($20 included)
   - Advanced insights
   - Custom events
   - Longer retention

✅ Better Uptime ($10/month)
   - 1-minute checks
   - Status page
   - Phone alerts
   - Incident management

✅ LogDNA/Papertrail ($10/month)
   - Centralized logging
   - Search and filter
   - Real-time tail
   - Integrations
```

#### **Enterprise Tier ($200+/month)**
```
✅ DataDog/New Relic ($200+/month)
   - Full APM
   - Custom dashboards
   - Machine learning insights
   - Advanced alerting

✅ PagerDuty ($21+/month)
   - On-call scheduling
   - Escalation policies
   - Incident response

✅ Custom ELK Stack
   - Elasticsearch
   - Logstash
   - Kibana
   - Full control
```

---

## Sentry Setup

### Installation

```bash
# Install Sentry SDK
pnpm add @sentry/nextjs

# Run setup wizard
npx @sentry/wizard@latest -i nextjs
```

### Configuration

#### **sentry.client.config.ts**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Error Sampling (capture all errors)
  sampleRate: 1.0,
  
  // Session Replay (optional, costs extra)
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  // Integrations
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: [
        "localhost",
        /^https:\/\/.*\.vercel\.app/,
        /^https:\/\/yourdomain\.com/,
      ],
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Filter out noise
  beforeSend(event, hint) {
    // Don't send errors from development
    if (event.environment === 'development') {
      return null;
    }
    
    // Filter out known third-party errors
    if (event.exception?.values?.[0]?.value?.includes('chrome-extension://')) {
      return null;
    }
    
    return event;
  },
});
```

#### **sentry.server.config.ts**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
  
  tracesSampleRate: 0.1,
  
  integrations: [
    new Sentry.Integrations.Prisma({ client: prisma }),
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  
  beforeSend(event) {
    // Don't log sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  },
});
```

#### **sentry.edge.config.ts**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
});
```

### Usage in Application

#### **Error Tracking**
```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';

export function captureError(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    level?: 'error' | 'warning' | 'info';
  }
) {
  Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    level: context?.level || 'error',
  });
}

// Usage in API route
export async function GET(request: Request) {
  try {
    const data = await fetchData();
    return Response.json(data);
  } catch (error) {
    captureError(error as Error, {
      tags: {
        component: 'api',
        endpoint: '/api/products',
      },
      extra: {
        url: request.url,
        method: request.method,
      },
    });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### **Performance Tracking**
```typescript
// Track slow operations
import * as Sentry from '@sentry/nextjs';

export async function scrapeWebsite(url: string) {
  const transaction = Sentry.startTransaction({
    name: 'Scrape Website',
    op: 'scraper',
    tags: {
      url,
    },
  });
  
  try {
    const span1 = transaction.startChild({ op: 'fetch' });
    const html = await fetchHTML(url);
    span1.finish();
    
    const span2 = transaction.startChild({ op: 'parse' });
    const products = await parseProducts(html);
    span2.finish();
    
    transaction.setStatus('ok');
    return products;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}
```

#### **Custom Context**
```typescript
// Add user context
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});

// Add breadcrumbs
Sentry.addBreadcrumb({
  category: 'auth',
  message: 'User logged in',
  level: 'info',
});

// Set tags
Sentry.setTag('page_locale', 'en-US');
Sentry.setTag('user_plan', 'pro');
```

### Sentry Alerts

```bash
# In Sentry Dashboard → Alerts → Create Alert Rule:

1. Error Rate Alert
   Condition: Error count > 50 in 1 hour
   Action: Email team@yourdomain.com
   
2. Performance Alert
   Condition: P95 response time > 2 seconds
   Action: Slack notification
   
3. New Issue Alert
   Condition: New issue first seen
   Action: Email on-call engineer
   
4. Regression Alert
   Condition: Resolved issue reopens
   Action: High-priority notification
```

---

## Vercel Analytics

### Enable Analytics

```bash
# In Vercel Dashboard:
Project Settings → Analytics → Enable

# Or in code
# next.config.ts
export default {
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB'],
  },
};
```

### Custom Events

```typescript
// Track custom events
import { track } from '@vercel/analytics';

// Product view
track('product_view', {
  product_id: product.id,
  product_name: product.name,
  price: product.price,
});

// Search
track('search', {
  query: searchQuery,
  results_count: results.length,
});

// Conversion
track('purchase', {
  product_id: product.id,
  value: product.price,
});
```

### Web Vitals Monitoring

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Vercel Dashboard Metrics

```bash
# Monitor these in Vercel Dashboard:

1. Deployment Metrics
   - Build duration
   - Deployment frequency
   - Success rate

2. Function Metrics
   - Execution count
   - Execution duration
   - Error rate
   - Cold starts

3. Edge Metrics
   - Request count
   - Cache hit rate
   - Response time

4. Web Vitals
   - LCP (Largest Contentful Paint)
   - FID (First Input Delay)
   - CLS (Cumulative Layout Shift)
   - TTFB (Time to First Byte)

5. Traffic
   - Bandwidth usage
   - Request count by region
   - Top paths
```

---

## Database Monitoring

### Neon Built-in Metrics

```bash
# In Neon Console → Project → Monitoring:

1. Compute Metrics
   - CPU usage
   - Active time vs suspended
   - Connections count

2. Storage Metrics
   - Database size
   - Growth rate
   - Storage limit

3. Query Performance
   - Slow queries (>1s)
   - Query count
   - Cache hit rate
```

### Custom Monitoring

```typescript
// lib/monitoring/database.ts
import { prisma } from '@/lib/prisma';
import { captureMessage } from '@/lib/monitoring/sentry';

export async function checkDatabaseHealth() {
  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check connection pool
    const metrics = await prisma.$metrics.json();
    
    // Alert if pool exhausted
    if (metrics.counters.find(c => c.key === 'pool.connections')?.value > 80) {
      captureMessage('Database connection pool near limit', {
        level: 'warning',
        extra: { metrics },
      });
    }
    
    return { healthy: true, metrics };
  } catch (error) {
    captureMessage('Database health check failed', {
      level: 'error',
      extra: { error },
    });
    return { healthy: false, error };
  }
}

// Run health check periodically
export async function startDatabaseMonitoring() {
  setInterval(async () => {
    await checkDatabaseHealth();
  }, 60000); // Every minute
}
```

### Query Performance Tracking

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
  ],
});

// Track slow queries
prisma.$on('query', (e) => {
  if (e.duration > 1000) { // > 1 second
    Sentry.captureMessage('Slow database query', {
      level: 'warning',
      tags: {
        component: 'database',
        type: 'slow_query',
      },
      extra: {
        query: e.query,
        duration: e.duration,
        params: e.params,
      },
    });
  }
});

export { prisma };
```

---

## Redis Monitoring

### Upstash Built-in Metrics

```bash
# In Upstash Console → Database → Metrics:

1. Commands
   - Total commands
   - Commands per second
   - Daily limit usage (free tier)

2. Memory
   - Used memory
   - Peak memory
   - Eviction count

3. Connections
   - Active connections
   - Peak connections

4. Latency
   - Average latency
   - P95 latency
   - P99 latency

5. Hit Rate
   - Cache hits
   - Cache misses
   - Hit ratio
```

### Custom Redis Monitoring

```typescript
// lib/monitoring/redis.ts
import { redis } from '@/lib/cache/redis-cache';
import { captureMessage } from '@/lib/monitoring/sentry';

export async function checkRedisHealth() {
  try {
    // Test connection
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      throw new Error('Redis ping failed');
    }
    
    // Get info
    const info = await redis.info('stats');
    
    // Parse metrics
    const metrics = parseRedisInfo(info);
    
    // Check memory usage
    const memoryUsage = await redis.info('memory');
    const usedMemory = parseMemoryUsage(memoryUsage);
    
    if (usedMemory > 200 * 1024 * 1024) { // 200MB (free tier: 256MB)
      captureMessage('Redis memory usage high', {
        level: 'warning',
        extra: { usedMemory },
      });
    }
    
    return { healthy: true, metrics };
  } catch (error) {
    captureMessage('Redis health check failed', {
      level: 'error',
      extra: { error },
    });
    return { healthy: false, error };
  }
}

function parseRedisInfo(info: string): Record<string, string> {
  const metrics: Record<string, string> = {};
  info.split('\n').forEach(line => {
    const [key, value] = line.split(':');
    if (key && value) {
      metrics[key.trim()] = value.trim();
    }
  });
  return metrics;
}
```

---

## Worker Monitoring

### Bull Queue Metrics

```typescript
// lib/monitoring/queue.ts
import { scraperQueue } from '@/lib/queue/scraper-queue';
import { captureMessage } from '@/lib/monitoring/sentry';

export async function getQueueMetrics() {
  const [
    waiting,
    active,
    completed,
    failed,
    delayed,
  ] = await Promise.all([
    scraperQueue.getWaitingCount(),
    scraperQueue.getActiveCount(),
    scraperQueue.getCompletedCount(),
    scraperQueue.getFailedCount(),
    scraperQueue.getDelayedCount(),
  ]);
  
  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

export async function monitorQueueHealth() {
  const metrics = await getQueueMetrics();
  
  // Alert if too many jobs waiting
  if (metrics.waiting > 100) {
    captureMessage('Queue backlog detected', {
      level: 'warning',
      extra: { metrics },
    });
  }
  
  // Alert if too many failures
  const failureRate = metrics.failed / metrics.total;
  if (failureRate > 0.1) { // > 10% failure rate
    captureMessage('High job failure rate', {
      level: 'error',
      extra: { metrics, failureRate },
    });
  }
  
  return metrics;
}

// Expose metrics endpoint
export async function GET() {
  const metrics = await getQueueMetrics();
  return Response.json(metrics);
}
```

### Worker Health Endpoint

```typescript
// app/api/worker/health/route.ts
import { scraperQueue } from '@/lib/queue/scraper-queue';
import { redis } from '@/lib/cache/redis-cache';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const checks = {
    redis: false,
    database: false,
    queue: false,
  };
  
  // Check Redis
  try {
    await redis.ping();
    checks.redis = true;
  } catch (error) {
    console.error('Redis health check failed:', error);
  }
  
  // Check Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }
  
  // Check Queue
  try {
    const jobCounts = await scraperQueue.getJobCounts();
    checks.queue = true;
  } catch (error) {
    console.error('Queue health check failed:', error);
  }
  
  const healthy = Object.values(checks).every(v => v);
  
  return Response.json(
    { healthy, checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  );
}
```

---

## Uptime Monitoring

### UptimeRobot Setup (Free)

```bash
# 1. Create account: https://uptimerobot.com/

# 2. Add monitors:
Monitor 1: Main Site
  Type: HTTP(s)
  URL: https://your-app.vercel.app
  Interval: 5 minutes
  Alert: Email when down

Monitor 2: API Health
  Type: HTTP(s)
  URL: https://your-app.vercel.app/api/health
  Interval: 5 minutes
  Alert: Email when down

Monitor 3: Worker Health (if separate service)
  Type: HTTP(s)
  URL: https://your-worker.onrender.com/health
  Interval: 5 minutes
  Alert: Email when down

# 3. Create status page (optional)
- Public URL: https://status.yourdomain.com
- Shows uptime for all services
```

### Better Uptime Setup (Paid)

```bash
# 1. Create account: https://betteruptime.com/

# 2. Add monitors:
- 1-minute intervals
- Phone call alerts
- Incident management
- Status page with custom domain

# 3. Configure on-call schedule
- Primary: DevOps engineer
- Secondary: Backend developer
- Escalation: CTO after 15 minutes
```

### Custom Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION,
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      worker: await checkWorker(),
    },
  };
  
  const allHealthy = Object.values(health.checks).every(c => c.healthy);
  health.status = allHealthy ? 'healthy' : 'degraded';
  
  return Response.json(health, {
    status: allHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: (error as Error).message };
  }
}

async function checkRedis() {
  try {
    await redis.ping();
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: (error as Error).message };
  }
}

async function checkWorker() {
  if (!process.env.WORKER_HEALTH_URL) {
    return { healthy: true, note: 'Worker monitoring not configured' };
  }
  
  try {
    const response = await fetch(process.env.WORKER_HEALTH_URL);
    return { healthy: response.ok };
  } catch (error) {
    return { healthy: false, error: (error as Error).message };
  }
}
```

---

## Alerting Strategy

### Alert Severity Levels

```typescript
// lib/monitoring/alerts.ts
export enum AlertSeverity {
  CRITICAL = 'critical',  // Immediate action required
  HIGH = 'high',          // Action required within 1 hour
  MEDIUM = 'medium',      // Action required within 4 hours
  LOW = 'low',            // Action required within 24 hours
  INFO = 'info',          // No action required
}

export interface Alert {
  severity: AlertSeverity;
  title: string;
  description: string;
  service: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

### Alert Rules

```typescript
// Critical Alerts (Page immediately)
const criticalAlerts = [
  'Site completely down',
  'Database connection failed',
  'Data corruption detected',
  'Security breach detected',
];

// High Priority Alerts (Email + Slack)
const highPriorityAlerts = [
  'Error rate > 5%',
  'Response time > 5 seconds',
  'Worker crashed',
  'Queue backlog > 1000 jobs',
  'Storage > 90% full',
];

// Medium Priority Alerts (Slack)
const mediumPriorityAlerts = [
  'Error rate > 1%',
  'Response time > 2 seconds',
  'Memory usage > 80%',
  'Cache miss rate > 50%',
];

// Low Priority Alerts (Dashboard)
const lowPriorityAlerts = [
  'Slow query detected',
  'High API usage',
  'Dependency update available',
];
```

### Alert Channels

```typescript
// lib/monitoring/alert-channels.ts
import { Alert, AlertSeverity } from './alerts';

export async function sendAlert(alert: Alert) {
  switch (alert.severity) {
    case AlertSeverity.CRITICAL:
      await Promise.all([
        sendEmail(alert),
        sendSlack(alert),
        sendSMS(alert), // If configured
        createPagerDutyIncident(alert), // If configured
      ]);
      break;
      
    case AlertSeverity.HIGH:
      await Promise.all([
        sendEmail(alert),
        sendSlack(alert),
      ]);
      break;
      
    case AlertSeverity.MEDIUM:
      await sendSlack(alert);
      break;
      
    case AlertSeverity.LOW:
    case AlertSeverity.INFO:
      // Log only
      console.log('Alert:', alert);
      break;
  }
}

async function sendSlack(alert: Alert) {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `🚨 ${alert.severity.toUpperCase()}: ${alert.title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${alert.title}*\n${alert.description}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Service: ${alert.service} | Time: ${alert.timestamp.toISOString()}`,
            },
          ],
        },
      ],
    }),
  });
}
```

---

## Logging Best Practices

### Structured Logging

```typescript
// lib/logger/api-logger.ts
import * as Sentry from '@sentry/nextjs';

export interface LogContext {
  userId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  [key: string]: any;
}

export class ApiLogger {
  private context: LogContext;
  
  constructor(context: LogContext = {}) {
    this.context = context;
  }
  
  logInfo(message: string, data?: Record<string, any>) {
    const log = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...data,
    };
    
    console.log(JSON.stringify(log));
    
    Sentry.addBreadcrumb({
      category: this.context.component || 'app',
      message,
      level: 'info',
      data,
    });
  }
  
  logError(message: string, error: Error, data?: Record<string, any>) {
    const log = {
      level: 'error',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      timestamp: new Date().toISOString(),
      ...this.context,
      ...data,
    };
    
    console.error(JSON.stringify(log));
    
    Sentry.captureException(error, {
      tags: {
        component: this.context.component,
      },
      extra: {
        ...this.context,
        ...data,
      },
    });
  }
  
  logWarning(message: string, data?: Record<string, any>) {
    const log = {
      level: 'warning',
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...data,
    };
    
    console.warn(JSON.stringify(log));
    
    Sentry.captureMessage(message, {
      level: 'warning',
      tags: {
        component: this.context.component,
      },
      extra: data,
    });
  }
}

// Usage
const logger = new ApiLogger({
  component: 'scraper',
  userId: user?.id,
});

logger.logInfo('Started scraping', { url, sellerId });
logger.logError('Scraping failed', error, { url, attempts: 3 });
```

### Log Retention Strategy

```bash
# Free Tier
- Application logs: 7 days (Vercel)
- Error logs: 30 days (Sentry)
- Access logs: Not retained

# Production Tier
- Application logs: 30 days (Vercel Pro)
- Error logs: 90 days (Sentry Team)
- Access logs: 30 days (LogDNA)
- Audit logs: 1 year (database)

# Enterprise Tier
- Application logs: 1 year (DataDog)
- Error logs: 1 year (Sentry Business)
- Access logs: 1 year (custom)
- Audit logs: 7 years (compliance)
```

---

## Performance Metrics

### Key Metrics to Track

```typescript
// lib/monitoring/metrics.ts
export interface PerformanceMetrics {
  // Web Vitals
  lcp: number;  // Largest Contentful Paint
  fid: number;  // First Input Delay
  cls: number;  // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  fcp: number;  // First Contentful Paint
  
  // API Metrics
  apiResponseTime: number;
  apiErrorRate: number;
  apiThroughput: number;
  
  // Database Metrics
  dbQueryTime: number;
  dbConnectionCount: number;
  
  // Queue Metrics
  queueSize: number;
  jobProcessingTime: number;
  jobFailureRate: number;
  
  // Resource Metrics
  memoryUsage: number;
  cpuUsage: number;
}

export async function collectMetrics(): Promise<PerformanceMetrics> {
  return {
    lcp: await measureLCP(),
    fid: await measureFID(),
    cls: await measureCLS(),
    ttfb: await measureTTFB(),
    fcp: await measureFCP(),
    apiResponseTime: await getAvgApiResponseTime(),
    apiErrorRate: await getApiErrorRate(),
    apiThroughput: await getApiThroughput(),
    dbQueryTime: await getAvgDbQueryTime(),
    dbConnectionCount: await getDbConnectionCount(),
    queueSize: await getQueueSize(),
    jobProcessingTime: await getAvgJobProcessingTime(),
    jobFailureRate: await getJobFailureRate(),
    memoryUsage: process.memoryUsage().heapUsed,
    cpuUsage: process.cpuUsage().user,
  };
}
```

### Performance Targets

```typescript
// Good, Needs Improvement, Poor
export const performanceTargets = {
  lcp: { good: 2500, poor: 4000 },      // ms
  fid: { good: 100, poor: 300 },        // ms
  cls: { good: 0.1, poor: 0.25 },       // score
  ttfb: { good: 800, poor: 1800 },      // ms
  fcp: { good: 1800, poor: 3000 },      // ms
  
  apiResponseTime: { good: 200, poor: 1000 }, // ms
  apiErrorRate: { good: 0.01, poor: 0.05 },   // 1% to 5%
  
  dbQueryTime: { good: 100, poor: 500 },      // ms
  jobProcessingTime: { good: 5000, poor: 30000 }, // ms
};
```

---

## Dashboard Setup

### Recommended Dashboard Tools

#### **Grafana (Free, Self-hosted)**
```bash
# Connect to:
- Vercel metrics API
- Neon metrics API
- Upstash metrics API
- Sentry API

# Dashboards:
1. System Overview
2. API Performance
3. Database Health
4. Queue Status
5. Error Tracking
```

#### **Datadog/New Relic (Paid)**
```bash
# Unified monitoring
- APM traces
- Infrastructure metrics
- Custom dashboards
- Machine learning insights
```

---

## Summary

### Monitoring Checklist

- [ ] Sentry configured for error tracking
- [ ] Vercel Analytics enabled
- [ ] Database monitoring setup
- [ ] Redis monitoring setup
- [ ] Worker health checks configured
- [ ] Uptime monitoring active
- [ ] Alert channels configured
- [ ] Logging strategy implemented
- [ ] Performance metrics tracked
- [ ] Dashboard created
- [ ] On-call rotation defined
- [ ] Incident response plan documented

### Next Steps

- Review metrics daily
- Tune alert thresholds
- Set up custom dashboards
- Document runbooks
- Schedule regular reviews

---

## Related Documentation

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [SCALING-GUIDE.md](./SCALING-GUIDE.md) - Scaling strategies
- [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - Deployment procedures

---

**Remember**: You can't improve what you don't measure! 📊
