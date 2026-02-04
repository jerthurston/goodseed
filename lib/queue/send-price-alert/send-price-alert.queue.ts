/**
 * Send Price Alert Email Queue Configuration
 * 
 * Purpose: Queue for sending price alert emails to individual users
 * Triggered by: detect-price-changes job completion
 * Terminal step: Does not emit further jobs
 * 
 * @module lib/queue/send-price-alert
 */

import Queue from 'bull';
import { redisConfig } from '@/lib/redis';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Queue name constant
 */
export const SEND_PRICE_ALERT_QUEUE_NAME = 'send-price-alert';

/**
 * Send Price Alert Email Queue Instance
 */
export const sendPriceAlertQueue = new Queue(
  SEND_PRICE_ALERT_QUEUE_NAME,
  {
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
        delay: 2000, // 2s, 4s, 8s (faster retry for emails)
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
  }
);

/**
 * Get queue statistics
 */
export async function getSendPriceAlertQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    sendPriceAlertQueue.getWaitingCount(),
    sendPriceAlertQueue.getActiveCount(),
    sendPriceAlertQueue.getCompletedCount(),
    sendPriceAlertQueue.getFailedCount(),
    sendPriceAlertQueue.getDelayedCount(),
  ]);

  return {
    queueName: SEND_PRICE_ALERT_QUEUE_NAME,
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
export async function closeSendPriceAlertQueue() {
  apiLogger.info('[Send Price Alert Queue] Closing queue...');
  await sendPriceAlertQueue.close();
  apiLogger.info('[Send Price Alert Queue] Queue closed');
}

export default sendPriceAlertQueue;
