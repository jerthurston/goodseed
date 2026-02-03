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
 * Controls how many scraper jobs can run simultaneously
 * 
 * @example
 * - 1: Process one seller at a time (sequential)
 * - 2: Process two sellers simultaneously
 * - 3+: Process multiple sellers in parallel (may increase resource usage)
 */
export const SCRAPER_CONCURRENCY = 2;

/**
 * Queue options configuration
 * - Redis connection (Upstash with TLS support)
 * - Job retry strategy (3 attempts with exponential backoff)
 * - Rate limiting (30 jobs/minute)
 * - Job retention policy
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
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential', // Exponential backoff: 5s, 10s, 20s
      delay: 5000, // Start with 5 seconds
    },
    removeOnComplete: false, // Keep completed jobs for analytics
    removeOnFail: false, // Keep failed jobs for debugging
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

