/**
 * Scraper Queue Service - Bull Queue with Redis
 * 
 * Manages background scraping jobs with retry logic and progress tracking
 * 
 * @usage
 * ```typescript
 * import { scraperQueue, addScraperJob } from '@/lib/queue/scraper-queue';
 * 
 * // Add job to queue
 * const job = await addScraperJob({
 *   jobId: 'scrape_xyz',
 *   sellerId: 'seller_123',
 *   mode: 'auto',
 *   config: { ... }
 * });
 * 
 * // Check job status
 * const status = await job.getState();
 * ```
 */

import Bull, { Job, Queue } from 'bull';
import Redis from 'ioredis';

// Redis connection configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

// Create Redis client for Bull
const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Job data interface
export interface ScraperJobData {
  jobId: string; // ScrapeJob.jobId from database
  sellerId: string;
  source: string; // scraper source: 'vancouverseedbank' | 'sunwestgenetics' | 'cropkingseeds'
  mode: 'batch' | 'auto' | 'manual' | 'test';
  config: {
    scrapingSourceUrl: string;
    startPage?: number;
    endPage?: number;
    maxPages?: number;
    fullSiteCrawl?: boolean;
  };
}

// Queue options
const queueOptions: Bull.QueueOptions = {
  redis: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds, double each retry
    },
    removeOnComplete: false, // Keep completed jobs for history
    removeOnFail: false, // Keep failed jobs for debugging
  },
};

// Create Bull queue
export const scraperQueue: Queue<ScraperJobData> = new Bull('scraper-queue', queueOptions);

// Event handlers
scraperQueue.on('error', (error) => {
  console.error('[Scraper Queue] Error:', error);
});

scraperQueue.on('failed', (job, error) => {
  console.error(`[Scraper Queue] Job ${job.id} failed:`, error.message);
});

scraperQueue.on('completed', (job) => {
  console.log(`[Scraper Queue] Job ${job.id} completed successfully`);
});

scraperQueue.on('active', (job) => {
  console.log(`[Scraper Queue] Job ${job.id} started processing`);
});

/**
 * Add a new scraping job to the queue
 * Returns Bull Job instance for tracking
 */
export async function addScraperJob(data: ScraperJobData): Promise<Job<ScraperJobData>> {
  const job = await scraperQueue.add(data, {
    jobId: data.jobId, // Use our jobId as Bull job ID for easy tracking
    priority: data.mode === 'manual' ? 10 : 5, // Manual jobs get higher priority
  });

  console.log(`[Scraper Queue] Added job ${job.id} to queue`);
  return job;
}

/**
 * Get job by ID from queue
 */
export async function getJob(jobId: string): Promise<Job<ScraperJobData> | null> {
  return scraperQueue.getJob(jobId);
}

/**
 * Remove job from queue (cancel)
 */
export async function removeJob(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (job) {
    await job.remove();
    console.log(`[Scraper Queue] Removed job ${jobId}`);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
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

/**
 * Clean old jobs from queue
 * @param grace - Keep jobs completed/failed within this time (ms)
 */
export async function cleanQueue(grace: number = 24 * 60 * 60 * 1000) {
  await scraperQueue.clean(grace, 'completed');
  await scraperQueue.clean(grace, 'failed');
  console.log(`[Scraper Queue] Cleaned jobs older than ${grace}ms`);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Scraper Queue] Closing queue...');
  await scraperQueue.close();
  await redisClient.quit();
});

export default scraperQueue;
