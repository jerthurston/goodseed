
/**
 * POST /api/admin/scraper/scrape-job/[jobId]/cancel - Cancel or stop a running scrape job
 * Workflow:
 
 */

import { apiLogger } from "@/lib/helpers/api-logger";
import { prisma } from "@/lib/prisma";
import { getScraperJob } from "@/lib/queue/scraper-queue";
import { ScrapeJobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";


export async function POST(
    request:NextRequest,
    {params}:{params:Promise<{id:string}>}
) {
   try {
     const {id:sellerId} = await params;

    let body;
    try {
        body = await request.json();
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: "Invalid JSON body"
        }, { status: 400 });
    }

    const { jobId, reason = 'Job cancelled by admin' } = body;
    
    // Validate required jobId
    if (!jobId) {
        return NextResponse.json({
            success: false,
            error: "Job ID is required"
        }, { status: 400 });
    }

    apiLogger.info("[Seller Cancel Job API]", { 
        sellerId, 
        jobId,
        reason,
        timeStamp: new Date().toString() 
    });

    // Step 1: Validate seller exists and get seller Info

    const seller = await prisma.seller.findUnique({
        where:{id:sellerId},
        select:{
            id:true,
            name:true,
            isActive:true
        }
    });

    if(!seller) {
        return NextResponse.json({
            success:false,
            message:"Seller not found"
        })
    }

    // Step 2: Find specific scrape job by jobId and sellerId
    apiLogger.debug("[Seller Cancel Job API] Searching for job", { 
        jobId, 
        sellerId,
        searchCriteria: {
            jobId,
            sellerId,
            statusIn: ['CREATED', 'WAITING', 'DELAYED', 'ACTIVE']
        }
    });

    const unfinishedJob = await prisma.scrapeJob.findFirst({
        where: {
            jobId: jobId,           // Must match exact jobId from request
            sellerId: sellerId,     // Must belong to this seller
            status: {
                in: [ScrapeJobStatus.CREATED, ScrapeJobStatus.WAITING, ScrapeJobStatus.DELAYED, ScrapeJobStatus.ACTIVE]
            }
        }
    });

    apiLogger.debug("[Seller Cancel Job API] Found unfinished job", { unfinishedJob });

    // Also check if job exists with any status
    const anyJob = await prisma.scrapeJob.findFirst({
        where: { jobId, sellerId },
        select: { id: true, jobId: true, status: true, mode: true }
    });
    
    apiLogger.debug("[Seller Cancel Job API] Job with any status", { anyJob });

    if (!unfinishedJob) {
        return NextResponse.json({
            success: false,
            error: "Job not found or cannot be cancelled"
        }, { status: 404 });
    }

    let queueCancelResult = 'not_applicable'

    // Step 3: Cancel job in Bull Queue (if exists)
    try {
        const bullJob = await getScraperJob(unfinishedJob.jobId);
        if(bullJob) {
            // Step 3.1: Check if worker is actively processing
            const isActivelyProcessing = bullJob.processedOn && !bullJob.finishedOn;
            
            if (isActivelyProcessing) {
                const elapsedSeconds = Math.floor((Date.now() - bullJob.processedOn!) / 1000);
                
                apiLogger.warn('[Seller Cancel Job] Cannot stop ACTIVE job - worker is processing', {
                    jobId: unfinishedJob.jobId,
                    sellerId,
                    sellerName: seller.name,
                    status: 'ACTIVE',
                    startedAt: new Date(bullJob.processedOn!),
                    elapsedSeconds
                });
                
                return NextResponse.json({
                    success: false,
                    canStop: false,
                    status: 'ACTIVE',
                    message: 'Cannot stop job: Worker is currently processing.',
                    recommendation: 'The job will complete naturally. Workers cannot be interrupted mid-execution.',
                    jobInfo: {
                        jobId: unfinishedJob.jobId,
                        startedAt: new Date(bullJob.processedOn!),
                        elapsedSeconds,
                        estimatedCompletion: 'The job is actively running and will finish soon.'
                    }
                }, { status: 400 });
            }
            
            // Step 3.2: If not active, safe to remove from queue
            await bullJob.remove();
            queueCancelResult = 'removed_from_queue';
            apiLogger.info("[Seller Cancel Job API] Bull job removed", {
                jobId: unfinishedJob.jobId,
                sellerId
            });
        } else {
            queueCancelResult = 'not_found_in_queue';
        }

    } catch (error) {
        // Log error but don't fail the entire operation
        apiLogger.logError('[Seller Cancel Job] Failed to remove from queue', error as Error, {
          jobId: unfinishedJob.jobId,
          sellerId
        });
        queueCancelResult = 'queue_removal_failed';
    }

    // Step 5: Update job status in database
    apiLogger.info('[Seller Cancel Job] Job cancelled successfully in queue and updating database');

    const cancelledJob = await prisma.scrapeJob.update({
        where:{id:unfinishedJob.id},
        data:{
            status:ScrapeJobStatus.CANCELLED,
            completedAt: new Date(),
            errorMessage:reason,
            updatedAt: new Date()
        }
    })

     // Step 5: Update job status in database
    apiLogger.info('[Seller Cancel Job] Job cancelled successfully in queue and updating database', {
      jobId: cancelledJob.jobId,
      sellerId,
      sellerName: seller.name,
      previousStatus: cancelledJob.status,
      newStatus: 'CANCELLED',
      reason,
      queueCancelResult,
      cancelledAt: cancelledJob.completedAt
    });


    // Step 6: Clean up any related resources

    apiLogger.info('[Seller Cancel Job] Cleaning up resources', {
      jobId: cancelledJob.jobId,
      sellerId,
      sellerName: seller.name
    });

    const response = {
        success:true,
        data:{
            jobId: unfinishedJob.jobId,
            sellerId,
            reason,
            queueStatus: queueCancelResult
        },
        message:`Scrape job cancelled successfully`
    }

    // Respond to the client
    return NextResponse.json(response);

   } catch (error) {
       apiLogger.logError('[Seller Cancel Job API] Failed to cancel job', error as Error, {
      sellerId: (await params).id
    });

    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel scrape job. Please try again.',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        }
      },
      { status: 500 }
    );
   }
}