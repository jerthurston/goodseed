/**
 * Scraper Worker Logic
 * 
 * Handles initialization and processing of scraper queue
 * This module exports functions to be used by the main worker
 * 
 * @module lib/workers/scraper.worker
 */

import { apiLogger } from '@/lib/helpers/api-logger';
import { scraperQueue, processScraperJob } from '@/lib/queue/scraper-queue';
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
    
    // Start processing scraper jobs
    scraperQueue.process(processScraperJob);
    
    // Scraper queue event handlers
    scraperQueue.on('completed', (job, result) => {
      apiLogger.info('[Scraper Queue] Job completed', {
        jobId: job.id,
        result
      });
    });

    scraperQueue.on('failed', (job, error) => {
      apiLogger.logError('[Scraper Queue] Job failed', new Error(error.message), {
        jobId: job?.id
      });
    });

    scraperQueue.on('error', (error) => {
      apiLogger.logError('[Scraper Queue] Queue error', new Error(error.message));
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
