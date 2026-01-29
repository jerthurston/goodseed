/**
 * Cron endpoint for automated scraping (triggered by GitHub Actions or external scheduler)
 * 
 * Purpose: Trigger scraping jobs for ALL sellers with auto scraper ENABLED by admin
 * 
 * Authorization: Requires CRON_SECRET in Authorization header (Bearer token)
 * 
 * Flow:
 * 1. Verify authorization (Bearer token with CRON_SECRET)
 * 2. Query sellers with auto scraper enabled:
 *    - isActive = true
 *    - autoScrapeInterval > 0 (configured by admin in dashboard)
 * 3. For each eligible seller:
 *    - Create ScrapeJob record with mode='auto'
 *    - Add job to Bull Queue (Upstash Redis)
 *    - Use seller's configured scrapingSources
 * 4. Return summary of queued jobs
 * 
 * Admin Control Flow:
 * - Admin enables auto scraper: autoScrapeInterval = 6 (hours) → Included in cron
 * - Admin disables auto scraper: autoScrapeInterval = null → Excluded from cron
 * 
 * Scheduler Options:
 * - GitHub Actions (Free): .github/workflows/cron-jobs.yml (Daily at 2 AM UTC)
 * - Vercel Cron (Pro $20/month): vercel.json crons config
 * - External: cron-job.org, AWS EventBridge, etc.
 * 
 * Response Example:
 * {
 *   "success": true,
 *   "data": {
 *     "totalSellers": 2,
 *     "jobsQueued": 2,
 *     "sellers": [
 *       {
 *         "sellerId": "cm5abc123",
 *         "sellerName": "Vancouver Seed Bank",
 *         "jobId": "scrape_xyz-789"
 *       },
 *       {
 *         "sellerId": "cm5def456",
 *         "sellerName": "Crop King Seeds",
 *         "jobId": "scrape_abc-456"
 *       }
 *     ],
 *     "timestamp": "2026-01-28T02:00:00.000Z"
 *   }
 * }
 */

import { apiLogger } from "@/lib/helpers/api-logger";
import { prisma } from "@/lib/prisma";
import { ScrapeJobStatus } from "@prisma/client";
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

        // 2. Query only sellers with auto scraper ENABLED by admin
        // Auto scraper is enabled when: isActive=true AND autoScrapeInterval > 0
        const sellers = await prisma.seller.findMany({
            where: { 
                isActive: true,
                autoScrapeInterval: {
                    not: null,         // Must have interval configured
                    gt: 0              // Interval must be greater than 0 (enabled by admin)
                }
            },
            select: {
                id: true,
                name: true,
                autoScrapeInterval: true,  // Get interval config for logging
                scrapingSources: {
                    select: {
                        scrapingSourceUrl: true,
                        scrapingSourceName: true,
                        maxPage: true
                    }
                }
            },
        });

        if (sellers.length === 0) {
            apiLogger.warn('[Cron API] No active sellers with auto scraper enabled found');
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

        apiLogger.info('[Cron API] Found active sellers with auto scraper enabled', { 
            count: sellers.length,
            sellers: sellers.map(s => ({
                name: s.name,
                interval: `${s.autoScrapeInterval}h`,
                sourcesCount: s.scrapingSources.length
            }))
        });

        // 3. Queue job for each seller
        const queuedJobs: CronResponseData['sellers'] = [];

        for (const seller of sellers) {
            const jobId = `scrape_${randomUUID()}`;

            // Create ScrapeJob record in database
            await prisma.scrapeJob.create({
                data: {
                    jobId,
                    sellerId: seller.id,
                    status: ScrapeJobStatus.CREATED,
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

            // Add to queue bull
            await addScraperJob({
                jobId,
                sellerId: seller.id,
                scrapingSources: seller.scrapingSources, // Convert seller name to source
                config: {
                    fullSiteCrawl: true,
                    startPage: 0,
                    endPage: 0,
                    mode: 'auto'
                }
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
                autoScrapeInterval: `${seller.autoScrapeInterval}h`,
                scrapingSourcesCount: seller.scrapingSources.length
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
