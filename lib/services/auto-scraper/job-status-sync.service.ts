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
 */
export class JobStatusSyncService {

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
   */
  static async syncAllJobStatuses(): Promise<void> {
    try {
      apiLogger.info('[Job Sync] Starting bulk job status sync');

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

      apiLogger.info('[Job Sync] Bulk sync completed', {
        totalJobs: allJobs.length,
        waiting: waiting.length,
        active: active.length, 
        completed: completed.length,
        failed: failed.length
      });

    } catch (error) {
      apiLogger.logError('[Job Sync] Bulk sync failed', error as Error);
    }
  }

  /**
   * Handle jobs missing từ queue (đã bị cancelled/removed)
   */
  static async handleMissingJobs(queueJobIds: string[]): Promise<void> {
    try {
      // 1. Get tất cả CREATED/WAITING/DELAYED/ACTIVE jobs từ database
      const dbJobs = await prisma.scrapeJob.findMany({
        where: {
          status: {
            in: [ScrapeJobStatus.CREATED, ScrapeJobStatus.WAITING, ScrapeJobStatus.DELAYED, ScrapeJobStatus.ACTIVE]
          }
        },
        select: {
          id: true,
          jobId: true,
          status: true,
          sellerId: true
        }
      });

      // 2. Find jobs missing từ Redis queue  
      const missingJobs = dbJobs.filter(dbJob => 
        dbJob.jobId && !queueJobIds.includes(dbJob.jobId)
      );

      if (missingJobs.length === 0) {
        return;
      }

      // 3. Update missing jobs thành CANCELLED
      const updatePromises = missingJobs.map(job => 
        prisma.scrapeJob.update({
          where: { id: job.id },
          data: {
            status: ScrapeJobStatus.CANCELLED,
            updatedAt: new Date()
          }
        })
      );

      await Promise.allSettled(updatePromises);

      apiLogger.info('[Job Sync] Handled missing jobs', {
        missingCount: missingJobs.length,
        jobIds: missingJobs.map(j => j.jobId)
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