import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/helpers/api-logger";
import { getJob } from "@/lib/queue/scraper-queue";

/**
 * GET /api/admin/scraper/scrape-job/[jobId] - Get specific scrape job details
 * 
 * Theo dõi tiến độ của một job (IN_PROGRESS, COMPLETED, FAILED...)
 * Returns both database record and Bull queue status
 * 
 * @param params.jobId - The job ID to fetch
 * @returns Job details including status, progress, and statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    apiLogger.info('[ScrapeJob API] Get job details request', { jobId });

    // Get job from database
    const scrapeJob = await prisma.scrapeJob.findUnique({
      where: { jobId },
      include: {
        seller: {
          select: { 
            id: true, 
            name: true, 
            url: true,
            scrapingSources: {
              select: {
                id: true,
                scrapingSourceName: true,
                scrapingSourceUrl: true,
                maxPage: true
              }
            }
          }
        },
        targetCategory: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!scrapeJob) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Try to get Bull queue job status (for active jobs)
    let queueJobStatus = null;
    try {
      const queueJob = await getJob(jobId);
      if (queueJob) {
        queueJobStatus = {
          id: queueJob.id,
          name: queueJob.name,
          data: queueJob.data,
          opts: queueJob.opts,
          progress: queueJob.progress(),
          processedOn: queueJob.processedOn,
          finishedOn: queueJob.finishedOn,
          failedReason: queueJob.failedReason,
          returnvalue: queueJob.returnvalue,
          timestamp: queueJob.timestamp,
          attemptsMade: queueJob.attemptsMade,
          delay: queueJob.opts?.delay || 0
        };
      }
    } catch (queueError) {
      apiLogger.warn('[ScrapeJob API] Could not fetch queue status', { 
        jobId, 
        error: queueError 
      });
    }

    const response = {
      job: scrapeJob,
      queueStatus: queueJobStatus,
      metadata: {
        hasQueueData: queueJobStatus !== null,
        fetchedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    apiLogger.logError('[ScrapeJob API] Failed to fetch job details', error as Error, {
      jobId: params?.jobId
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/scraper/scrape-job/[jobId] - Cancel/delete a scrape job
 * 
 * Cancels active job and updates database status
 * 
 * @param params.jobId - The job ID to cancel
 * @returns Cancellation result
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    apiLogger.info('[ScrapeJob API] Cancel job request', { jobId });

    // Check if job exists in database
    const scrapeJob = await prisma.scrapeJob.findUnique({
      where: { jobId }
    });

    if (!scrapeJob) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Try to cancel Bull queue job if it's active
    let queueCancelled = false;
    try {
      const queueJob = await getJob(jobId);
      if (queueJob && !queueJob.finishedOn) {
        await queueJob.remove();
        queueCancelled = true;
        apiLogger.info('[ScrapeJob API] Bull queue job cancelled', { jobId });
      }
    } catch (queueError) {
      apiLogger.warn('[ScrapeJob API] Could not cancel queue job', { 
        jobId, 
        error: queueError 
      });
    }

    // Update database status
    const updatedJob = await prisma.scrapeJob.update({
      where: { jobId },
      data: {
        status: "CANCELLED",
        completedAt: new Date()
      }
    });

    return NextResponse.json({
      message: "Job cancelled successfully",
      jobId,
      queueCancelled,
      updatedJob
    });

  } catch (error) {
    apiLogger.logError('[ScrapeJob API] Failed to cancel job', error as Error, {
      jobId: params?.jobId
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}