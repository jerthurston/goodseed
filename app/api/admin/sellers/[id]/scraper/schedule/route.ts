/**
 * API route to handle automatically scraping schedule for a specific seller.
 * Handles GET: Lấy lịch hiện tại
 * Handles POST/PATCH: set cron schedule
 * DELETE: Tắt lịch tự động
 */

import { apiLogger } from "@/lib/helpers/api-logger";
import { getSellerById } from "@/lib/helpers/server/seller/getSellerById";
import { prisma } from "@/lib/prisma";
import { AutoScraperScheduler } from "@/lib/services/auto-scraper/backend/auto-scraper-scheduler.service";
import { getScheduledAutoJobs } from "@/lib/queue/scraper-queue";
import { NextRequest, NextResponse } from "next/server";



interface RouteParams {
    params: Promise<{ id: string }>
}
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        //1. Extract sellerId
        const { id: sellerId } = await params;

        //2. Validate seller existence and configuration
        const seller = await prisma.seller.findUnique(
            {
                where: { id: sellerId },
                include: { scrapingSources: true }
            }
        );

        if (!seller) {
            return NextResponse.json({
                success: false,
                error: {
                    code: 'SELLER_NOT_FOUND',
                    message: 'Seller not found'
                }
            }, { status: 404 });
        }

        // 3. Validate auto scrape configuration
        if (!seller.autoScrapeInterval) {
            return NextResponse.json({
                success: false,
                error: {
                    code: 'AUTO_SCRAPE_NOT_CONFIGURED',
                    message: 'Seller does not have auto scrape interval configured'
                }
            }, { status: 400 });
        }

        if (seller.scrapingSources.length === 0) {
            return NextResponse.json({
                success: false,
                error: {
                    code: 'NO_SCRAPING_SOURCES',
                    message: 'Seller has no scraping sources configured'
                }
            }, { status: 400 });
        }

        // 4. Log the operation
        apiLogger.info('[Individual Auto Scraper API] Starting auto scraper for seller', {
            sellerId,
            sellerName: seller.name,
            interval: seller.autoScrapeInterval
        });

        // 5. Schedule the job using AutoScraperScheduler
        const result = await AutoScraperScheduler.scheduleSellerAutoJob(sellerId);

        const response = {
            success: true,
            data: {
                sellerId,
                sellerName: seller.name,
                status: result.status,
                jobId: result.jobId,
                autoScrapeInterval: seller.autoScrapeInterval,
                cronPattern: result.cronPattern,
                scrapingSourcesLength: seller.scrapingSources.length,
                message: 'Auto scraper scheduled successfully'
            },
            timeStamp: new Date().toISOString()
        }

        return NextResponse.json(response);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        apiLogger.logError('[Individual Auto Scraper API] Failed to start auto scraper for seller', error as Error, {
            sellerId: (await params).id
        });

        return NextResponse.json({
            success: false,
            error: {
                code: 'SELLER_AUTO_SCRAPER_START_FAILED',
                message: errorMessage
            },
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/sellers/{sellerId}/scraper/schedule
 * Stop auto scraping cho seller cụ thể
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        // 1. Extract sellerId
        const { id: sellerId } = await params;

        // 2. Validate seller existence
        const seller = await prisma.seller.findUnique({
            where: { id: sellerId }
        });

        if (!seller) {
            return NextResponse.json({
                success: false,
                error: {
                    code: 'SELLER_NOT_FOUND',
                    message: 'Seller not found'
                }
            }, { status: 404 });
        }

        // 3. Log the operation
        apiLogger.info('[Individual Auto Scraper API] Stopping auto scraper for seller', {
            sellerId,
            sellerName: seller.name
        });

        // 4. Stop the auto scraper job
        const result = await AutoScraperScheduler.unscheduleSellerAutoJob(sellerId);

        // 5. Return success response
        const response = {
            success: true,
            data: {
                sellerId,
                sellerName: seller.name,
                status: 'stopped',
                message: 'Auto scraping stopped successfully for seller'
            },
            timeStamp: new Date().toISOString()
        };

        apiLogger.info('[Individual Auto Scraper API] Auto scraper stopped successfully', {
            sellerId,
            sellerName: seller.name
        });

        return NextResponse.json(response);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        apiLogger.logError('[Individual Auto Scraper API] Failed to stop auto scraper for seller', error as Error, {
            sellerId: (await params).id
        });

        return NextResponse.json({
            success: false,
            error: {
                code: 'SELLER_AUTO_SCRAPER_STOP_FAILED',
                message: errorMessage
            },
            timeStamp: new Date().toISOString()
        }, { status: 500 });
    }
}

/**
 * GET /api/admin/sellers/{sellerId}/scraper/schedule
 * Get current auto scraper status cho seller
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        // 1. Extract sellerId
        const { id: sellerId } = await params;

        // 2. Get seller info với scrapingSources
        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: { scrapingSources: true }
        });

        if (!seller) {
            return NextResponse.json({
                success: false,
                error: {
                    code: 'SELLER_NOT_FOUND',
                    message: 'Seller not found'
                }
            }, { status: 404 });
        }

        // 3. Check current job status trong Bull queue
        const scheduledJobs = await getScheduledAutoJobs();
        const sellerJob = scheduledJobs.find(job => 
            job.id === `auto_scrape_${sellerId}` ||
            job.name?.includes(sellerId)
        );

        // 4. Prepare response data
        const response = {
            success: true,
            data: {
                sellerId,
                sellerName: seller.name,
                autoScrapeInterval: seller.autoScrapeInterval,
                isScheduled: !!sellerJob,
                isConfigured: !!(seller.autoScrapeInterval && seller.scrapingSources.length > 0),
                scrapingSourcesCount: seller.scrapingSources.length,
                jobDetails: sellerJob ? {
                    jobId: sellerJob.id,
                    cronPattern: sellerJob.cron || sellerJob.every?.toString(),
                    nextRun: sellerJob.next ? new Date(sellerJob.next).toISOString() : null,
                    every: sellerJob.every,
                    endDate: sellerJob.endDate ? new Date(sellerJob.endDate).toISOString() : null
                } : null,
                configuration: {
                    interval: seller.autoScrapeInterval ? `${seller.autoScrapeInterval}h` : null,
                    isActive: seller.isActive,
                    hasScrapingSources: seller.scrapingSources.length > 0,
                    scrapingSources: seller.scrapingSources.map(source => ({
                        name: source.scrapingSourceName,
                        url: source.scrapingSourceUrl,
                        maxPage: source.maxPage
                    }))
                }
            },
            timeStamp: new Date().toISOString()
        };

        apiLogger.info('[Individual Auto Scraper API] Retrieved auto scraper status', {
            sellerId,
            sellerName: seller.name,
            isScheduled: !!sellerJob,
            autoScrapeInterval: seller.autoScrapeInterval
        });

        return NextResponse.json(response);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        apiLogger.logError('[Individual Auto Scraper API] Failed to get auto scraper status', error as Error, {
            sellerId: (await params).id
        });

        return NextResponse.json({
            success: false,
            error: {
                code: 'SELLER_AUTO_SCRAPER_STATUS_FAILED',
                message: errorMessage
            },
            timeStamp: new Date().toISOString()
        }, { status: 500 });
    }
}  
