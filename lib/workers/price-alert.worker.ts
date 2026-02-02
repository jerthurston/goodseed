/**
 * Price Alert Worker Logic
 * 
 * Handles initialization and processing of price alert queue
 * This module exports functions to be used by the main worker
 * 
 * @module lib/workers/price-alert.worker
 */

import { apiLogger } from '@/lib/helpers/api-logger';
import { priceAlertQueue, processPriceAlertJob } from '@/lib/queue/price-change-alert';

/**
 * Initialize Price Alert Queue Processor
 * Sets up queue processor and event handlers for price alert jobs
 */
export async function initializePriceAlertWorker() {
  try {
    apiLogger.info('[Price Alert Worker] 🔧 Initializing price-alert queue processor...');
    
    // Start processing price alert jobs
    priceAlertQueue.process(processPriceAlertJob);
    
    // Price alert queue event handlers
    priceAlertQueue.on('completed', (job) => {
      apiLogger.info('[Price Alert Queue] Job completed', {
        jobId: job.id,
        type: job.data.type
      });
    });

    priceAlertQueue.on('failed', (job, err) => {
      apiLogger.logError('[Price Alert Queue] Job failed', err, {
        jobId: job?.id,
        type: job?.data.type
      });
    });

    priceAlertQueue.on('error', (error) => {
      apiLogger.logError('[Price Alert Queue] Queue error', new Error(error.message));
    });
    
    apiLogger.info('[Price Alert Worker] ✅ Price-alert queue processor initialized');
  } catch (error) {
    apiLogger.logError('[Price Alert Worker] ❌ Failed to initialize price-alert processor', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Cleanup Price Alert Worker
 * Gracefully shutdown price alert services and close queue
 */
export async function cleanupPriceAlertWorker() {
  try {
    apiLogger.info('[Price Alert Worker] 🧹 Cleaning up price alert worker...');
    
    // Close price alert queue
    await priceAlertQueue.close();
    
    apiLogger.info('[Price Alert Worker] ✅ Price alert worker cleaned up');
  } catch (error) {
    apiLogger.logError('[Price Alert Worker] ❌ Error cleaning up price alert worker', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
