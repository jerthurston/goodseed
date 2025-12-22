import { scraperQueue } from '@/lib/queue/scraper-queue';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';
import { ScrapeJobStatus } from '@prisma/client';

/**
 * Event-Driven Job Status Sync
 * Automatically sync job status changes từ Redis events sang Database
 */
export class EventDrivenJobSync {
  
  private static initialized = false;

  /**
   * Initialize event listeners cho Bull queue
   * Call this once when server starts
   */
  static initialize() {
    if (this.initialized) {
      apiLogger.warn('[Job Sync] Already initialized');
      return;
    }

    // 1. Job started event
    scraperQueue.on('active', async (job) => {
      try {
        await this.updateJobStatus(job.id.toString(), 'IN_PROGRESS', {
          startedAt: new Date()
        });
        
        apiLogger.info('[Job Sync] Job started', { 
          jobId: job.id, 
          status: 'IN_PROGRESS' 
        });
      } catch (error) {
        apiLogger.logError('[Job Sync] Failed to sync job start', error as Error, { 
          jobId: job.id 
        });
      }
    });

    // 2. Job completed event
    scraperQueue.on('completed', async (job, result) => {
      try {
        await this.updateJobStatus(job.id.toString(), 'COMPLETED', {
          completedAt: new Date(),
          duration: job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : undefined,
          // Extract result data if available
          productsScraped: result?.productsFound || 0,
          productsSaved: result?.productsSaved || 0,
          productsUpdated: result?.productsUpdated || 0
        });
        
        apiLogger.info('[Job Sync] Job completed', { 
          jobId: job.id, 
          status: 'COMPLETED',
          duration: job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : undefined
        });
      } catch (error) {
        apiLogger.logError('[Job Sync] Failed to sync job completion', error as Error, { 
          jobId: job.id 
        });
      }
    });

    // 3. Job failed event
    scraperQueue.on('failed', async (job, err) => {
      try {
        await this.updateJobStatus(job.id.toString(), 'FAILED', {
          completedAt: new Date(),
          errorMessage: err.message,
          errorDetails: { 
            stack: err.stack,
            name: err.name,
            timestamp: new Date().toISOString()
          }
        });
        
        apiLogger.info('[Job Sync] Job failed', { 
          jobId: job.id, 
          status: 'FAILED',
          error: err.message
        });
      } catch (error) {
        apiLogger.logError('[Job Sync] Failed to sync job failure', error as Error, { 
          jobId: job.id 
        });
      }
    });

    // 4. Job stalled event (job bị stuck)
    scraperQueue.on('stalled', async (job) => {
      try {
        await this.updateJobStatus(job.id.toString(), 'FAILED', {
          errorMessage: 'Job stalled - exceeded timeout or worker crashed',
          errorDetails: { 
            reason: 'stalled',
            timestamp: new Date().toISOString()
          }
        });
        
        apiLogger.warn('[Job Sync] Job stalled', { 
          jobId: job.id, 
          status: 'FAILED (stalled)'
        });
      } catch (error) {
        apiLogger.logError('[Job Sync] Failed to sync job stall', error as Error, { 
          jobId: job.id 
        });
      }
    });

    this.initialized = true;
    apiLogger.info('[Job Sync] Event-driven sync initialized');
  }

  /**
   * Update job status trong database
   */
  private static async updateJobStatus(
    jobId: string, 
    status: ScrapeJobStatus, 
    extraData: Partial<{
      startedAt: Date;
      completedAt: Date;
      duration: number;
      errorMessage: string;
      errorDetails: any;
      productsScraped: number;
      productsSaved: number;
      productsUpdated: number;
    }> = {}
  ) {
    await prisma.scrapeJob.updateMany({
      where: { jobId },
      data: {
        status,
        updatedAt: new Date(),
        ...extraData
      }
    });
  }

  /**
   * Create database record khi job được tạo
   * Call this từ job creation functions
   */
  static async createJobRecord(jobData: {
    sellerId: string;
    jobId: string;
    mode: string;
    targetCategoryId?: string;
    startPage?: number;
    endPage?: number;
    maxPages?: number;
  }) {
    try {
      await prisma.scrapeJob.create({
        data: {
          ...jobData,
          status: 'PENDING'
        }
      });
      
      apiLogger.info('[Job Sync] Job record created', { 
        jobId: jobData.jobId, 
        sellerId: jobData.sellerId 
      });
    } catch (error) {
      apiLogger.logError('[Job Sync] Failed to create job record', error as Error, jobData);
    }
  }

  /**
   * Cleanup old completed/failed jobs (optional)
   */
  static async cleanupOldJobs(daysOld: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.scrapeJob.deleteMany({
        where: {
          status: { in: ['COMPLETED', 'FAILED'] },
          completedAt: { lt: cutoffDate }
        }
      });

      apiLogger.info('[Job Sync] Cleaned up old jobs', { 
        deletedCount: result.count, 
        cutoffDate 
      });

      return result.count;
    } catch (error) {
      apiLogger.logError('[Job Sync] Failed to cleanup old jobs', error as Error);
      return 0;
    }
  }
}