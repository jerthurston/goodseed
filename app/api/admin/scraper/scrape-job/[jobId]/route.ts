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
  { params }: { params: Promise<{ jobId: string }> }
) {
  let jobId = '';
  
  try {
    const resolvedParams = await params;
    jobId = resolvedParams.jobId;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    apiLogger.info('[ScrapeJob API] Get job details request', { jobId });

    // Get job from database - try by jobId first, then by id
    let scrapeJob = await prisma.scrapeJob.findUnique({
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

    // If not found by jobId, try by id (database primary key)
    if (!scrapeJob) {
      scrapeJob = await prisma.scrapeJob.findUnique({
        where: { id: jobId },
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
    }

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
      jobId: jobId
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/scraper/scrape-job/[jobId] - Delete a scrape job
 * 
 * Permanently delete a job from the database
 * If job is active, cancel it first, then delete
 * 
 * @param params.jobId - The job ID to delete
 * @returns Deletion result
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  let jobId = '';
  
  try {
    const resolvedParams = await params;
    jobId = resolvedParams.jobId;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    apiLogger.info('[ScrapeJob API] Delete job request', { jobId });

    // Check if job exists in database with detailed logging
    // Try to find by jobId first, then by id (database primary key)
    let scrapeJob = await prisma.scrapeJob.findUnique({
      where: { jobId },
      include: {
        seller: {
          select: { name: true }
        }
      }
    });

    // If not found by jobId, try by id (database primary key)
    if (!scrapeJob) {
      scrapeJob = await prisma.scrapeJob.findUnique({
        where: { id: jobId },
        include: {
          seller: {
            select: { name: true }
          }
        }
      });
    }

    apiLogger.info('[ScrapeJob API] Job lookup result', { 
      jobId, 
      found: !!scrapeJob,
      jobStatus: scrapeJob?.status,
      sellerName: scrapeJob?.seller?.name,
      actualJobId: scrapeJob?.jobId,
      searchMethod: scrapeJob ? 'found' : 'not_found'
    });

    if (!scrapeJob) {
      apiLogger.warn('[ScrapeJob API] Job not found in database', { jobId });
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Try to cancel Bull queue job if it's active (before deleting)
    let queueCancelled = false;
    try {
      const queueJob = await getJob(jobId);
      if (queueJob && !queueJob.finishedOn) {
        await queueJob.remove();
        queueCancelled = true;
        apiLogger.info('[ScrapeJob API] Bull queue job cancelled before deletion', { jobId });
      }
    } catch (queueError) {
      apiLogger.warn('[ScrapeJob API] Could not cancel queue job before deletion', { 
        jobId, 
        error: queueError 
      });
      // Continue with deletion even if queue cancel fails
    }

    // Delete job from database using the correct identifier
    await prisma.scrapeJob.delete({
      where: { id: scrapeJob.id }  // Use database ID for deletion
    });

    apiLogger.info('[ScrapeJob API] Job deleted successfully', {
      jobId,
      sellerName: scrapeJob.seller.name,
      originalStatus: scrapeJob.status,
      queueCancelled
    });

    return NextResponse.json({
      success: true,
      message: "Job deleted successfully",
      jobId,
      queueCancelled,
      deletedJob: {
        id: scrapeJob.id,
        jobId: scrapeJob.jobId,
        status: scrapeJob.status,
        sellerName: scrapeJob.seller.name
      }
    });

  } catch (error) {
    apiLogger.logError('[ScrapeJob API] Failed to delete job', error as Error, {
      jobId: jobId
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}