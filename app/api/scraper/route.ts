import { apiLogger } from "@/lib/helpers/api-logger";
import { prisma } from "@/lib/prisma";
import { addScraperJob } from "@/lib/queue/scraper-queue";
import { SaveDbService } from "@/scrapers/vancouverseedbank/core/save-db-service";
import ScraperFactory from "@/lib/factories/scraper-factory";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/scraper (Queue Version - Phase 3)
 * 
 * Queues product scraping job for background processing
 * Returns immediately with jobId for status tracking
 * 
 * Request Body:
 * {
 *   "action": "scrape-seeds",
 *   "source": "vancouverseedbank",
 *   "mode": "batch" | "auto" | "test",
 *   "config": {
 *     "startPage": 1,
 *     "endPage": 10,
 *     "maxPages": 0,
 *     "scrapingSourceUrl": "https://vancouverseedbank.ca/shop/jsf/epro-archive-products/",
 *     "categorySlug": "all-products"
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "jobId": "scrape_xyz123",
 *     "status": "queued",
 *     "message": "Job queued successfully. Use /api/scraper/status/{jobId} to track progress"
 *   }
 * }
 */

// Type definitions for request/response
interface ScrapeConfig {
    startPage?: number;
    endPage?: number;
    maxPages?: number;
    scrapingSourceUrl: string;
    categorySlug: string;
}

interface ScrapeRequestBody {
    action: 'scrape-seeds';
    source: string;
    mode: 'batch' | 'auto' | 'test';
    config: ScrapeConfig;
}

interface QueuedResponseData {
    jobId: string;
    status: 'queued';
    message: string;
}

interface ScrapeSuccessResponse {
    success: true;
    data: QueuedResponseData;
}

interface ScrapeErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}

type ScrapeResponse = ScrapeSuccessResponse | ScrapeErrorResponse;

export async function POST(req: NextRequest): Promise<NextResponse<ScrapeResponse>> {
    try {
        // 1. Parse request body
        const body: ScrapeRequestBody = await req.json();

        apiLogger.info('[Scraper API] Received scrape request', {
            action: body.action,
            source: body.source,
            mode: body.mode,
            config: body.config,
        });

        // 2. Validate input
        if (!body.action || body.action !== 'scrape-seeds') {
            apiLogger.warn('[Scraper API] Invalid action', { action: body.action });
            return NextResponse.json({
                success: false,
                error: {
                    code: 'INVALID_ACTION',
                    message: 'Action must be "scrape-seeds"'
                }
            }, { status: 400 });
        }

        if (!body.source) {
            apiLogger.warn('[Scraper API] Missing source');
            return NextResponse.json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Missing required field: source'
                }
            }, { status: 400 });
        }

        // Validate source
        if (!ScraperFactory.isValidSource(body.source)) {
            apiLogger.warn('[Scraper API] Invalid source', { source: body.source });
            const supportedSources = ScraperFactory.getSupportedSources();
            return NextResponse.json({
                success: false,
                error: {
                    code: 'INVALID_SOURCE',
                    message: `Invalid source. Supported sources: ${supportedSources.join(', ')}`
                }
            }, { status: 400 });
        }

        if (!body.mode || !['batch', 'auto', 'test'].includes(body.mode)) {
            apiLogger.warn('[Scraper API] Invalid mode', { mode: body.mode });
            return NextResponse.json({
                success: false,
                error: {
                    code: 'INVALID_MODE',
                    message: 'Mode must be one of: batch, auto, test'
                }
            }, { status: 400 });
        }

        if (!body.config?.scrapingSourceUrl || !body.config?.categorySlug) {
            apiLogger.warn('[Scraper API] Missing config fields', { config: body.config });
            return NextResponse.json({
                success: false,
                error: {
                    code: 'INVALID_CONFIG',
                    message: 'Missing required config fields: scrapingSourceUrl, categorySlug'
                }
            }, { status: 400 });
        }

        // Validate mode-specific config
        if (body.mode === 'batch') {
            if (!body.config.startPage || !body.config.endPage) {
                apiLogger.warn('[Scraper API] Missing batch config', { config: body.config });
                return NextResponse.json({
                    success: false,
                    error: {
                        code: 'INVALID_BATCH_CONFIG',
                        message: 'Batch mode requires startPage and endPage'
                    }
                }, { status: 400 });
            }

            if (body.config.startPage < 1 || body.config.endPage < body.config.startPage) {
                apiLogger.warn('[Scraper API] Invalid page range', { config: body.config });
                return NextResponse.json({
                    success: false,
                    error: {
                        code: 'INVALID_PAGE_RANGE',
                        message: 'startPage must be >= 1 and endPage must be >= startPage'
                    }
                }, { status: 400 });
            }
        }

        // 3. Initialize seller using factory
        const scraperFactory = new ScraperFactory(prisma);
        const dbService = scraperFactory.createSaveDbService(body.source);
        const sellerId = await dbService.initializeSeller();
        apiLogger.debug('[Scraper API] Seller initialized', { sellerId, source: body.source });

        // 4. Create ScrapeJob record in database
        const jobId = `scrape_${randomUUID()}`;
        await prisma.scrapeJob.create({
            data: {
                jobId,
                sellerId,
                status: 'PENDING',
                mode: body.mode,
                targetCategoryId: null,
                currentPage: 0,
                totalPages: 0,
                productsScraped: 0,
                productsSaved: 0,
                productsUpdated: 0,
                errors: 0,
            },
        });

        apiLogger.info('[Scraper API] ScrapeJob created', { jobId, status: 'PENDING' });

        // 5. Add job to queue
        await addScraperJob({
            jobId,
            sellerId,
            source: body.source,
            mode: body.mode,
            config: {
                scrapingSourceUrl: body.config.scrapingSourceUrl,
                categorySlug: body.config.categorySlug,
                startPage: body.config.startPage,
                endPage: body.config.endPage,
                maxPages: body.config.maxPages,
            },
        });

        apiLogger.info('[Scraper API] Job added to queue', { jobId });

        // 6. Return immediately with jobId
        const responseData: QueuedResponseData = {
            jobId,
            status: 'queued',
            message: `Job queued successfully. Use /api/scraper/status/${jobId} to track progress`,
        };

        return NextResponse.json({
            success: true,
            data: responseData,
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        apiLogger.logError('[Scraper API]', error instanceof Error ? error : new Error(String(error)), {
            message: errorMessage,
        });

        return NextResponse.json({
            success: false,
            error: {
                code: 'QUEUE_FAILED',
                message: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error : undefined
            }
        }, { status: 500 });
    }
}
