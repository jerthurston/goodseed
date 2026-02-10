/**
 * Detect Price Changes Queue Configuration
 * 
 * Purpose: Queue for detecting price changes from scraped product data
 * Triggered by: Scraper job completion
 * Emits: send-price-alert jobs (one per user to notify)
 * 
 * @module lib/queue/detect-price-changes
 */

import Bull, { Queue, QueueOptions } from 'bull';
import { redisConfig } from '@/lib/redis';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Queue name constant
 */
export const DETECT_PRICE_CHANGES_QUEUE_NAME = 'detect-price-changes';

/**
 * Queue options configuration
 */
const queueOptions: QueueOptions = {
  redis: {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    ...(redisConfig.tls && {
      tls: {
        rejectUnauthorized: false,
      },
    }),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 25s, 125s
    },
    removeOnComplete: {
      age: 86400, // Keep for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // Keep failed for 7 days
      count: 500,
    },
  },
};

/**
 * Detect Price Changes Queue Instance
 */
export const detectPriceChangesQueue: Queue = new Bull(
  DETECT_PRICE_CHANGES_QUEUE_NAME,
  queueOptions
);

/**
 * Get queue statistics
 */
export async function getDetectPriceChangesQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    detectPriceChangesQueue.getWaitingCount(),
    detectPriceChangesQueue.getActiveCount(),
    detectPriceChangesQueue.getCompletedCount(),
    detectPriceChangesQueue.getFailedCount(),
    detectPriceChangesQueue.getDelayedCount(),
  ]);

  return {
    queueName: DETECT_PRICE_CHANGES_QUEUE_NAME,
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}

/**
 * Close queue connection gracefully
 */
export async function closeDetectPriceChangesQueue() {
  apiLogger.info('[Detect Price Changes Queue] Closing queue...');
  await detectPriceChangesQueue.close();
  apiLogger.info('[Detect Price Changes Queue] Queue closed');
}

export default detectPriceChangesQueue;
