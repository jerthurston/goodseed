import { prisma } from '@/lib/prisma';
import { createScheduleAutoScrapeJob } from '@/lib/helpers/server/scheduleAutoScrapeJob';
import { unscheduleAutoScrapeJob, getScheduledAutoJobs, scraperQueue } from '@/lib/queue/scraper-queue';
import { apiLogger } from '@/lib/helpers/api-logger';
import { JobStatusSyncService } from '@/lib/services/auto-scraper/job-status-sync.service';

/**
 * Auto Scraper Scheduler Service
 * High-level orchestration layer cho auto scraper system
 * 
 * Chịu trách nhiệm:
 * - Bulk operations (initialize/stop all auto jobs)
 * - Individual seller auto job management
 * - Health monitoring và status tracking
 * - Server startup initialization
 *
 * Đây là service layer quan trọng nhất - nó sẽ được dùng bởi API endpoints, worker initialization, và health monitoring. Implement carefully với proper error handling và comprehensive logging!
  */
export class AutoScraperScheduler {
  
  /**
   * Initialize auto scraping cho tất cả active sellers có autoScrapeInterval > 0
   * Sử dụng trong:
   * - API endpoint /api/admin/scraper/schedule-all (POST)
   * - Worker initialization khi server start
   * - Admin dashboard "Start All" button
   */
  static async initializeAllAutoJobs() {
    try {
      apiLogger.info('[Auto Scheduler] Starting bulk auto jobs initialization');

      // 1. Lấy tất cả active sellers (bao gồm cả những sellers chưa có autoScrapeInterval)
      const activeSellers = await prisma.seller.findMany({
        where: {
          isActive: true,
        },
        include: {
          scrapingSources: true,
        }
      });

      // 2. Filter và setup default interval cho sellers eligible for auto scraping
      const eligibleSellers = activeSellers
        .filter(seller => seller.scrapingSources.length > 0) // Chỉ sellers có scraping sources
        .map(seller => ({
          ...seller,
          autoScrapeInterval: seller.autoScrapeInterval || 24 // Default 24h nếu null
        }));

      apiLogger.info('[Auto Scheduler] Found eligible sellers after filtering', { 
        total: activeSellers.length,
        eligible: eligibleSellers.length 
      });

      if (eligibleSellers.length === 0) {
        return {
          totalProcessed: 0,
          scheduled: 0,
          failed: 0,
          details: [],
          message: 'No sellers configured for auto scraping'
        };
      }

      // 3. Process each eligible seller
      const results = [];
      let scheduledCount = 0;
      let failedCount = 0;
      
      for (const seller of eligibleSellers) {
        try {
          // Update seller interval in database if it was null
          if (!activeSellers.find(s => s.id === seller.id)?.autoScrapeInterval) {
            await prisma.seller.update({
              where: { id: seller.id },
              data: { autoScrapeInterval: seller.autoScrapeInterval }
            });
          }

          // Schedule auto job using helper function
          const result = await createScheduleAutoScrapeJob({
            sellerId: seller.id,
            sellerName: seller.name,
            autoScrapeInterval: seller.autoScrapeInterval!,
            scrapingSources: seller.scrapingSources.map(source => ({
              scrapingSourceUrl: source.scrapingSourceUrl,
              scrapingSourceName: source.scrapingSourceName,
              maxPage: source.maxPage,
            })),
            scrapingConfig: {
              fullSiteCrawl: true, // Auto mode luôn full site crawl
            },
            targetCategoryId: null, // Auto mode không giới hạn category
          });

          results.push({
            sellerId: seller.id,
            sellerName: seller.name,
            status: 'scheduled',
            jobId: result.jobId,
            interval: `${seller.autoScrapeInterval}h`,
            cronPattern: result.cronPattern,
            message: result.message,
          });

          scheduledCount++;

          apiLogger.info('[Auto Scheduler] Successfully scheduled auto job', {
            sellerId: seller.id,
            sellerName: seller.name,
            interval: seller.autoScrapeInterval,
            cronPattern: result.cronPattern,
          });

        } catch (error) {
          results.push({
            sellerId: seller.id,
            sellerName: seller.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            interval: seller.autoScrapeInterval ? `${seller.autoScrapeInterval}h` : 'N/A',
          });
          failedCount++;

          apiLogger.logError('[Auto Scheduler] Failed to schedule auto job for seller', error as Error, {
            sellerId: seller.id,
            sellerName: seller.name,
          });
        }
      }

      const summary = {
        totalProcessed: eligibleSellers.length,
        scheduled: scheduledCount,
        failed: failedCount,
        details: results,
        message: `Bulk initialization completed: ${scheduledCount}/${eligibleSellers.length} jobs scheduled`
      };

      apiLogger.info('[Auto Scheduler] Bulk initialization completed', summary);

      return summary;

    } catch (error) {
      apiLogger.logError('[Auto Scheduler] Bulk initialization failed', error as Error);
      throw error;
    }
  }

  /**
   * Stop auto scraping cho tất cả sellers
   * Sử dụng trong:
   * - API endpoint /api/admin/scraper/schedule-all (DELETE)
   * - Admin dashboard "Stop All" button
   * - Emergency stop situations
   */
  static async stopAllAutoJobs() {
    try {
      apiLogger.info('[Auto Scheduler] Starting bulk auto jobs cleanup');

      // 1. Lấy tất cả scheduled jobs để biết sellers nào đang có auto jobs
      const scheduledJobs = await getScheduledAutoJobs();
      
      if (scheduledJobs.length === 0) {
        return {
          totalProcessed: 0,
          stopped: 0,
          failed: 0,
          details: [],
          message: 'No auto jobs found to stop'
        };
      }

      // 2. Extract seller IDs từ job IDs
      // Bull repeat job IDs có format: auto_scrape_{sellerId}
      const sellerIds = scheduledJobs
        .map(job => {
          if (job.id?.startsWith('auto_scrape_')) {
            return job.id.replace('auto_scrape_', '');
          }
          return null;
        })
        .filter(Boolean) as string[];

      apiLogger.info('[Auto Scheduler] Found auto jobs to stop', { 
        jobCount: scheduledJobs.length,
        sellerCount: sellerIds.length 
      });

      // 3. Lấy seller info để có tên trong response
      const sellers = await prisma.seller.findMany({
        where: {
          id: { in: sellerIds }
        },
        select: {
          id: true,
          name: true,
        }
      });

      // 4. Stop jobs cho từng seller
      const results = [];
      let stoppedCount = 0;
      let failedCount = 0;

      for (const seller of sellers) {
        try {
          // Stop the scheduled job
          await unscheduleAutoScrapeJob(seller.id);

          // Update database để set autoScrapeInterval = null
          await prisma.seller.update({
            where: { id: seller.id },
            data: { autoScrapeInterval: null }
          });

          results.push({
            sellerId: seller.id,
            sellerName: seller.name,
            status: 'stopped',
            message: 'Auto scraping stopped successfully',
          });

          stoppedCount++;

          apiLogger.info('[Auto Scheduler] Successfully stopped auto job', {
            sellerId: seller.id,
            sellerName: seller.name,
          });

        } catch (error) {
          results.push({
            sellerId: seller.id,
            sellerName: seller.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          failedCount++;

          apiLogger.logError('[Auto Scheduler] Failed to stop auto job for seller', error as Error, {
            sellerId: seller.id,
            sellerName: seller.name,
          });
        }
      }

      const summary = {
        totalProcessed: sellers.length,
        stopped: stoppedCount,
        failed: failedCount,
        details: results,
        message: `Bulk cleanup completed: ${stoppedCount}/${sellers.length} jobs stopped`
      };

      apiLogger.info('[Auto Scheduler] Bulk cleanup completed', summary);

      return summary;

    } catch (error) {
      apiLogger.logError('[Auto Scheduler] Bulk cleanup failed', error as Error);
      throw error;
    }
  }

  /**
   * Schedule auto job cho một seller cụ thể
   * Sử dụng trong:
   * - API endpoint /api/admin/sellers/[id]/scraper/schedule (POST)
   * - Individual seller controls trong admin dashboard
   */
  static async scheduleSellerAutoJob(sellerId: string) {
    try {
      apiLogger.info('[Auto Scheduler] Scheduling auto job for seller', { sellerId });

      // 1. Validate và lấy seller info
      const seller = await prisma.seller.findUnique({
        where: { id: sellerId },
        include: { scrapingSources: true },
      });

      if (!seller) {
        throw new Error(`Seller not found: ${sellerId}`);
      }

      if (!seller.isActive) {
        throw new Error(`Seller is not active: ${seller.name}`);
      }

      if (!seller.autoScrapeInterval || seller.autoScrapeInterval <= 0) {
        throw new Error(`Auto scrape interval not configured for seller: ${seller.name}`);
      }

      if (seller.scrapingSources.length === 0) {
        throw new Error(`No scraping sources configured for seller: ${seller.name}`);
      }

      // 2. Schedule auto job
      const result = await createScheduleAutoScrapeJob({
        sellerId: seller.id,
        sellerName: seller.name,
        autoScrapeInterval: seller.autoScrapeInterval,
        scrapingSources: seller.scrapingSources.map(source => ({
          scrapingSourceUrl: source.scrapingSourceUrl,
          scrapingSourceName: source.scrapingSourceName,
          maxPage: source.maxPage,
        })),
        scrapingConfig: {
          fullSiteCrawl: true,
        },
        targetCategoryId: null,
      });

      apiLogger.info('[Auto Scheduler] Successfully scheduled auto job for seller', {
        sellerId: seller.id,
        sellerName: seller.name,
        cronPattern: result.cronPattern,
        interval: seller.autoScrapeInterval,
      });

      return {
        sellerId: seller.id,
        sellerName: seller.name,
        jobId: result.jobId,
        cronPattern: result.cronPattern,
        intervalHours: result.intervalHours,
        status: 'scheduled',
        message: result.message,
      };

    } catch (error) {
      apiLogger.logError('[Auto Scheduler] Failed to schedule seller auto job', error as Error, { sellerId });
      throw error;
    }
  }

  /**
   * Unschedule auto job cho một seller cụ thể
   * Sử dụng trong:
   * - API endpoint /api/admin/sellers/[id]/scraper/schedule (DELETE)
   * - Individual seller controls trong admin dashboard
   */
  static async unscheduleSellerAutoJob(sellerId: string) {
    try {
      apiLogger.info('[Auto Scheduler] Unscheduling auto job for seller', { sellerId });

      // 1. Validate seller existence
      const seller = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: { id: true, name: true },
      });

      if (!seller) {
        throw new Error(`Seller not found: ${sellerId}`);
      }

      // 2. Unschedule auto job
      await unscheduleAutoScrapeJob(sellerId);

      apiLogger.info('[Auto Scheduler] Successfully unscheduled auto job for seller', {
        sellerId: seller.id,
        sellerName: seller.name,
      });

      return {
        sellerId: seller.id,
        sellerName: seller.name,
        status: 'stopped',
        message: 'Auto scraping stopped successfully',
      };

    } catch (error) {
      apiLogger.logError('[Auto Scheduler] Failed to unschedule seller auto job', error as Error, { sellerId });
      throw error;
    }
  }

  /**
   * **[SERVER STARTUP]** Initialize auto jobs với resilience
   * Chạy khi server/worker start để restore repeat jobs
   * 
   * Features:
   * - Reconcile expected vs actual scheduled jobs
   * - Self-healing: schedule missing jobs
   * - Comprehensive logging cho monitoring
   */
  static async initializeOnServerStart() {
    try {
      apiLogger.info('[Auto Scheduler] Initializing auto scraper on server start');

      // 1. Check existing repeat jobs trong Bull queue
      const existingJobs = await getScheduledAutoJobs();
      apiLogger.info('[Auto Scheduler] Found existing repeat jobs', { 
        count: existingJobs.length,
        jobs: existingJobs.map(job => ({ id: job.id, cron: job.cron }))
      });

      // 2. Get expected auto jobs từ database
      const expectedSellers = await prisma.seller.findMany({
        where: {
          isActive: true,
          autoScrapeInterval: { 
            not: null,
            gt: 0 
          },
        },
        include: { scrapingSources: true },
      });

      apiLogger.info('[Auto Scheduler] Found sellers expecting auto scrape', { 
        count: expectedSellers.length,
        sellers: expectedSellers.map(s => ({ id: s.id, name: s.name, interval: s.autoScrapeInterval }))
      });

      // 3. Reconcile: identify missing jobs
      const missingJobs = expectedSellers.filter(seller => {
        const expectedJobId = `auto_scrape_${seller.id}`;
        const existingJob = existingJobs.find(job => 
          job.id === expectedJobId || job.name === `auto-scrape-${seller.id}`
        );
        return !existingJob;
      });

      apiLogger.info('[Auto Scheduler] Analysis complete', {
        expectedSellers: expectedSellers.length,
        existingJobs: existingJobs.length,
        missingJobs: missingJobs.length,
        missingSellerNames: missingJobs.map(s => s.name)
      });

      // 4. Schedule missing jobs (self-healing)
      let scheduledCount = 0;
      let errorCount = 0;
      const results = [];

      for (const seller of missingJobs) {
        try {
          // Skip sellers without scraping sources
          if (seller.scrapingSources.length === 0) {
            results.push({
              sellerId: seller.id,
              sellerName: seller.name,
              status: 'skipped',
              reason: 'No scraping sources',
            });
            continue;
          }

          // Schedule missing job
          await createScheduleAutoScrapeJob({
            sellerId: seller.id,
            sellerName: seller.name,
            autoScrapeInterval: seller.autoScrapeInterval!,
            scrapingSources: seller.scrapingSources.map(source => ({
              scrapingSourceUrl: source.scrapingSourceUrl,
              scrapingSourceName: source.scrapingSourceName,
              maxPage: source.maxPage,
            })),
            scrapingConfig: {
              fullSiteCrawl: true,
            },
            targetCategoryId: null,
          });

          scheduledCount++;
          results.push({
            sellerId: seller.id,
            sellerName: seller.name,
            status: 'scheduled',
            interval: `${seller.autoScrapeInterval}h`,
          });

          apiLogger.info('[Auto Scheduler] Restored missing auto job', {
            sellerId: seller.id,
            sellerName: seller.name,
            interval: seller.autoScrapeInterval,
          });

        } catch (error) {
          errorCount++;
          results.push({
            sellerId: seller.id,
            sellerName: seller.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          apiLogger.logError('[Auto Scheduler] Failed to restore auto job for seller', error as Error, {
            sellerId: seller.id,
            sellerName: seller.name,
          });
        }
      }

      // 5. Final status report
      const summary = {
        success: true,
        expectedSellers: expectedSellers.length,
        existingJobs: existingJobs.length,
        missingJobs: missingJobs.length,
        scheduledCount,
        errorCount,
        details: results,
        message: `Server startup initialization completed: ${scheduledCount} jobs restored, ${errorCount} errors`
      };

      apiLogger.info('[Auto Scheduler] Server startup initialization completed', summary);

      return summary;

    } catch (error) {
      apiLogger.logError('[Auto Scheduler] Server startup initialization failed', error as Error);
      throw error;
    }
  }

  /**
   * Get health status của auto scraper system
   * Sử dụng trong:
   * - Health check endpoints
   * - Monitoring dashboards
   * - Admin diagnostics
   */
  static async getAutoScraperHealth() {
    try {
      // Sync job statuses trước khi return health data
      await JobStatusSyncService.syncAllJobStatuses();

      const [scheduledJobs, activeSellers, totalSellers, pendingJobs] = await Promise.all([
        getScheduledAutoJobs(),
        prisma.seller.count({
          where: {
            isActive: true,
            autoScrapeInterval: { 
              not: null,
              gt: 0 
            }
          }
        }),
        prisma.seller.count({
          where: {
            isActive: true // Total active sellers regardless of auto scraping status
          }
        }),
        // Get synced pending jobs from database
        prisma.scrapeJob.count({
          where: {
            status: 'PENDING'
          }
        })
      ]);

      const health = {
        status: 'healthy',
        scheduledJobs: scheduledJobs.length,
        activeSellers,
        totalSellers,
        pendingJobs: pendingJobs, // Synced database count
        coverage: activeSellers > 0 ? Math.round((scheduledJobs.length / activeSellers) * 100) : 0,
        lastChecked: new Date(),
        details: {
          scheduledJobIds: scheduledJobs.map((job: any) => job.id),
          missingJobs: Math.max(0, activeSellers - scheduledJobs.length),
        }
      };

      // Determine health status
      if (health.coverage < 50) {
        health.status = 'unhealthy';
      } else if (health.coverage < 90) {
        health.status = 'degraded';
      }

      return health;

    } catch (error) {
      apiLogger.logError('[Auto Scheduler] Health check failed', error as Error);
      return {
        status: 'error',
        scheduledJobs: 0,
        activeSellers: 0,
        totalSellers: 0,
        pendingJobs: 0, // Fix naming
        coverage: 0,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}