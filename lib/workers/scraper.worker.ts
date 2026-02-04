/**
 * Scraper Worker Logic
 * 
 * Handles initialization and processing of scraper queue
 * This module exports functions to be used by the main worker
 * 
 * Chained Pipeline:
 * - Process scraper jobs (web scraping, data normalization)
 * - Emit price detection jobs on successful completion
 * 
 * @module lib/workers/scraper.worker
 */

import { apiLogger } from '@/lib/helpers/api-logger';
import { scraperQueue, processScraperJob, SCRAPER_CONCURRENCY } from '@/lib/queue/scraper-queue';
import { createDetectPriceChangesJob } from '@/lib/queue/detect-price-changes';
import { initializeWorkerSync, cleanupWorkerSync } from './worker-initialization';

/**
 * Initialize Scraper Queue Processor
 * Sets up queue processor and event handlers for scraper jobs
 */
export async function initializeScraperWorker() {
  try {
    apiLogger.info('[Scraper Worker] 🔧 Initializing scraper queue processor...');
    
    // Initialize scraper-specific services (auto-scheduler, job sync, etc.)
    await initializeWorkerSync();
    
    // Start processing scraper jobs with configured concurrency
    // Concurrency setting controls how many sellers can be scraped simultaneously
    scraperQueue.process(SCRAPER_CONCURRENCY, processScraperJob);
    
    apiLogger.info('[Scraper Worker] Worker concurrency configured', {
      concurrency: SCRAPER_CONCURRENCY,
    });
    
    // ⭐ CHAINED PIPELINE: Scraper queue event handlers
    
    // Job completed - Emit price detection job
    scraperQueue.on('completed', async (job, result) => {
      apiLogger.info('[Scraper Worker] Job completed', {
        jobId: job.id,
        sellerId: result?.sellerId,
        productsScraped: result?.totalProducts,
      });

      // Emit price detection job if scraping was successful
      if (result && result.success && result.products && result.products.length > 0) {
        try {
          await createDetectPriceChangesJob({
            sellerId: result.sellerId,
            sellerName: result.sellerName || result.sellerId,
            scrapedProducts: result.products,
            scrapedAt: new Date(),
          });

          apiLogger.info('[Scraper Worker] ✅ Price detection job emitted', {
            jobId: job.id,
            sellerId: result.sellerId,
            productCount: result.products.length,
          });
        } catch (error) {
          apiLogger.logError(
            '[Scraper Worker] ❌ Failed to emit price detection job',
            error instanceof Error ? error : new Error(String(error)),
            {
              jobId: job.id,
              sellerId: result.sellerId,
            }
          );
          // Don't throw - scraping was successful, just log the error
        }
      } else {
        apiLogger.info('[Scraper Worker] ⚠️ Skipping price detection - no products scraped', {
          jobId: job.id,
          success: result?.success,
          productsCount: result?.products?.length || 0,
        });
      }
    });

    scraperQueue.on('failed', (job, error) => {
      apiLogger.logError('[Scraper Worker] Job failed', new Error(error.message), {
        jobId: job?.id,
        sellerId: job?.data?.sellerId,
      });
    });

    scraperQueue.on('error', (error) => {
      apiLogger.logError('[Scraper Worker] Queue error', new Error(error.message));
    });
    
    apiLogger.info('[Scraper Worker] ✅ Scraper queue processor initialized');
  } catch (error) {
    apiLogger.logError('[Scraper Worker] ❌ Failed to initialize scraper processor', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Cleanup Scraper Worker
 * Gracefully shutdown scraper services and close queue
 */
export async function cleanupScraperWorker() {
  try {
    apiLogger.info('[Scraper Worker] 🧹 Cleaning up scraper worker...');
    
    // Cleanup scraper-specific services
    await cleanupWorkerSync();
    
    // Close scraper queue
    await scraperQueue.close();
    
    apiLogger.info('[Scraper Worker] ✅ Scraper worker cleaned up');
  } catch (error) {
    apiLogger.logError('[Scraper Worker] ❌ Error cleaning up scraper worker', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
