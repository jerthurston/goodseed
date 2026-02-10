/**
 * Scraper Job Types & Creators
 * 
 * Module này chứa:
 * 1. Type definitions - Data structures cho scraper jobs
 * 2. Job creators - Helper functions để tạo jobs
 * 
 * Exported từ scraper.queue.ts để tập trung quản lý
 */

import { Job } from 'bull';
import { prisma } from '@/lib/prisma';
import { ScrapeJobStatus } from '@prisma/client';
import { ScrapeJobConfig } from '@/types/scrapeJob.type';
import { apiLogger } from '@/lib/helpers/api-logger';
import { scraperQueue } from './scraper.queue';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Job data cho scraping jobs
 */
export interface ScraperJobData {
  jobId: string; // ScrapeJob.jobId from database
  sellerId: string;
  scrapingSources: Array<{
    scrapingSourceUrl: string;
    scrapingSourceName: string;
    maxPage: number;
  }>;
  config: ScrapeJobConfig;
}

/**
 * Repeat job options cho auto scraper
 */
export interface RepeatJobOptions {
  repeat: {
    cron?: string;
    every?: number;
    startDate?: Date | string | number;
    endDate?: Date | string | number;
    limit?: number;
  };
  jobId?: string; // Unique Id for repeat jobs
}

// ============================================================================
// JOB CREATORS
// ============================================================================

/**
 * Add scraper job to queue
 * 
 * @param data - Job data containing seller info and scraping configuration
 * @param repeatOptions - Optional: For auto scraper with cron schedule
 * @returns Bull Job instance
 * 
 * @example
 * // Manual scrape
 * const job = await addScraperJob({
 *   jobId: 'job_123',
 *   sellerId: 'seller_abc',
 *   scrapingSources: [{
 *     scrapingSourceUrl: 'https://seller.com/products',
 *     scrapingSourceName: 'seller-name',
 *     maxPage: 10
 *   }],
 *   config: { mode: 'manual', fullSiteCrawl: true }
 * });
 * 
 * // Auto scrape with schedule
 * const autoJob = await addScraperJob(
 *   { ...jobData, config: { mode: 'auto' } },
 *   { repeat: { cron: '0 *\/24 * * *' }, jobId: 'auto_scrape_seller_abc' }
 * );
 */
export async function addScraperJob(
  data: ScraperJobData,
  repeatOptions?: RepeatJobOptions
): Promise<Job<ScraperJobData>> {
  // Validate scraping sources
  if (!Array.isArray(data.scrapingSources) || data.scrapingSources.length === 0) {
    await prisma.scrapeJob.update({
      where: { jobId: data.jobId },
      data: { 
        status: ScrapeJobStatus.WAITING, 
        errorMessage: 'Warning: ScrapingSource is not array or empty' 
      }
    });
  }

  // 1. Sanitize & normalize input
  const cleanData: ScraperJobData = {
    sellerId: String(data.sellerId),
    jobId: String(data.jobId),
    scrapingSources: data.scrapingSources.map(source => ({
      scrapingSourceUrl: String(source.scrapingSourceUrl.trim()),
      scrapingSourceName: String(source.scrapingSourceName).trim(),
      maxPage: Number(source.maxPage)
    })),
    config: {
      startPage: data.config.startPage ? Number(data.config.startPage) : undefined,
      endPage: data.config.endPage ? Number(data.config.endPage) : undefined,
      fullSiteCrawl: Boolean(data.config.fullSiteCrawl),
      mode: data.config.mode,
    }
  };

  // 2. Prepare job options
  let jobOptions = {
    jobId: data.jobId,
    priority: data.config.mode === 'manual' ? 10 : 5,
  };

  // 3. Add repeat options if provided (for auto scraper)
  if (repeatOptions) {
    jobOptions = { ...jobOptions, ...repeatOptions };
    apiLogger.info(`[Scraper Queue] Created repeat job ${data.jobId}`, {
      sellerId: cleanData.sellerId,
      mode: cleanData.config.mode,
      repeatOptions: repeatOptions.repeat
    });
  }

  // 4. ADD JOB TO REDIS QUEUE - Để Redis có thông tin về job
  const job = await scraperQueue.add(cleanData, jobOptions);
  
  const logMessage = repeatOptions ? 'Created repeat job' : 'Added job';

  apiLogger.info(`[Scraper Queue] ${logMessage} ${job.id}`, {
    sellerId: cleanData.sellerId,
    mode: cleanData.config.mode,
    urlsCount: cleanData.scrapingSources.length,
    config: cleanData.config,
    isRepeat: !!repeatOptions
  });

  return job;
}

/**
 * Get job by ID from queue
 */
export async function getScraperJob(jobId: string): Promise<Job<ScraperJobData> | null> {
  return await scraperQueue.getJob(jobId);
}

/**
 * Remove job from queue (cancel)
 */
export async function removeScraperJob(jobId: string): Promise<void> {
  const job = await getScraperJob(jobId);
  if (job) {
    await job.remove();
    apiLogger.info(`[Scraper Queue] Removed/cancelled job ${jobId}`);
  }
}

/**
 * Unschedule auto scrape job for a seller
 */
export async function unscheduleAutoScrapeJob(sellerId: string): Promise<void> {
  try {
    const repeatJobs = await scraperQueue.getRepeatableJobs();
    
    // Find all jobs related to this seller
    const sellerJobs = repeatJobs.filter(job => 
      job.id === `auto_scrape_${sellerId}` || 
      job.name === `auto-scrape-${sellerId}`
    );
    
    // Remove all related jobs
    for (const job of sellerJobs) {
      await scraperQueue.removeRepeatableByKey(job.key);
      apiLogger.info('[Scraper Queue] Removed repeat job', {
        sellerId,
        jobKey: job.key,
        jobId: job.id,
      });
    }
    
    if (sellerJobs.length === 0) {
      apiLogger.info('[Scraper Queue] No repeat jobs found for seller', { sellerId });
    }
  } catch (error) {
    apiLogger.logError('[Scraper Queue] Failed to unschedule auto scrape job', error as Error, { sellerId });
    throw error;
  }
}

// ============================================================================
// QUEUE MANAGEMENT HELPERS
// ============================================================================

/**
 * Pause the queue
 */
export async function pauseScraperQueue(): Promise<void> {
  await scraperQueue.pause();
  apiLogger.info('[Scraper Queue] Queue paused by admin');
}

/**
 * Resume the queue
 */
export async function resumeScraperQueue(): Promise<void> {
  await scraperQueue.resume();
  apiLogger.info('[Scraper Queue] Queue resumed by admin');
}

/**
 * Get queue statistics
 */
export async function getScraperQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    scraperQueue.getWaitingCount(),
    scraperQueue.getActiveCount(),
    scraperQueue.getCompletedCount(),
    scraperQueue.getFailedCount(),
    scraperQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Clean old jobs from queue
 * @param graceMs - Keep jobs completed/failed within this time (ms)
 * @param types - Job types to clean
 */
export async function cleanScraperQueue(
  graceMs: number = 24 * 60 * 60 * 1000,
  types: ('completed' | 'failed' | 'wait' | 'active' | 'delayed')[] = ['completed', 'failed']
) {
  for (const type of types) {
    await scraperQueue.clean(graceMs, type);
  }
  apiLogger.info(`[Scraper Queue] Cleaned old jobs (grace: ${graceMs}ms, types: ${types.join(', ')})`);
}

/**
 * Get all scheduled auto jobs
 */
export async function getScheduledAutoJobs() {
  return await scraperQueue.getRepeatableJobs();
}

/**
 * Get comprehensive queue statistics including both immediate and repeat jobs
 */
export async function getQueueStatistics() {
  try {
    const [waiting, active, completed, failed, delayed, repeatJobs] = await Promise.all([
      scraperQueue.getWaiting(),
      scraperQueue.getActive(),
      scraperQueue.getCompleted(),
      scraperQueue.getFailed(), 
      scraperQueue.getDelayed(),
      scraperQueue.getRepeatableJobs()
    ]);

    // Count auto-scraper repeat jobs (filter by job ID pattern)
    const autoScraperRepeatJobs = repeatJobs.filter(job => 
      job.id && (job.id.includes('auto_scrape_') || job.id.includes('auto_'))
    );

    const stats = {
      immediate: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      },
      scheduled: {
        repeatJobs: repeatJobs.length,
        autoScraperJobs: autoScraperRepeatJobs.length,
        totalScheduled: repeatJobs.length
      },
      combined: {
        totalJobs: waiting.length + active.length + completed.length + failed.length + delayed.length + repeatJobs.length,
        activeAutoScrapers: autoScraperRepeatJobs.length,
        pendingJobs: waiting.length + delayed.length
      }
    };

    apiLogger.info('[Scraper Queue] Queue statistics fetched', {
      immediate: stats.immediate.total,
      scheduled: stats.scheduled.totalScheduled,
      autoScrapers: stats.scheduled.autoScraperJobs
    });

    return stats;
  } catch (error) {
    apiLogger.logError('[Scraper Queue] Failed to fetch queue statistics', error as Error);
    throw error;
  }
}
