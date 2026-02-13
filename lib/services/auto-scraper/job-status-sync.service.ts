import { prisma } from '@/lib/prisma';
import { scraperQueue } from '@/lib/queue/scraper-queue';
import { apiLogger } from '@/lib/helpers/api-logger';
import { ScrapeJobStatus } from '@prisma/client';

/**
 * Job Status Sync Service
 * Đồng bộ job status từ Redis Bull Queue về Database ScrapeJob table
 * 
 * Chức năng:
 * - Sync job status theo real-time
 * - Update progress và timing info
 * - Ensure data consistency giữa queue và database
 * 
 * Performance optimization:
 * - Cache last sync time to prevent excessive syncing
 * - Minimum 2 minutes between full syncs (jobs run 3-6 hours, no need for frequent sync)
 */
export class JobStatusSyncService {
  private static lastSyncTime: number = 0;
  private static readonly MIN_SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

  /**
   * Sync single job status từ Redis về database
   */
  static async syncJobStatus(jobId: string): Promise<void> {
    try {
      // 1. Get job từ Redis queue
      const bullJob = await scraperQueue.getJob(jobId);
      
      if (!bullJob) {
        apiLogger.warn('[Job Sync] Job not found in queue', { jobId });
        return;
      }

      // 2. Map Bull job status sang Prisma enum
      const dbStatus = this.mapBullStatusToDb(bullJob.finishedOn, bullJob.failedReason, bullJob.processedOn);

      // 3. Extract job data để update database
      const updateData: any = {
        status: dbStatus,
        updatedAt: new Date()
      };

      // Add timing info nếu có
      if (bullJob.processedOn && !bullJob.finishedOn) {
        // Job đang chạy
        updateData.startedAt = new Date(bullJob.processedOn);
      }

      if (bullJob.finishedOn) {
        // Job đã hoàn thành
        updateData.completedAt = new Date(bullJob.finishedOn);
        if (bullJob.processedOn) {
          updateData.duration = bullJob.finishedOn - bullJob.processedOn;
        }
      }

      // Add error info nếu failed
      if (bullJob.failedReason) {
        updateData.errorMessage = bullJob.failedReason;
        updateData.errorDetails = bullJob.stacktrace ? { stacktrace: bullJob.stacktrace } : null;
      }

      // 4. Update database record
      await prisma.scrapeJob.updateMany({
        where: { jobId: jobId },
        data: updateData
      });

      apiLogger.info('[Job Sync] Job status synced', {
        jobId,
        status: dbStatus,
        bullStatus: this.getBullJobStatus(bullJob)
      });

    } catch (error) {
      apiLogger.logError('[Job Sync] Failed to sync job status', error as Error, { jobId });
    }
  }

  /**
   * Sync tất cả active jobs và handle missing/cancelled jobs
   * 
   * Performance: Minimum 2 minutes between syncs to avoid excessive Redis calls
   * Context: Jobs run 3-6 hours, so syncing every 2 minutes is more than sufficient
   */
  static async syncAllJobStatuses(forceSync: boolean = false): Promise<void> {
    try {
      // Check if we need to sync (unless forced)
      const now = Date.now();
      const timeSinceLastSync = now - this.lastSyncTime;
      
      if (!forceSync && timeSinceLastSync < this.MIN_SYNC_INTERVAL_MS) {
        apiLogger.debug('[Job Sync] Skipping sync - too soon since last sync', {
          timeSinceLastSyncSeconds: Math.round(timeSinceLastSync / 1000),
          minIntervalSeconds: Math.round(this.MIN_SYNC_INTERVAL_MS / 1000)
        });
        return;
      }

      apiLogger.info('[Job Sync] Starting bulk job status sync', {
        forced: forceSync,
        timeSinceLastSyncMinutes: Math.round(timeSinceLastSync / 60000)
      });

      // 1. Get all jobs từ Redis queue
      const [waiting, active, completed, failed] = await Promise.all([
        scraperQueue.getWaiting(),
        scraperQueue.getActive(),
        scraperQueue.getCompleted(),
        scraperQueue.getFailed()
      ]);

      const allJobs = [...waiting, ...active, ...completed, ...failed];
      const queueJobIds = allJobs.map(job => job.id?.toString()).filter(Boolean);
      
      // 2. Sync existing jobs trong queue
      const syncPromises = allJobs.map(job => {
        if (job.id) {
          return this.syncJobStatus(job.id.toString());
        }
        return Promise.resolve();
      });

      await Promise.allSettled(syncPromises);

      // 3. Handle missing/cancelled jobs
      await this.handleMissingJobs(queueJobIds);

      // 4. Update last sync time
      this.lastSyncTime = Date.now();

      apiLogger.info('[Job Sync] Bulk sync completed', {
        totalJobs: allJobs.length,
        waiting: waiting.length,
        active: active.length, 
        completed: completed.length,
        failed: failed.length,
        nextSyncAvailableIn: `${Math.round(this.MIN_SYNC_INTERVAL_MS / 60000)} minutes`
      });

    } catch (error) {
      apiLogger.logError('[Job Sync] Bulk sync failed', error as Error);
      // Reset last sync time on error to allow retry sooner
      this.lastSyncTime = 0;
    }
  }

  /**
   * Handle jobs missing từ queue (đã bị cancelled/removed)
   * 
   * CRITICAL CONTEXT:
   * - 1 seller scraping = 3-6 hours
   * - Sequential processing (concurrency = 1)
   * - Jobs can wait 24+ hours in WAITING state before becoming ACTIVE
   * 
   * LOGIC:
   * 1. NEVER check WAITING/DELAYED jobs - they can wait 24+ hours legitimately
   * 2. ONLY check ACTIVE jobs - if actively processing but missing from queue = problem
   * 3. Use long grace period (8 hours) for ACTIVE jobs to account for long-running scrapes
   */
  static async handleMissingJobs(queueJobIds: string[]): Promise<void> {
    try {
      // Grace period for ACTIVE jobs: 8 hours (longer than max scrape time of 6 hours)
      // If a job has been ACTIVE for 8+ hours but not in queue, something is wrong
      const ACTIVE_GRACE_PERIOD_MS = 8 * 60 * 60 * 1000; // 8 hours
      const activeGraceCutoff = new Date(Date.now() - ACTIVE_GRACE_PERIOD_MS);

      // ONLY check ACTIVE jobs that have been active for too long
      // NEVER check WAITING/DELAYED - they can legitimately wait 24+ hours in queue
      const dbJobs = await prisma.scrapeJob.findMany({
        where: {
          status: ScrapeJobStatus.ACTIVE, // ONLY active jobs
          // Job has been active for longer than grace period
          startedAt: {
            lt: activeGraceCutoff
          }
        },
        select: {
          id: true,
          jobId: true,
          status: true,
          sellerId: true,
          createdAt: true,
          startedAt: true
        }
      });

      // Find ACTIVE jobs missing from Redis queue
      const missingJobs = dbJobs.filter(dbJob => 
        dbJob.jobId && !queueJobIds.includes(dbJob.jobId)
      );

      if (missingJobs.length === 0) {
        return;
      }

      // Update stalled ACTIVE jobs to FAILED (not CANCELLED, since they started but crashed)
      const updatePromises = missingJobs.map(job => {
        const activeHours = job.startedAt 
          ? Math.round((Date.now() - new Date(job.startedAt).getTime()) / (1000 * 60 * 60))
          : 0;

        return prisma.scrapeJob.update({
          where: { id: job.id },
          data: {
            status: ScrapeJobStatus.FAILED,
            completedAt: new Date(),
            updatedAt: new Date(),
            errorMessage: `Job stalled - was ACTIVE for ${activeHours}h but not found in Redis queue. Likely worker crashed or queue was cleared.`
          }
        });
      });

      await Promise.allSettled(updatePromises);

      apiLogger.warn('[Job Sync] Found stalled ACTIVE jobs', {
        stalledCount: missingJobs.length,
        jobIds: missingJobs.map(j => j.jobId),
        activeGracePeriodHours: ACTIVE_GRACE_PERIOD_MS / (1000 * 60 * 60),
        note: 'These jobs were ACTIVE but missing from queue - likely worker crash'
      });

    } catch (error) {
      apiLogger.logError('[Job Sync] Failed to handle missing jobs', error as Error);
    }
  }

  /**
   * Get job summary cho admin dashboard
   */
  static async getJobStatusSummary() {
    try {
      // 1. Get queue stats
      const [waiting, active, completed, failed] = await Promise.all([
        scraperQueue.getWaiting(),
        scraperQueue.getActive(),
        scraperQueue.getCompleted(0, 100), // Last 100 completed
        scraperQueue.getFailed(0, 100)     // Last 100 failed
      ]);

      // 2. Get database stats
      const dbStats = await prisma.scrapeJob.groupBy({
        by: ['status'],
        _count: { status: true }
      });

      const dbStatsMap = dbStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as Record<string, number>);

      return {
        queue: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          total: waiting.length + active.length + completed.length + failed.length
        },
        database: {
          created: dbStatsMap.CREATED || 0,
          waiting: dbStatsMap.WAITING || 0,
          delayed: dbStatsMap.DELAYED || 0,
          active: dbStatsMap.ACTIVE || 0,
          completed: dbStatsMap.COMPLETED || 0,
          failed: dbStatsMap.FAILED || 0,
          cancelled: dbStatsMap.CANCELLED || 0,
          total: Object.values(dbStatsMap).reduce((sum, count) => sum + count, 0)
        },
        lastSynced: new Date()
      };

    } catch (error) {
      apiLogger.logError('[Job Sync] Failed to get status summary', error as Error);
      throw error;
    }
  }

  /**
   * Map Bull job status sang Prisma ScrapeJobStatus enum
   */
  private static mapBullStatusToDb(finishedOn?: number | null, failedReason?: string | null, processedOn?: number | null): ScrapeJobStatus {
    if (failedReason) {
      return ScrapeJobStatus.FAILED;
    }
    
    if (finishedOn) {
      return ScrapeJobStatus.COMPLETED;
    }
    
    if (processedOn) {
      return ScrapeJobStatus.ACTIVE;
    }
    
    // Default for jobs in queue but not yet processed
    return ScrapeJobStatus.WAITING;
  }

  /**
   * Get human readable Bull job status
   */
  private static getBullJobStatus(job: any): string {
    if (job.failedReason) return 'failed';
    if (job.finishedOn) return 'completed';
    if (job.processedOn) return 'active';
    return 'waiting';
  }
}