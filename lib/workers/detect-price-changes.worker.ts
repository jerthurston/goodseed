/**
 * Detect Price Changes Worker
 * 
 * Pipeline Step 1: Price Detection
 * - Receives scraped product data
 * - Compares with database prices
 * - Detects significant price drops (≥5%)
 * - Emits send-price-alert jobs for affected users
 * 
 * @module lib/workers/detect-price-changes.worker
 */

import { apiLogger } from '@/lib/helpers/api-logger';
import { 
  detectPriceChangesQueue, 
  processDetectPriceChangesJob,
  closeDetectPriceChangesQueue,
} from '@/lib/queue/detect-price-changes';

/**
 * Initialize Detect Price Changes Worker
 * Sets up queue processor and event handlers
 */
export async function initializeDetectPriceChangesWorker() {
  try {
    apiLogger.info('[Detect Price Changes Worker] 🔧 Initializing...');
    
    // Start processing jobs
    detectPriceChangesQueue.process(processDetectPriceChangesJob);
    
    // ========================================
    // Event Handlers
    // ========================================
    
    detectPriceChangesQueue.on('completed', (job, result) => {
      apiLogger.info('[Detect Price Changes Worker] ✅ Job completed', {
        jobId: job.id,
        sellerId: job.data.sellerId,
        sellerName: job.data.sellerName,
        productsScraped: job.data.scrapedProducts.length,
        priceChangesDetected: result?.priceChangesDetected,
        usersToNotify: result?.usersToNotify,
        emailJobsCreated: result?.emailJobsCreated,
      });
    });

    detectPriceChangesQueue.on('failed', (job, err) => {
      apiLogger.logError(
        '[Detect Price Changes Worker] ❌ Job failed', 
        err,
        {
          jobId: job?.id,
          sellerId: job?.data.sellerId,
          sellerName: job?.data.sellerName,
        }
      );
    });

    detectPriceChangesQueue.on('error', (error) => {
      apiLogger.logError(
        '[Detect Price Changes Worker] ❌ Queue error', 
        new Error(error.message)
      );
    });

    detectPriceChangesQueue.on('stalled', (job) => {
      apiLogger.info('[Detect Price Changes Worker] ⚠️ Job stalled', {
        jobId: job.id,
        sellerId: job.data.sellerId,
      });
    });
    
    apiLogger.info('[Detect Price Changes Worker] ✅ Worker initialized');
  } catch (error) {
    apiLogger.logError(
      '[Detect Price Changes Worker] ❌ Failed to initialize', 
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

/**
 * Cleanup Detect Price Changes Worker
 * Gracefully shutdown queue
 */
export async function cleanupDetectPriceChangesWorker() {
  try {
    apiLogger.info('[Detect Price Changes Worker] 🧹 Cleaning up...');
    
    await closeDetectPriceChangesQueue();
    
    apiLogger.info('[Detect Price Changes Worker] ✅ Cleaned up');
  } catch (error) {
    apiLogger.logError(
      '[Detect Price Changes Worker] ❌ Error cleaning up', 
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
