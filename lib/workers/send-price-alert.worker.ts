/**
 * Send Price Alert Email Worker
 * 
 * Pipeline Step 2: Email Delivery (Terminal Step)
 * - Receives user info and price changes
 * - Generates email from template
 * - Sends email via Resend
 * - No further jobs emitted
 * 
 * @module lib/workers/send-price-alert.worker
 */

import { apiLogger } from '@/lib/helpers/api-logger';
import { 
  sendPriceAlertQueue, 
  processSendPriceAlertEmailJob,
  closeSendPriceAlertQueue,
} from '@/lib/queue/send-price-alert';

/**
 * Initialize Send Price Alert Email Worker
 * Sets up queue processor and event handlers
 */
export async function initializeSendPriceAlertWorker() {
  try {
    apiLogger.info('[Send Price Alert Worker] 🔧 Initializing...');
    
    // Start processing jobs
    sendPriceAlertQueue.process(processSendPriceAlertEmailJob);
    
    // ========================================
    // Event Handlers
    // ========================================
    
    sendPriceAlertQueue.on('completed', (job, result) => {
      apiLogger.info('[Send Price Alert Worker] ✅ Job completed', {
        jobId: job.id,
        userId: job.data.userId,
        email: result?.recipientEmail,
        emailSent: result?.emailSent,
        messageId: result?.messageId,
        priceChangesCount: result?.priceChangesCount,
      });
    });

    sendPriceAlertQueue.on('failed', (job, err) => {
      apiLogger.logError(
        '[Send Price Alert Worker] ❌ Job failed', 
        err,
        {
          jobId: job?.id,
          userId: job?.data.userId,
          email: job?.data.email,
          userName: job?.data.userName,
        }
      );
    });

    sendPriceAlertQueue.on('error', (error) => {
      apiLogger.logError(
        '[Send Price Alert Worker] ❌ Queue error', 
        new Error(error.message)
      );
    });

    sendPriceAlertQueue.on('stalled', (job) => {
      apiLogger.info('[Send Price Alert Worker] ⚠️ Job stalled', {
        jobId: job.id,
        userId: job.data.userId,
        email: job.data.email,
      });
    });
    
    apiLogger.info('[Send Price Alert Worker] ✅ Worker initialized');
  } catch (error) {
    apiLogger.logError(
      '[Send Price Alert Worker] ❌ Failed to initialize', 
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

/**
 * Cleanup Send Price Alert Email Worker
 * Gracefully shutdown queue
 */
export async function cleanupSendPriceAlertWorker() {
  try {
    apiLogger.info('[Send Price Alert Worker] 🧹 Cleaning up...');
    
    await closeSendPriceAlertQueue();
    
    apiLogger.info('[Send Price Alert Worker] ✅ Cleaned up');
  } catch (error) {
    apiLogger.logError(
      '[Send Price Alert Worker] ❌ Error cleaning up', 
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
