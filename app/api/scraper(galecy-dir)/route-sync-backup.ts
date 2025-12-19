import { apiLogger } from "@/lib/helpers/api-logger";
import { prisma } from "@/lib/prisma";
import { ProductListScraper } from "@/scrapers/vancouverseedbank/core/vancouver-product-list-scraper";
import { SaveDbService } from "@/scrapers/vancouverseedbank/core/save-db-service";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/scraper
 * 
 * Main endpoint to trigger product scraping from Vancouver Seed Bank
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
 *     "scrapeId": "scrape_xyz123",
 *     "status": "completed",
 *     "totalProducts": 150,
 *     "totalPages": 10,
 *     "saved": 120,
 *     "updated": 30,
 *     "errors": 0,
 *     "duration": 45000,
 *     "timestamp": "2025-12-09T10:30:00Z"
 *   },
 *   "message": "Scraping completed successfully"
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

interface ScrapeResponseData {
    scrapeId: string;
    jobId: string;
    status: 'completed' | 'failed' | 'in_progress';
    totalProducts: number;
    totalPages: number;
    saved: number;
    updated: number;
    errors: number;
    duration: number;
    timestamp: string;
}

interface ScrapeSuccessResponse {
    success: true;
    data: ScrapeResponseData;
    message: string;
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

        // 3. Initialize services
        apiLogger.info('[Scraper API] Initializing scraper services');

        const scraper = new ProductListScraper();
        const dbService = new SaveDbService(prisma);

        // 4. Initialize seller and create ScrapeJob
        const sellerId = await dbService.initializeSeller();
        apiLogger.debug('[Scraper API] Seller initialized', { sellerId });

        const jobId = `scrape_${randomUUID()}`;
        const scrapeJob = await prisma.scrapeJob.create({
            data: {
                jobId,
                sellerId,
                status: 'PENDING',
                mode: body.mode,
                targetCategoryId: null, // Will be set after category creation
                currentPage: 0,
                totalPages: 0,
                productsScraped: 0,
                productsSaved: 0,
                productsUpdated: 0,
                errors: 0,
            },
        });

        apiLogger.info('[Scraper API] ScrapeJob created', { jobId, status: 'PENDING' });

        // 5. Execute scraping based on mode
        apiLogger.info('[Scraper API] Starting scraping process', { mode: body.mode });

        // Update job status to IN_PROGRESS
        await prisma.scrapeJob.update({
            where: { id: scrapeJob.id },
            data: {
                status: 'IN_PROGRESS',
                startedAt: new Date(),
            },
        });

        apiLogger.info('[Scraper API] ScrapeJob status updated', { jobId, status: 'IN_PROGRESS' });

        let result;

        try {
            if (body.mode === 'batch') {
                result = await scraper.scrapeProductListByBatch(
                    body.config.scrapingSourceUrl,
                    body.config.startPage!,
                    body.config.endPage!
                );
            } else if (body.mode === 'auto') {
                const maxPages = body.config.maxPages || 0;
                result = await scraper.scrapeProductList(
                    body.config.scrapingSourceUrl,
                    maxPages
                );
            } else if (body.mode === 'test') {
                // Test mode: scrape only first 2 pages
                result = await scraper.scrapeProductListByBatch(
                    body.config.scrapingSourceUrl,
                    1,
                    2
                );
            } else {
                // Should never reach here due to validation above
                throw new Error('Invalid mode');
            }

            apiLogger.info('[Scraper API] Scraping completed', {
                totalProducts: result.totalProducts,
                totalPages: result.totalPages,
                duration: result.duration
            });
        } catch (scrapeError) {
            // Mark job as failed
            const errorMessage = scrapeError instanceof Error ? scrapeError.message : 'Scraping failed';
            await prisma.scrapeJob.update({
                where: { id: scrapeJob.id },
                data: {
                    status: 'FAILED',
                    completedAt: new Date(),
                    errorMessage,
                    errorDetails: scrapeError instanceof Error ? { stack: scrapeError.stack } : {},
                },
            });

            apiLogger.logError('[Scraper API] Scraping failed', scrapeError instanceof Error ? scrapeError : new Error(String(scrapeError)), { jobId });
            throw scrapeError;
        }

        // 6. Save to database
        apiLogger.info('[Scraper API] Saving products to database');

        const categoryId = await dbService.getOrCreateCategory(sellerId, {
            name: 'All Products',
            slug: body.config.categorySlug,
            seedType: undefined
        });
        apiLogger.debug('[Scraper API] Category ready', { categoryId });

        // Update job with category info
        await prisma.scrapeJob.update({
            where: { id: scrapeJob.id },
            data: {
                targetCategoryId: categoryId,
                totalPages: result.totalPages,
                productsScraped: result.totalProducts,
            },
        });

        const saveResult = await dbService.saveProductsToCategory(
            categoryId,
            result.products
        );

        apiLogger.info('[Scraper API] Products saved to database', {
            saved: saveResult.saved,
            updated: saveResult.updated,
            errors: saveResult.errors
        });

        // 7. Update job with final results and mark as COMPLETED
        await prisma.scrapeJob.update({
            where: { id: scrapeJob.id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                productsSaved: saveResult.saved,
                productsUpdated: saveResult.updated,
                errors: saveResult.errors,
                duration: result.duration,
            },
        });

        apiLogger.info('[Scraper API] ScrapeJob completed', { jobId, status: 'COMPLETED' });

        // 8. Log activity
        await dbService.logScrapeActivity(
            sellerId,
            'success',
            result.totalProducts,
            result.duration
        );

        // 9. Return response
        const responseData: ScrapeResponseData = {
            scrapeId: `scrape_${Date.now()}`,
            jobId,
            status: 'completed',
            totalProducts: result.totalProducts,
            totalPages: result.totalPages,
            saved: saveResult.saved,
            updated: saveResult.updated,
            errors: saveResult.errors,
            duration: result.duration,
            timestamp: new Date().toISOString()
        };

        apiLogger.info('[Scraper API] Request completed successfully', { ...responseData });

        return NextResponse.json({
            success: true,
            data: responseData,
            message: 'Scraping completed successfully'
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const errorStack = error instanceof Error ? error.stack : undefined;

        apiLogger.logError('[Scraper API]', error instanceof Error ? error : new Error(String(error)), {
            message: errorMessage,
            stack: errorStack
        });

        return NextResponse.json({
            success: false,
            error: {
                code: 'SCRAPE_FAILED',
                message: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error : undefined
            }
        }, { status: 500 });
    }
}
