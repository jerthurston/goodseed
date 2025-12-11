/**
 * GET /api/cron/scraper
 * 
 * Cron endpoint for automated daily scraping
 * Triggered by AWS EventBridge or other schedulers
 * 
 * Authorization: Requires CRON_SECRET header
 * 
 * Flow:
 * 1. Verify authorization
 * 2. Query all active sellers
 * 3. Queue scraping job for each seller
 * 4. Return summary
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "totalSellers": 1,
 *     "jobsQueued": 1,
 *     "sellers": [
 *       {
 *         "sellerId": "xxx",
 *         "sellerName": "Vancouver Seed Bank",
 *         "jobId": "scrape_xyz"
 *       }
 *     ]
 *   }
 * }
 */

import { apiLogger } from "@/lib/helpers/api-logger";
import { prisma } from "@/lib/prisma";
import { addScraperJob } from "@/lib/queue/scraper-queue";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

interface CronResponseData {
    totalSellers: number;
    jobsQueued: number;
    sellers: Array<{
        sellerId: string;
        sellerName: string;
        jobId: string;
    }>;
    timestamp: string;
}

interface CronSuccessResponse {
    success: true;
    data: CronResponseData;
}

interface CronErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
    };
}

type CronResponse = CronSuccessResponse | CronErrorResponse;

export async function GET(req: NextRequest): Promise<NextResponse<CronResponse>> {
    try {
        // 1. Verify authorization
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            apiLogger.debug('[Cron API] CRON_SECRET not configured');
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'CONFIG_ERROR',
                        message: 'CRON_SECRET not configured',
                    },
                },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            apiLogger.warn('[Cron API] Unauthorized access attempt', {
                ip: req.headers.get('x-forwarded-for') || 'unknown',
            });
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Invalid or missing authorization',
                    },
                },
                { status: 401 }
            );
        }

        apiLogger.info('[Cron API] Authorized cron request received');

        // 2. Query all active sellers
        const sellers = await prisma.seller.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                scrapingSourceUrl: true,
            },
        });

        if (sellers.length === 0) {
            apiLogger.warn('[Cron API] No active sellers found');
            return NextResponse.json({
                success: true,
                data: {
                    totalSellers: 0,
                    jobsQueued: 0,
                    sellers: [],
                    timestamp: new Date().toISOString(),
                },
            });
        }

        apiLogger.info('[Cron API] Found active sellers', { count: sellers.length });

        // 3. Queue job for each seller
        const queuedJobs: CronResponseData['sellers'] = [];

        for (const seller of sellers) {
            const jobId = `scrape_${randomUUID()}`;

            // Create ScrapeJob record
            await prisma.scrapeJob.create({
                data: {
                    jobId,
                    sellerId: seller.id,
                    status: 'PENDING',
                    mode: 'auto', // Auto mode for cron
                    targetCategoryId: null,
                    currentPage: 0,
                    totalPages: 0,
                    productsScraped: 0,
                    productsSaved: 0,
                    productsUpdated: 0,
                    errors: 0,
                },
            });

            // Add to queue
            await addScraperJob({
                jobId,
                sellerId: seller.id,
                mode: 'auto',
                config: {
                    scrapingSourceUrl: seller.scrapingSourceUrl,
                    categorySlug: 'all-products',
                    maxPages: 0, // No limit for auto mode
                },
            });

            queuedJobs.push({
                sellerId: seller.id,
                sellerName: seller.name,
                jobId,
            });

            apiLogger.info('[Cron API] Job queued for seller', {
                sellerId: seller.id,
                sellerName: seller.name,
                jobId,
            });
        }

        // 4. Return summary
        const responseData: CronResponseData = {
            totalSellers: sellers.length,
            jobsQueued: queuedJobs.length,
            sellers: queuedJobs,
            timestamp: new Date().toISOString(),
        };

        apiLogger.logResponse('[Cron API] Cron job completed', { responseData });

        return NextResponse.json({
            success: true,
            data: responseData,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        apiLogger.logError(
            '[Cron API]',
            error instanceof Error ? error : new Error(String(error)),
            { message: errorMessage }
        );

        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'CRON_FAILED',
                    message: errorMessage,
                },
            },
            { status: 500 }
        );
    }
}
