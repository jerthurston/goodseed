// lib/workers/scraper-worker-startup.ts
import { EventDrivenJobSync } from '@/lib/services/auto-scraper/event-driven-job-sync.service';
import { initializeAutoScraperOnWorkerStart, cleanupAutoScraperOnWorkerShutdown } from '@/lib/helpers/server/initializeAutoScraperJobs';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Comprehensive Worker Initialization
 * Includes both auto scraper jobs và event-driven sync
 */
export function initializeWorkerSync() {
  try {
    // 1. Initialize auto scraper scheduled jobs
    initializeAutoScraperOnWorkerStart();
    
    // 2. Initialize event-driven job status sync
    EventDrivenJobSync.initialize();
    
    // 3. Optional: cleanup old jobs on startup
    EventDrivenJobSync.cleanupOldJobs(30);
    
    apiLogger.info('[Worker] Comprehensive initialization completed', {
      autoScraperJobs: 'initialized',
      eventDrivenSync: 'initialized',
      jobCleanup: 'completed'
    });
  } catch (error) {
    apiLogger.logError('[Worker] Failed to initialize worker services', error as Error);
  }
}

/**
 * Comprehensive Worker Cleanup
 * Includes both auto scraper cleanup và sync cleanup
 */
export function cleanupWorkerSync() {
  try {
    // 1. Cleanup auto scraper jobs
    cleanupAutoScraperOnWorkerShutdown();
    
    // 2. Event sync cleanup nếu cần thiết
    // EventDrivenJobSync có thể cần cleanup logic
    
    apiLogger.info('[Worker] Comprehensive cleanup completed');
  } catch (error) {
    apiLogger.logError('[Worker] Failed to cleanup worker services', error as Error);
  }
}