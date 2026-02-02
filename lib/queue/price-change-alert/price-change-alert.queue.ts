/**
 * Price Change Alert Queue Configuration
 * 
 * Queue chuyên xử lý các tác vụ liên quan đến price alerts:
 * - Detect price changes từ scraped data
 * - Gửi email thông báo cho users
 * - Schedule periodic price checks
 */

import Queue from 'bull';
import { ioredis } from '../../redis';
import { apiLogger } from '@/lib/helpers/api-logger';
import type { PriceAlertJobData } from './price-change-alert.jobs';

/**
 * Initialize Price Alert Queue
 * 
 * Configuration:
 * - Redis connection từ shared redis instance
 * - Retry logic: 3 attempts với exponential backoff
 * - Auto cleanup: completed jobs sau 24h, failed jobs sau 7 ngày
 */
export const priceAlertQueue = new Queue<PriceAlertJobData>('price-alert-jobs', {
  redis: ioredis as any, // Type assertion để fix Bull compatibility issue
  defaultJobOptions: {
    // Retry configuration
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s → 25s → 125s
    },
    // Job retention policies
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 604800, // 7 days - keep failed jobs longer for debugging
    },
  },
});

/**
 * Event Handlers
 * Monitor queue health và log các sự kiện quan trọng
 */

// Job completed successfully
priceAlertQueue.on('completed', (job) => {
  apiLogger.info(`[Price Alert Queue] Job ${job.id} completed`, {
    jobId: job.id,
    type: job.data.type,
    duration: job.finishedOn ? job.finishedOn - job.processedOn! : 0,
  });
});

// Job failed after all retries
priceAlertQueue.on('failed', (job, err) => {
  apiLogger.logError(`[Price Alert Queue] Job ${job?.id} failed`, err, {
    jobId: job?.id,
    type: job?.data.type,
    attemptsMade: job?.attemptsMade,
  });
});

// Job stalled (worker died or took too long)
priceAlertQueue.on('stalled', (job) => {
  apiLogger.warn(`[Price Alert Queue] Job ${job.id} stalled`, {
    jobId: job.id,
    type: job.data.type,
  });
});

// Job is waiting to be processed
priceAlertQueue.on('waiting', (jobId) => {
  apiLogger.debug(`[Price Alert Queue] Job ${jobId} is waiting`);
});

// Job is now being processed
priceAlertQueue.on('active', (job) => {
  apiLogger.debug(`[Price Alert Queue] Job ${job.id} started processing`, {
    jobId: job.id,
    type: job.data.type,
  });
});

/**
 * Queue Health Monitoring
 * Check queue stats định kỳ
 */
export async function getPriceAlertQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    priceAlertQueue.getWaitingCount(),
    priceAlertQueue.getActiveCount(),
    priceAlertQueue.getCompletedCount(),
    priceAlertQueue.getFailedCount(),
    priceAlertQueue.getDelayedCount(),
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
 * Graceful Shutdown
 * Cleanup queue connection khi app shutdown
 */
export async function closePriceAlertQueue() {
  apiLogger.info('[Price Alert Queue] Closing queue...');
  await priceAlertQueue.close();
  apiLogger.info('[Price Alert Queue] Queue closed');
}

export default priceAlertQueue;
