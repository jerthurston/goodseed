/**
 * Scraper Queue Module - Barrel Exports
 * 
 * Centralized exports for scraper queue functionality:
 * - Queue instance & configuration (scraper.queue.ts)
 * - Job creators & management (scraper.jobs.ts)
 * - Job processor (scraper.processor.ts)
 */

// Queue instance & configuration
export { 
  scraperQueue, 
  SCRAPER_CONCURRENCY,
  default as scraperQueueInstance 
} from './scraper.queue';

// Type definitions
export type { ScraperJobData, RepeatJobOptions } from './scraper.jobs';

// Job creators & management
export {
  addScraperJob,
  getScraperJob,
  removeScraperJob,
  unscheduleAutoScrapeJob,
  pauseScraperQueue,
  resumeScraperQueue,
  getScraperQueueStats,
  cleanScraperQueue,
  getScheduledAutoJobs,
  getQueueStatistics
} from './scraper.jobs';

// Job processor
export { processScraperJob } from './scraper.processor';
