import { AutoScraperScheduler } from '@/lib/services/auto-scraper/backend/auto-scraper-scheduler.service';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Initialize auto scraper jobs for worker startup
 * Self-healing system to restore repeat jobs after server restart
 * 
 * Features:
 * - Wait for worker to be fully ready (3 second delay)
 * - Restore missing auto scrape jobs
 * - Comprehensive logging for monitoring
 * - Graceful error handling (doesn't crash worker)
 */
export async function initializeAutoScraperOnWorkerStart(): Promise<void> {
  try {
    apiLogger.info('[Worker Startup] Initializing auto scraper schedules...');

    // Wait for worker to be fully ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = await AutoScraperScheduler.initializeOnServerStart();

    apiLogger.info('[Worker Startup] Auto scraper initialization completed', {
      scheduled: result.scheduledCount,
      errors: result.errorCount,
      existing: result.existingJobs,
      expected: result.expectedSellers,
    });

  } catch (error) {
    apiLogger.logError('[Worker Startup] Failed to initialize auto scraper', error as Error);
    apiLogger.warn('[Worker Startup] Auto scraper init failed, but worker continues for manual jobs');
  }
}

/**
 * Cleanup auto scraper jobs during worker shutdown
 * Ensures clean shutdown without orphaned repeat jobs
 */
export async function cleanupAutoScraperOnWorkerShutdown(): Promise<void> {
  try {
    apiLogger.info('[Worker Shutdown] Cleaning up auto scraper jobs...');
    await AutoScraperScheduler.stopAllAutoJobs();
    apiLogger.info('[Worker Shutdown] Auto scraper cleanup completed');
  } catch (error) {
    apiLogger.logError('[Worker Shutdown] Failed to cleanup auto jobs', error as Error);
  }
}

/**
 * Health check for auto scraper system
 * Useful for monitoring and debugging
 */
export async function checkAutoScraperHealth() {
  try {
    return await AutoScraperScheduler.getAutoScraperHealth();
  } catch (error) {
    apiLogger.logError('[Worker Health] Auto scraper health check failed', error as Error);
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}