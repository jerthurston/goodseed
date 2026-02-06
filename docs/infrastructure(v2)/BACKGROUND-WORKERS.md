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
│  │  /api/admin/scraper/schedule-all → Schedule jobs      │ │
│  │  /api/admin/scraper/[id]/run → Manual trigger         │ │
│  │  /api/cron/* → Scheduled cleanup tasks                │ │
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
│  │                                                         │ │
│  │  Job Types:                                             │ │
│  │  • scraper-job → Web scraping tasks                    │ │
│  │  • detect-price-changes → Price comparison ⭐          │ │
│  │  • send-price-alert → Email notifications ⭐           │ │
│  │  • email-job → General email tasks                     │ │
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
│  │  5. Save to Neon (Pricing + PricingHistory) ⭐         │ │
│  │  6. Detect price changes (≥5% drops) ⭐                │ │
│  │  7. Find users with matching wishlist ⭐               │ │
│  │  8. Send price alert emails to users ⭐                │ │
│  │  9. Update job status → completed/failed               │ │
│  │  10. Send admin notification email                     │ │
│  └────────────────────┬───────────────────────────────────┘ │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         ▼ Save Results
┌─────────────────────────────────────────────────────────────┐
│                  NEON POSTGRESQL                             │
│  • SeedProduct (scraped seed data)                          │
│  • Pricing (current prices) ⭐                              │
│  • PricingHistory (historical prices) ⭐                    │
│  • Wishlist (user wishlists) ⭐                             │
│  • User (with receivePriceAlerts flag) ⭐                   │
│  • ScrapeJob (job tracking and logs)                        │
│  • Sellers (seed bank information)                          │
└─────────────────────────────────────────────────────────────┘

⭐ = New components for Price Alert System
```

---

## Job Queue System

### Bull Queue Configuration

The job queue system uses Bull Queue library with Upstash Redis as the backing store. The queue is configured with the following key settings:

**Connection Settings**:
- Connects to Upstash Redis using host, port, and password from environment variables
- Uses TLS encryption for secure communication (required by Upstash)
- Enables connection readiness checks with maximum 3 retry attempts per request

**Default Job Options**:
- **Retry Mechanism**: Failed jobs are automatically retried up to 3 times
- **Backoff Strategy**: Uses exponential backoff starting with 5-second delays between retries
- **Job Retention**: Completed and failed jobs are kept in the queue for audit and debugging purposes

**Rate Limiting**:
- Maximum of 10 jobs can be processed per minute
- Prevents overwhelming external websites with too many scraping requests
- Protects the system from resource exhaustion

### Job Data Structure

Each scraping job contains the following information:

- **Job Identifier**: Unique ID for tracking and monitoring the job
- **Seller Information**: ID of the seed bank/seller being scraped
- **Scraping Sources**: Array of URLs and configuration for pages to scrape, including maximum page limits
- **Configuration**: Additional scraping settings and options

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

**Implementation**: Worker process continuously monitors the Bull Queue and picks up scraping jobs as they arrive

**Process Flow**:

The scraper worker follows this systematic workflow when processing each job:

1. **Job Initialization**: Worker picks up a pending job from the queue and updates its status to "PROCESSING" in the database with a start timestamp

2. **Scraper Selection**: Based on the target seller website, the system instantiates the appropriate scraper module designed for that specific site's structure

3. **Data Extraction**: The scraper navigates through the configured pages on the seller's website, extracting product information including names, URLs, images, and pricing for all available pack sizes

4. **Data Normalization**: Raw scraped data is cleaned, validated, and transformed into a standardized format that matches the database schema

5. **Price History Preservation**: Before updating any prices, the system saves the current (old) prices to the pricing history table - this step is critical for price change detection

6. **Database Updates**: New product data and prices are saved or updated in the database, with the current pricing table now reflecting the latest scraped values

7. **Product ID Population**: The system maps scraped products to their database records by matching product slugs, creating a link between scraped data and stored products

8. **Price Change Detection**: The worker compares newly scraped prices against historical prices to identify significant price drops (5% or greater decrease)

9. **User Identification**: When price drops are detected, the system queries for users who have those products in their wishlist AND have opted in to receive price alerts

10. **Email Notifications**: For each eligible user, the system generates and sends a personalized email highlighting the price drops on their wishlist items

11. **Job Completion**: The worker updates the job status to "COMPLETED" with statistics including products scraped, price changes detected, and emails sent

12. **Admin Notification**: A summary email is sent to administrators confirming the job's successful completion

**Error Handling**: If any error occurs during processing, the job status is updated to "FAILED" with error details logged. The Bull Queue's retry mechanism will attempt the job again based on configured retry policies.

**Technologies Used**:
- **Crawlee**: Robust web scraping framework that handles page navigation, data extraction, and error recovery
- **Cheerio**: Fast HTML parsing library for extracting data from static pages
- **Puppeteer**: Headless browser for scraping JavaScript-heavy websites that require full browser rendering

**⭐ Price Alert Integration**:
The price alert system is fully integrated into the scraper workflow. For complete technical details on price detection logic, database queries, and email template structure, see the dedicated documentation at: `docs/production-docs(important)/PRICE-ALERT-WORKER-FLOW.md`

**Key Features**:
- Saves old prices to history table before updating (critical for accurate change detection)
- Compares prices at the variant level (each pack size analyzed separately)
- Only triggers alerts for significant drops (≥5% threshold)
- Respects user preferences (only notifies opted-in users)
- Groups multiple price drops per user into single email

---

### 2. Email Worker

**Purpose**: Process email queue for sending transactional emails

**Implementation**: Dedicated worker that handles all email delivery tasks asynchronously

**Process Flow**:

The email worker processes different types of email notifications:

1. **Job Retrieval**: Worker picks up email jobs from the dedicated email queue
2. **Type Identification**: Determines the email type (scraping completed, scraping failed, price alert, welcome message, etc.)
3. **Template Selection**: Selects and populates the appropriate email template based on the job type
4. **Email Composition**: Generates the email content with recipient information and personalized data
5. **Delivery**: Sends the email via Resend API with proper headers and tracking
6. **Confirmation**: Returns delivery status and message ID for audit purposes

**Email Types Supported**:

- **Scraping Status Emails**: 
  - Job completed successfully with statistics
  - Job failed with error details and troubleshooting steps

- **⭐ Price Alert Emails** (New): 
  - Personalized notifications when wishlist products have significant price drops
  - Includes product images, old/new prices, savings percentage, and purchase links

- **User Account Emails**:
  - Welcome emails for new user registrations
  - Password reset instructions
  - Account verification links

- **System Notifications**:
  - Admin alerts for system events
  - Error notifications for critical failures

**Error Handling**: Failed email deliveries are logged with full error context and automatically retried by the Bull Queue retry mechanism. After maximum retry attempts, the job is marked as permanently failed for manual review.

**Delivery Service**: All emails are sent through Resend API, which provides reliable delivery, bounce handling, and delivery tracking. The service maintains high deliverability rates and provides detailed analytics on email performance.

---

### 3. Cleanup Worker

**Purpose**: Periodic database cleanup and maintenance

**Triggered By**: Vercel Cron jobs running at scheduled intervals (typically every 30 minutes)

**Maintenance Tasks**:

**Job Cleanup**:
- Removes completed scraping jobs older than 7 days to prevent database bloat
- Keeps recent job history for audit and debugging purposes
- Maintains failed jobs longer for analysis and troubleshooting

**Cache Cleanup**:
- Clears expired product listing cache entries
- Removes stale search result caches
- Frees up Redis memory by deleting old cached data

**Stuck Job Recovery**:
- Identifies scraping jobs stuck in "PROCESSING" status for more than 30 minutes
- Resets stuck jobs to "FAILED" status to allow retry or manual intervention
- Logs details of stuck jobs for investigation

**Rate Limit Maintenance**:
- Removes expired rate limiting records from Redis
- Cleans up old IP address tracking data
- Ensures rate limiting system remains performant

**Benefits**: Regular cleanup maintains system performance, prevents database growth issues, and ensures reliable operation over time. The automated maintenance reduces manual intervention and keeps the system running smoothly.

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

**Configuration**: Functions can be configured in vercel.json to extend maximum execution time based on the plan tier.

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

Create a Docker configuration file that sets up the worker environment:

**Base Image**: Uses Node.js 20 on Alpine Linux for a lightweight container

**Chromium Installation**: Installs Chromium browser and required dependencies (NSS, FreeType, HarfBuzz, fonts) for web scraping with Puppeteer

**Environment Setup**: 
- Configures Puppeteer to use the system-installed Chromium
- Sets up working directory and copies package files
- Installs pnpm and project dependencies

**Build Steps**:
- Generates Prisma Client for database access
- Optionally builds TypeScript files

**Health Monitoring**: 
- Exposes port 3001 for health checks
- Configures automatic health check endpoint at /health
- Worker automatically restarts if health check fails

**Startup**: Runs the scraper worker process using pnpm

#### Step 2: Add Health Check Server

Create a health monitoring HTTP server that runs alongside the worker:

**Purpose**: Allows Render to verify the worker is running and healthy

**Implementation**:
- Simple HTTP server listening on port 3001
- Responds to GET /health with worker status information
- Returns JSON with uptime, timestamp, and memory usage
- Returns 404 for all other routes

**Benefits**: Enables automatic restarts and monitoring without manual intervention

#### Step 3: Update Worker Script

Enhance the worker script with health monitoring and graceful shutdown:

**Health Server Integration**:
- Start health check server when worker initializes
- Keep server running in background while processing jobs

**Graceful Shutdown Handling**:
- Listen for SIGTERM signal (sent when Render stops the service)
- Close health check server cleanly
- Close Bull Queue connections properly
- Disconnect from database
- Exit process with success code

**Job Processing**: Main worker loop that continuously picks up and processes jobs from the queue

#### Step 4: Deploy to Render

**Deployment Steps**:

1. **Prepare Repository**: Commit Docker configuration and worker changes to Git, push to GitHub

2. **Create Render Service**:
   - Visit Render dashboard and create new Background Worker
   - Connect to your GitHub repository
   - Configure service settings (name, region, branch)
   - Select Docker as deployment method
   - Specify Dockerfile path

3. **Environment Variables**: Copy all production environment variables from Vercel (database URLs, Redis credentials, API keys, secrets)

4. **Deploy**: Trigger initial deployment and monitor logs for success

#### Step 5: Configure Worker URL in Vercel

Add the worker's health endpoint URL to Vercel environment variables for monitoring and status checks from the main application.

---

### Deployment to Railway

#### Step 1: Use Same Dockerfile

Railway supports the same Docker configuration used for Render deployment.

#### Step 2: Deploy to Railway

**Using Railway CLI**:

1. **Install CLI**: Install Railway command-line tool globally via npm
2. **Authentication**: Log in to Railway account via CLI
3. **Project Setup**: Initialize new Railway project in your repository
4. **Deploy**: Upload and deploy the worker service
5. **Configuration**: Add all required environment variables through CLI or dashboard
6. **Access**: Get the deployed service URL for monitoring

**Alternative**: Use Railway's web dashboard for visual deployment workflow

---

## Monitoring & Debugging

### Bull Queue Dashboard (Optional)

**Purpose**: Visual interface for monitoring job queue status and debugging

**Installation**: Add Bull Board packages to project dependencies for queue visualization

**Setup**: Create an admin API route that exposes the Bull Board dashboard, configure it to monitor the scraper queue

**Access**: Dashboard is available at a protected admin URL showing:
- Queue statistics (waiting, active, completed, failed jobs)
- Individual job details and progress
- Retry history and error logs
- Job timeline and performance metrics

**Security**: Should be protected with admin authentication

---

### Logging & Monitoring

#### Application Logging

The system uses a centralized logging utility that formats all log messages as structured JSON:

**Log Levels**:
- **Info**: General operational messages (job started, completed, etc.)
- **Warning**: Non-critical issues that should be reviewed
- **Error**: Failures and exceptions with full stack traces

**Log Format**: Each log entry includes:
- Severity level
- Descriptive message
- Additional metadata (job IDs, error details, etc.)
- ISO timestamp

**Benefits**: 
- Structured logs are easy to parse and search
- Can be ingested by log aggregation services
- Facilitates debugging and monitoring

#### Worker Metrics

The system tracks key performance indicators:

**Metrics Tracked**:
- Total jobs processed (success counter)
- Total jobs failed (failure counter)
- Average processing time per job
- Total products scraped across all jobs

**Metric Calculation**:
- Counters increment on job completion/failure events
- Processing time calculated from job start to finish
- Running average maintained for performance trends

**Metrics Endpoint**: Exposes current metrics via HTTP endpoint for external monitoring tools

---

### Debugging Tips

#### 1. Check Worker Logs

**Render Platform**:
- Access logs through Render dashboard
- View service logs in real-time
- Filter by log level and time range
- Download logs for offline analysis

**Railway Platform**:
- Use Railway CLI to stream logs to terminal
- Access logs through Railway dashboard
- View deployment history and logs per deployment

#### 2. Test Job Processing Locally

**Local Testing Workflow**:
1. Start the worker process locally in development mode
2. Open a second terminal to trigger test jobs via API calls
3. Monitor logs in first terminal to see job processing
4. Verify database updates and email sends

**Benefits**: Faster debugging cycle without deploying to production

#### 3. Inspect Redis Queue

**Using Redis CLI**:
- Connect to Upstash Redis using host, port, and password
- List all Bull Queue keys to see job data structure
- Retrieve specific job details by ID
- Check queue lengths for each status (waiting, active, completed, failed)

**Insights**: Helps identify queue bottlenecks, stuck jobs, or configuration issues

#### 4. Monitor Database Jobs

**Check for Stuck Jobs**:
- Query database for jobs in PROCESSING status longer than 30 minutes
- These indicate worker crashes or timeouts

**Recovery Actions**:
- Bulk update stuck jobs to FAILED status
- Add error message indicating timeout
- Jobs can then be retried manually or automatically

---

## Performance Optimization

### 1. Concurrency Control

Configure the worker to process multiple jobs simultaneously for better throughput. Set the concurrency level based on available CPU cores and memory. Higher concurrency increases throughput but requires more resources.

### 2. Job Prioritization

Assign priority levels to jobs to ensure important scraping tasks are processed first. Lower priority numbers indicate higher priority. Use this for urgent manual scrapes or high-value sellers.

### 3. Rate Limiting

Configure queue-level rate limiting to prevent overwhelming external websites. Set maximum jobs per time window to respect website rate limits and avoid IP bans.

### 4. Memory Management

**Automatic Cleanup**:
- Remove completed jobs from memory after processing
- Prevents memory leaks in long-running workers

**Job Retention Policies**:
- Keep last 1000 completed jobs (24 hour retention)
- Keep failed jobs for 7 days for debugging
- Older jobs automatically removed

**Benefits**: Keeps memory usage stable over time

---

## Best Practices

### 1. Idempotency

Design job processors to be idempotent (safe to retry):

**Check Before Processing**:
- Query database for existing records matching the external ID
- Skip processing if record already exists
- Return success with "already exists" reason

**Benefits**: Prevents duplicate data from retried jobs

### 2. Error Handling

Implement intelligent error handling based on error types:

**Rate Limit Errors**: Throw error to trigger retry with backoff
**Validation Errors**: Mark job as failed without retry (data issue, not system issue)
**Unknown Errors**: Log full details and throw to trigger retry

**Strategy**: Differentiate between transient failures (retry) and permanent failures (don't retry)

### 3. Progress Tracking

For long-running jobs with multiple pages:

**Implementation**:
- Update job progress percentage after each page
- Allows monitoring of in-progress jobs
- Helps estimate completion time

**Formula**: (current page / total pages) * 100

**Benefits**: Better visibility into long-running operations

---

## Production Deployment Requirements

### ⚠️ CRITICAL: Render Starter Required

**Render Free Tier is NOT suitable for production worker service.**

#### Why Render Starter ($7/month) is Required:

```
Render Free Tier Issues:
❌ Auto-sleep after 15 minutes of inactivity
❌ Cold start delay (30 seconds to wake up)
❌ Bull Queue worker cannot wake from sleep (no HTTP trigger)
❌ Scheduled/repeatable jobs will fail when worker sleeps
❌ Dashboard RUN button won't work properly
❌ Memory limit (512MB) insufficient for Chromium scraping

Render Starter ($7/month) Benefits:
✅ Always-on worker (no auto-sleep)
✅ No cold start delays
✅ Bull Queue worker always listening
✅ Dashboard RUN button works perfectly
✅ Repeatable jobs work as expected (every 6h, 24h, etc)
✅ Sufficient memory (512MB dedicated)
✅ Faster processing (dedicated CPU)
```

#### Deployment Architecture (Production):

```
┌─────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD (Primary Control)                      │
│  - Admin clicks RUN button                              │
│  - POST /api/admin/scraper/schedule-all                 │
│  - Creates repeatable jobs in Bull Queue                │
│  - Worker (Render Starter) processes continuously       │
│  - Jobs auto-repeat per seller's autoScrapeInterval     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS (Secondary - Cleanup Only)              │
│  - Daily cleanup-stuck-jobs (2 AM UTC)                  │
│  - Daily cleanup-rate-limits (2 AM UTC)                 │
│  - NO scraping triggers (dashboard handles this)        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  RENDER STARTER WORKER ($7/month - REQUIRED)            │
│  - Always-on, always listening to Bull Queue            │
│  - Processes scraping jobs immediately                  │
│  - Handles repeatable jobs (6h, 24h intervals)          │
│  - No sleep, no cold starts                             │
└─────────────────────────────────────────────────────────┘
```

### Deployment Steps (Render Starter)

#### Step 1: Create Render Account

Visit the Render website, sign up using your GitHub account, and authorize Render to access your repository.

#### Step 2: Create Background Worker

**Service Configuration**:
1. Create a new Background Worker service in Render dashboard
2. Connect your GitHub repository (goodseed-app-vercel)
3. Configure deployment settings:
   - Service name: goodseed-worker
   - Region: Oregon (US West) - closest to Neon and Upstash for low latency
   - Branch: main
   - Root directory: project root

**Build Configuration**:
- Build command: Install dependencies and generate Prisma Client
- Start command: Run the scraper worker script

**Plan Selection**: 
- Choose Starter plan ($7/month) - REQUIRED for production
- Free tier is not suitable (auto-sleep breaks functionality)

**Environment Variables**:
- Copy all production environment variables from Vercel
- Include database URLs, Redis credentials, API keys, and secrets

#### Step 3: Configure Environment Variables

Add all required environment variables to Render:

**Database Configuration (Neon)**:
- DATABASE_URL: PostgreSQL connection string with pooling
- DIRECT_URL: Direct PostgreSQL connection for migrations

**Redis Configuration (Upstash)**:
- REDIS_HOST: Upstash Redis hostname
- REDIS_PORT: Redis port (typically 6379)
- REDIS_PASSWORD: Redis authentication password
- REDIS_URL: Complete Redis connection URL with credentials

**Email Service (Resend)**:
- RESEND_API_KEY: API key for sending emails
- RESEND_FROM_EMAIL: Sender email address

**Authentication & Security**:
- AUTH_SECRET: NextAuth session encryption key
- CRON_SECRET: Secret for authenticating cron jobs

**Monitoring (Optional)**:
- NEXT_PUBLIC_SENTRY_DSN: Sentry error tracking URL

**Environment**:
- NODE_ENV: Set to "production"

#### Step 4: Deploy Worker

**Deployment Process**:
1. Click "Create Background Worker" to trigger initial deployment
2. Monitor deployment progress (typically 3-5 minutes)
3. Check deployment logs for successful startup messages
4. Verify health endpoint is responding (access worker URL /health)

**Expected Log Messages**:
- Worker started successfully
- Connected to Redis
- Listening for jobs
- Health endpoint ready

#### Step 5: Verify Worker is Running

**Health Check Verification**:
- Access the worker's /health endpoint via browser or curl
- Should return JSON with status, uptime, and timestamp
- Indicates worker is running and ready to process jobs

**Log Verification**:
Check Render dashboard logs for startup messages confirming:
- Bull Queue worker initialization
- Redis connection established
- Worker listening for jobs
- Health monitoring active

---

### Testing the Setup

#### Test 1: Dashboard RUN Button

**Testing Workflow**:
1. Log in to admin dashboard
2. Navigate to Auto Scraper configuration tab
3. Enable auto scraper for a test seller (set interval to 6 hours)
4. Click the RUN button to schedule jobs
5. Monitor Render logs to see job processing start immediately
6. Verify job completes successfully
7. Confirm job is scheduled to repeat automatically every 6 hours

**Expected Outcome**: Job processes immediately and repeats on schedule without manual intervention

#### Test 2: Manual Job Trigger

**Testing Workflow**:
1. Navigate to a specific seller's detail page
2. Click the "Manual Scrape" button
3. Switch to Render dashboard and watch logs
4. Confirm worker picks up the job immediately
5. Return to admin dashboard and verify job status updates in real-time
6. Check that products are scraped and saved to database

**Expected Outcome**: Manual scraping job processes immediately with live status updates

#### Test 3: Repeatable Jobs

**Testing Workflow**:
1. After clicking RUN button, wait for first job to complete
2. Use Redis CLI or Bull Board to inspect queue
3. Verify "repeat" job entry exists with correct schedule
4. Wait for configured interval (e.g., 6 hours) to pass
5. Confirm job triggers automatically without any manual action
6. Check logs show automatic job pickup and processing

**Expected Outcome**: Jobs repeat automatically on schedule without any external triggers

---

### Cost Breakdown

```
Production Setup (Required):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vercel Hobby:        $0/month (Free tier OK for app)
Neon Launch:         $19/month (10GB storage, production DB)
Upstash:             $10/month (Pay-as-you-go, production Redis)
Resend Pro:          $20/month (50K emails/month)
Render Starter:      $7/month (Always-on worker - REQUIRED)
Sentry Developer:    $0/month (5K errors/month free)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total:               $56/month

Optional Add-ons:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vercel Pro:          +$20/month (Better performance, cron jobs)
GitHub Copilot:      +$10/month (AI assistance)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Free Tier Alternative (Development Only)

**⚠️ NOT recommended for production, only for development/testing**

**Limitations of Free Tier**:
1. Worker requires external wake-up mechanism (GitHub Actions or similar)
2. Add custom /wake endpoint to worker for HTTP-based wake-up
3. External system must call /wake before triggering scraping jobs
4. Expect 30-second cold start delay every time worker wakes
5. Dashboard RUN button will not work reliably (worker sleeps after 15 minutes)
6. Requires manual intervention and monitoring

**Recommendation**: Always use Render Starter ($7/month) for production. The free tier is only suitable for development testing where occasional delays and manual wake-ups are acceptable.

For detailed free tier setup instructions, refer to the development setup documentation.

---

## Price Alert System Integration

### Overview

The scraper worker has been enhanced with an integrated price alert system that automatically detects significant price drops and notifies users who have those products in their wishlist. This feature runs as part of every scraping job, ensuring users receive timely notifications about price changes.

### Key Components

#### 1. Price History Tracking

Every time a scraping job runs, the system maintains a complete history of price changes:

- **Current Prices Table**: Stores the latest price information for each product variant (pack sizes)
- **Price History Table**: Archives previous prices before updating to new values
- **Critical Sequence**: The system saves the old price to history BEFORE updating to the new price, ensuring no price data is lost

This historical tracking enables accurate price comparison and change detection over time.

#### 2. Price Change Detection

After saving scraped product data, the worker automatically analyzes price changes:

- **Comparison Logic**: Compares newly scraped prices against the most recent historical prices for each product variant
- **Threshold Filtering**: Only detects significant price drops (5% or greater reduction)
- **Variant-Level Detection**: Analyzes each pack size separately, as different variants may have different price changes
- **Smart Filtering**: Ignores price increases and minor fluctuations to reduce notification noise

**Example Scenario**:
- Historical price for 5-seed pack: $84.50
- New scraped price: $65.00
- Calculated change: -23% (significant drop, triggers alert)
- Historical price for 10-seed pack: $156.00
- New scraped price: $158.00
- Calculated change: +1.3% (increase, no alert)

#### 3. User Notification Targeting

The system intelligently identifies which users should be notified:

- **Opt-In Mechanism**: Only users who have enabled price alerts in their account settings receive notifications
- **Wishlist Matching**: System queries users who have the price-dropped products in their wishlist
- **Batch Processing**: Groups multiple price drops for the same user into a single email to avoid spam
- **Personalization**: Each notification includes only products relevant to that specific user

#### 4. Email Notification Delivery

Users receive professional, informative price alert emails:

- **Email Template**: Dedicated price alert email design with product images, old/new prices, and savings percentage
- **Product Details**: Includes product name, seller information, pack size, and direct purchase link
- **Savings Calculation**: Clearly shows the dollar amount saved and percentage discount
- **Call-to-Action**: Direct links to product pages for easy purchasing
- **Delivery Service**: Uses Resend API for reliable email delivery with tracking

### Workflow Integration

The price alert system seamlessly integrates into the existing scraper workflow:

**Step-by-Step Process**:

1. **Scraper Execution**: Worker picks up a scraping job from the queue and extracts product data from seller website
2. **Data Normalization**: Scraped data is validated and normalized to standard format
3. **Database Update**: System saves old prices to history table, then updates current prices with new values
4. **Product ID Population**: Maps scraped products to database records using product slugs
5. **Price Analysis**: Compares new prices against historical data for all affected products
6. **User Lookup**: Queries database for users who have price-dropped products in wishlist AND price alerts enabled
7. **Email Generation**: Creates personalized email content for each eligible user
8. **Notification Delivery**: Sends emails via Resend API and logs delivery status
9. **Job Completion**: Updates scraping job record with statistics (products scraped, price changes detected, emails sent)

### Performance Considerations

The integrated price alert system is designed for efficiency:

- **Single Job Execution**: All price detection and notification happens within the same scraping job, avoiding additional queue overhead
- **Database Optimization**: Uses efficient queries with proper indexes on pricing history and wishlist tables
- **Conditional Processing**: Only performs user lookup and email sending when price drops are detected
- **Batch Email Sending**: Groups notifications to minimize API calls while respecting rate limits
- **Async Operations**: Email sending runs asynchronously to avoid blocking the scraping workflow

### User Experience

From the user's perspective, the price alert system provides:

- **Automatic Monitoring**: Users don't need to manually check prices; the system watches their wishlist continuously
- **Timely Notifications**: Email alerts arrive shortly after scraping detects price drops (typically within minutes)
- **Relevant Information**: Only receive notifications for products they've added to wishlist
- **Actionable Alerts**: Each email includes direct links to purchase at the reduced price
- **Control**: Users can opt-in or opt-out of price alerts in their account settings at any time

### Business Benefits

The price alert system enhances the platform's value proposition:

- **User Engagement**: Encourages users to create accounts and maintain wishlists
- **Return Visits**: Brings users back to the platform when favorable prices are available
- **Purchase Conversion**: Timely price drop alerts increase likelihood of purchases
- **Competitive Advantage**: Automated price monitoring differentiates the platform from competitors
- **User Retention**: Valuable feature that keeps users engaged with the platform

### Technical Reliability

The system includes robust error handling and monitoring:

- **Graceful Degradation**: If price detection fails, the scraping job still completes successfully
- **Error Logging**: All failures are logged with detailed context for debugging
- **Retry Logic**: Failed email deliveries are automatically retried with exponential backoff
- **Health Monitoring**: Price alert metrics are tracked (detections, notifications sent, failures)
- **Audit Trail**: Complete history of price changes and notifications is maintained in database

### Future Enhancements

Potential improvements for the price alert system:

- **Custom Thresholds**: Allow users to set their own price drop percentage thresholds
- **Price Target Alerts**: Notify users when products reach a specific target price
- **Frequency Control**: Let users choose notification frequency (immediate, daily digest, weekly)
- **Multi-Channel Notifications**: Add SMS or push notifications in addition to email
- **Price Trend Analysis**: Show historical price charts and trend predictions
- **Competitor Comparison**: Alert users when prices are better on specific sellers

### Related Documentation

For detailed technical implementation and data flow, refer to:
- [Price Alert Worker Flow](../production-docs(important)/PRICE-ALERT-WORKER-FLOW.md) - Complete technical specification with database schema and query patterns

---

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT-GUIDE.md)
- [Upstash Redis Setup](./UPSTASH-REDIS.md)
- [Monitoring Guide](./MONITORING.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Scaling Guide](./SCALING-GUIDE.md)
- [Price Alert Worker Flow](../production-docs(important)/PRICE-ALERT-WORKER-FLOW.md)

---

**Last Updated**: 2026-02-04  
**Critical Note**: Render Starter ($7/month) is REQUIRED for production worker service.
