import { NextRequest, NextResponse } from 'next/server';
import { scraperQueue } from '@/lib/queue/scraper-queue';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Force Stop Individual Job
 * DELETE /api/debug/queue/[jobId] - Stop specific job
 * POST /api/debug/queue/stop-all - Stop all active jobs
 */

/**
 * Stop specific job by ID
 */
export async function DELETE(
  request: NextRequest
) {
  try {
    // Get jobId from request body or query params
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json({
        success: false,
        message: 'Job ID is required',
      }, { status: 400 });
    }

    apiLogger.info('[Debug] Force stopping job', { jobId });

    // 1. Get job từ queue
    const job = await scraperQueue.getJob(jobId);
    
    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Job not found in queue',
        jobId
      }, { status: 404 });
    }

    // 2. Remove job từ queue (force stop)
    await job.remove();

    // 3. Update database record thành CANCELLED
    const updatedJob = await prisma.scrapeJob.updateMany({
      where: { 
        jobId: jobId,
        status: {
          in: ['WAITING', 'ACTIVE']
        }
      },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });

    apiLogger.info('[Debug] Job force stopped', { 
      jobId, 
      queueRemoved: true,
      dbUpdated: updatedJob.count 
    });

    return NextResponse.json({
      success: true,
      message: 'Job force stopped successfully',
      data: {
        jobId,
        queueRemoved: true,
        dbRecordsUpdated: updatedJob.count
      }
    });

  } catch (error) {
    apiLogger.logError('[Debug] Failed to force stop job', error as Error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Stop all active jobs
 */
export async function POST() {
  try {
    apiLogger.info('[Debug] Force stopping all active jobs');

    // 1. Get all active jobs
    const activeJobs = await scraperQueue.getActive();
    
    if (activeJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active jobs to stop',
        data: { stoppedJobs: 0 }
      });
    }

    // 2. Stop all active jobs
    const stopPromises = activeJobs.map(async (job) => {
      try {
        await job.remove();
        return { jobId: job.id?.toString(), success: true };
      } catch (error) {
        return { 
          jobId: job.id?.toString(), 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const results = await Promise.allSettled(stopPromises);
    const stoppedResults = results.map(r => r.status === 'fulfilled' ? r.value : { success: false });
    
    // 3. Update database records
    const activeJobIds = activeJobs.map(job => job.id?.toString()).filter(Boolean);
    
    const updatedJobs = await prisma.scrapeJob.updateMany({
      where: { 
        jobId: { in: activeJobIds },
        status: {
          in: ['WAITING', 'ACTIVE']
        }
      },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });

    const successCount = stoppedResults.filter(r => r.success).length;

    apiLogger.info('[Debug] All active jobs force stopped', { 
      totalJobs: activeJobs.length,
      successfullyRemoved: successCount,
      dbRecordsUpdated: updatedJobs.count
    });

    return NextResponse.json({
      success: true,
      message: `Force stopped ${successCount}/${activeJobs.length} active jobs`,
      data: {
        totalJobs: activeJobs.length,
        stoppedJobs: successCount,
        dbRecordsUpdated: updatedJobs.count,
        results: stoppedResults
      }
    });

  } catch (error) {
    apiLogger.logError('[Debug] Failed to force stop all jobs', error as Error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}