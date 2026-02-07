/**
 * Scraper Queue Configuration
 * 
 * Module này chịu trách nhiệm:
 * - Khởi tạo Bull queue instance với Redis
 * - Cấu hình queue options (retry, limiter, etc.)
 * - Event handlers cho queue lifecycle
 * 
 * Job creators và processors được tách ra module riêng:
 * - scraper.jobs.ts: Job creation & management functions
 * - scraper.processor.ts: Job processing logic
 */

import Bull, { Queue, QueueOptions } from 'bull';
import { apiLogger } from '@/lib/helpers/api-logger';
import { redisConfig } from '@/lib/redis';
// Re-export types from scraper.jobs.ts
export type { ScraperJobData, RepeatJobOptions } from './scraper.jobs';

// ============================================================================
// QUEUE CONFIGURATION
// ============================================================================

/**
 * Worker concurrency configuration
 * Controls how many scraper jobs can run simultaneously in Bull queue
 * 
 * This constant is exported and used in:
 * - lib/workers/scraper.worker.ts: scraperQueue.process(SCRAPER_CONCURRENCY, ...)
 * 
 * Configuration:
 * - Reads from WORKER_CONCURRENCY environment variable
 * - Default: 1 (sequential processing)
 * 
 * @example
 * - 1: Process one seller at a time (sequential) - RECOMMENDED for Render Starter (512MB RAM)
 * - 2: Process two sellers simultaneously - Requires more memory
 * - 3+: Process multiple sellers in parallel - High resource usage, not recommended for low-tier plans
 */

/**
 * KHUYẾN NGHỊ: GIỮ NGUYÊN SCRAPER_CONCURRENCY ở scraper.queue.ts
Reasons:
✅ Actually used: scraperQueue.process(SCRAPER_CONCURRENCY, ...) trong worker
✅ Architectural fit: Queue config thuộc về queue module
✅ Export pattern: Exported qua barrel export cho worker sử dụng
✅ Single source of truth: Tránh duplicate constants
✅ Environment-driven: Đọc từ WORKER_CONCURRENCY env var (flexible)
Architecture:
scraper.queue.ts (Config) 
    ↓ exports SCRAPER_CONCURRENCY
index.ts (Barrel) 
    ↓ re-exports
scraper.worker.ts (Consumer) 
    ↓ uses in scraperQueue.process()

---->Note: Đây là best practice cho Bull queue architecture! 
 */
export const SCRAPER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '1', 10);

/**
 * Queue options configuration
 * - Redis connection (Upstash with TLS support)
 * - Job retry strategy (3 attempts with exponential backoff)
 * - Rate limiting (30 jobs/minute)
 * - Job retention policy
 * - Long-running job settings (lockDuration for scraping that can take 5-10 minutes)
 */
const queueOptions: QueueOptions = {
  redis: {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    // Enable TLS for Upstash Redis (rediss://)
    ...(redisConfig.tls && {
      tls: {
        rejectUnauthorized: false, // Required for Upstash
      },
    }),
    // Connection optimization
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
  // Settings for long-running scraping jobs
  // CRITICAL: Some sellers are MASSIVE and take 3-4 HOURS
  // 
  // Real-world measured timings from production:
  // - Rocket Seeds: 4 sitemaps × 1000 URLs = 4000 products → 3-4 hours
  // - Vancouver Seed Bank: ~2000 products → 1.5-2 hours
  // - Sonoma Seeds: ~1500 products → 1-1.5 hours
  // - Small sellers (<100 products): 5-10 minutes
  // 
  // Why jobs take this long:
  // 1. Rate limiting: 30 jobs/minute = 2 seconds per page
  // 2. Network latency: Each request takes 1-3 seconds
  // 3. HTML parsing + data extraction: ~0.5 seconds per product
  // 4. Database operations: Upsert + price change detection
  // 5. Multiple sitemaps: Some sellers split products across 4-10 sitemaps
  // 
  // Bull Queue "Stalled" Detection Logic:
  // - Bull expects workers to renew lock every lockRenewTime (lockDuration/2)
  // - If lock not renewed before lockDuration expires → Job marked as STALLED
  // - This is to detect crashed workers
  // 
  // Our challenge:
  // - Legitimate jobs can run 3-4 hours
  // - Must set lockDuration high enough for largest sellers
  // - But still detect real crashes reasonably fast
  settings: {
    // Lock Duration: Maximum time a job can run before being considered stalled
    // Set to 5 HOURS (300 minutes) to handle even Rocket Seeds (4000 products)
    // 
    // Calculation:
    // - Worst case: 4000 URLs × 2 seconds = 8000 seconds = 133 minutes
    // - Add safety buffer: ×2 for slow networks/servers = 266 minutes
    // - Round up: 300 minutes (5 hours) for absolute safety
    lockDuration: 18000000, // 5 hours (18,000,000ms = 300 minutes)
    
    // Stalled Interval: How often Bull checks for stalled jobs
    // Set to 10 minutes - Balance between:
    // - Fast crash detection (within 10-20 min)
    // - Low Redis overhead (don't check every 30 seconds)
    stalledInterval: 600000, // 10 minutes (600,000ms)
    
    // Max Stalled Count: How many times job can stall before failure
    // Set to 1 because:
    // - With 5-hour lockDuration, legitimate jobs NEVER stall
    // - If stalled once = worker actually crashed
    // - No need to retry, move to failed immediately
    maxStalledCount: 1,
  },
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential', // Exponential backoff: 5s, 10s, 20s
      delay: 5000, // Start with 5 seconds
    },
    // Job Retention Policy (Important for Redis memory management)
    // Each completed job stores FULL product data (can be 10-50+ products)
    // With 11 sellers running daily auto-scrape, this adds up quickly!
    removeOnComplete: {
      age: 7 * 24 * 60 * 60, // Keep for 7 days (604,800 seconds)
      count: 100,            // Keep max 100 most recent completed jobs
    },
    removeOnFail: {
      age: 14 * 24 * 60 * 60, // Keep failed jobs longer for debugging (14 days)
      count: 50,              // Keep max 50 failed jobs
    },
  },
  limiter: {
    max: 30,        // Max 30 jobs per minute (can adjust per seller if needed)
    duration: 60000, // 1 minute
  },
};

// ============================================================================
// QUEUE INSTANCE
// ============================================================================

/**
 * Bull queue instance for scraper jobs
 * 
 * This queue handles:
 * - Manual scraping jobs (immediate execution, priority 10)
 * - Auto scraping jobs (scheduled with cron, priority 5)
 */
export const scraperQueue: Queue = new Bull('scraper-queue', queueOptions);

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Queue event listeners for monitoring and logging
 */

scraperQueue.on('error', (error) => {
  apiLogger.logError('[Scraper Queue] Error:', { error });
});

scraperQueue.on('stalled', (job) => {
  apiLogger.logError(`[Scraper Queue] Job ${job.id} stalled – worker may have crashed. Manual intervention may be needed.`, {
    jobData: job.data,
  });
});

scraperQueue.on('failed', (job, error) => {
  apiLogger.logError(`[Scraper Queue] Job ${job.id} failed:`, { error });
});

scraperQueue.on('completed', (job, result) => {
  apiLogger.info(`[Scraper Queue] Job ${job.id} completed successfully`, {
    sellerId: result?.sellerId,
    productsScraped: result?.totalProducts,
    saved: result?.saved,
    updated: result?.updated,
  });
  // Note: Price detection job will be emitted by scraper worker
  // See: lib/workers/scraper.worker.ts
});

scraperQueue.on('active', (job) => {
  apiLogger.info(`[Scraper Queue] Job ${job.id} started processing`);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Handle graceful shutdown on process termination
 */
process.on('SIGTERM', async () => {
  apiLogger.info('[Scraper Queue] Closing queue...');
  await scraperQueue.close();
});

process.on('SIGINT', async () => {
  apiLogger.info('[Scraper Queue] Received SIGINT – closing queue gracefully...');
  await scraperQueue.close();
});

// ============================================================================
// EXPORTS
// ============================================================================

// Named export for consistency with other queue modules
export default scraperQueue;

