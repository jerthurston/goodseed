import { apiLogger } from "@/lib/helpers/api-logger";
import { prisma } from "@/lib/prisma";
import { ProductListScraper } from "@/scrapers/vancouverseedbank/core/product-list-scrapers";
import { SaveDbService } from "@/scrapers/vancouverseedbank/core/save-db-service";
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
 *     "categoryUrl": "https://vancouverseedbank.ca/shop/jsf/epro-archive-products/",
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
    categoryUrl: string;
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

        if (!body.config?.categoryUrl || !body.config?.categorySlug) {
            apiLogger.warn('[Scraper API] Missing config fields', { config: body.config });
            return NextResponse.json({
                success: false,
                error: {
                    code: 'INVALID_CONFIG',
                    message: 'Missing required config fields: categoryUrl, categorySlug'
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

        // 4. Execute scraping based on mode
        apiLogger.info('[Scraper API] Starting scraping process', { mode: body.mode });
        let result;

        if (body.mode === 'batch') {
            result = await scraper.scrapeProductListByBatch(
                body.config.categoryUrl,
                body.config.startPage!,
                body.config.endPage!
            );
        } else if (body.mode === 'auto') {
            const maxPages = body.config.maxPages || 0;
            result = await scraper.scrapeProductList(
                body.config.categoryUrl,
                maxPages
            );
        } else if (body.mode === 'test') {
            // Test mode: scrape only first 2 pages
            result = await scraper.scrapeProductListByBatch(
                body.config.categoryUrl,
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

        // 5. Save to database
        apiLogger.info('[Scraper API] Saving products to database');

        const sellerId = await dbService.initializeSeller();
        apiLogger.debug('[Scraper API] Seller initialized', { sellerId });

        const categoryId = await dbService.getOrCreateCategory(sellerId, {
            name: 'All Products',
            slug: body.config.categorySlug,
            seedType: undefined
        });
        apiLogger.debug('[Scraper API] Category ready', { categoryId });

        const saveResult = await dbService.saveProductsToCategory(
            categoryId,
            result.products
        );

        apiLogger.info('[Scraper API] Products saved to database', {
            saved: saveResult.saved,
            updated: saveResult.updated,
            errors: saveResult.errors
        });

        // 6. Log activity
        await dbService.logScrapeActivity(
            sellerId,
            'success',
            result.totalProducts,
            result.duration
        );

        // 7. Return response
        const responseData: ScrapeResponseData = {
            scrapeId: `scrape_${Date.now()}`,
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
