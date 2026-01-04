/**
 * Common Crawler - Reusable Scraper Infrastructure
 * 
 * KIẾN TRÚC TỔNG QUAN:
 * - Tái sử dụng được cho tất cả các cannabis seed sites
 * - Trích xuất các thành phần chung: setup, error handling, polite crawling
 * - Mỗi site chỉ cần implement requestHandler riêng
 * - Giảm duplicate code và tăng maintainability
 * 
 * COMMON COMPONENTS:
 * - Request Queue và Dataset setup
 * - Error Handler với HTTP status code handling
 * - Polite Crawler với robots.txt compliance
 * - Crawlee CheerioCrawler configuration
 * - Logging và performance metrics
 */

import { ProductsDataResultFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { CheerioAPI, CheerioCrawler, CheerioCrawlingContext, Dataset, ErrorHandler, Log, RequestQueue } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { ACCEPTLANGUAGE, MAX_DELAY_DEFAULT, MIN_DELAY_DEFAULT, USERAGENT } from './constants';

/**
 * Common context interface for all scrapers
 */
export interface CommonScrapingContext {
    scrapingSourceUrl: string;
    sourceName: string;
    dbMaxPage: number;
}

/**
 * Request handler type - mỗi site sẽ implement riêng
 */
export type SiteSpecificRequestHandler = (
    context: CheerioCrawlingContext,
    sharedData: {
        siteConfig: SiteConfig;
        sourceContext: CommonScrapingContext;
        startPage?: number | null;
        endPage?: number | null;
        fullSiteCrawl?: boolean | null;
        allProducts: ProductCardDataFromCrawling[];
        maxPages: { value: number | null };
        totalProducts: { value: number };
        actualPages: { value: number };
        dataset: Dataset;
        politeCrawler: SimplePoliteCrawler;
        requestQueue: RequestQueue;
        getScrapingUrl: (baseUrl: string, pageNumber: number) => string;
    }
) => Promise<void>;

/**
 * Common Crawler Class - Reusable infrastructure for all cannabis seed sites
 */
export class CommonCrawler {
    private siteConfig: SiteConfig;
    private sourceContext: CommonScrapingContext;
    private startPage?: number | null;
    private endPage?: number | null;
    private fullSiteCrawl?: boolean | null;
    private requestHandler: SiteSpecificRequestHandler;
    private getScrapingUrl: (baseUrl: string, pageNumber: number) => string;

    constructor(
        siteConfig: SiteConfig,
        sourceContext: CommonScrapingContext,
        requestHandler: SiteSpecificRequestHandler,
        getScrapingUrl: (baseUrl: string, pageNumber: number) => string,
        startPage?: number | null,
        endPage?: number | null,
        fullSiteCrawl?: boolean | null
    ) {
        this.siteConfig = siteConfig;
        this.sourceContext = sourceContext;
        this.requestHandler = requestHandler;
        this.getScrapingUrl = getScrapingUrl;
        this.startPage = startPage;
        this.endPage = endPage;
        this.fullSiteCrawl = fullSiteCrawl;
    }

    /**
     * Initialize polite crawler with common settings
     */
    private createPoliteCrawler(): SimplePoliteCrawler {
        return new SimplePoliteCrawler({
            userAgent: USERAGENT,
            acceptLanguage: ACCEPTLANGUAGE,
            minDelay: MIN_DELAY_DEFAULT,
            maxDelay: MAX_DELAY_DEFAULT
        });
    }

    /**
     * Common error handler for all sites
     */
    private createErrorHandler(siteName: string): ErrorHandler<CheerioCrawlingContext> {
        return async (context: CheerioCrawlingContext, error: Error): Promise<void> => {
            const { request, log }: {
                request: CheerioCrawlingContext['request'];
                log: Log;
            } = context;
            
            // POLITE CRAWLING: Handle HTTP status codes properly
            const httpError = error as any;
            if (httpError?.response?.status) {
                const statusCode: number = httpError.response.status;
                
                if (statusCode === 429) {
                    log.info(`[${siteName}] Rate limited (429) - increasing delay: ${request.url}`);
                    await new Promise(resolve => setTimeout(resolve, 10000)); // 10s delay
                    throw error; // Let Crawlee retry
                } else if (statusCode >= 500) {
                    log.info(`[${siteName}] Server error (${statusCode}) - will retry: ${request.url}`);
                    throw error;
                } else if (statusCode === 404) {
                    log.info(`[${siteName}] Page not found (404) - skipping: ${request.url}`);
                    return; // Skip this request
                }
            }
            
            log.error(`[${siteName}] Unhandled error for ${request.url}:`, error);
            throw error;
        };
    }

    /**
     * Common crawler configuration
     */
    private createCrawlerConfig(
        requestQueue: RequestQueue,
        requestHandler: (context: CheerioCrawlingContext) => Promise<void>,
        errorHandler: ErrorHandler<CheerioCrawlingContext>
    ) {
        
        return {
            requestQueue,
            requestHandler,
            errorHandler,
            maxRequestRetries: 3,
            maxRequestsPerCrawl: 0, // No limit
            maxConcurrency: 1,      // Sequential processing
            requestHandlerTimeoutSecs: 60,
            navigationTimeoutSecs: 30,
        };
    }

    /**
     * Main crawling method - Reusable for all sites
     */
    async crawl(): Promise<ProductsDataResultFromCrawling> {
        const startTime = Date.now();
        const siteName = this.siteConfig.name;

        // Debug log
        apiLogger.info(`[${siteName} Scraper] Starting with siteConfig`, {
            name: this.siteConfig.name,
            baseUrl: this.siteConfig.baseUrl,
            isImplemented: this.siteConfig.isImplemented,
            scrapingSourceUrl: this.sourceContext.scrapingSourceUrl
        });

        // Validate sourceContext
        if (!this.sourceContext.scrapingSourceUrl) {
            throw new Error(`[${siteName} Scraper] scrapingSourceUrl is required in sourceContext`);
        }

        // Initialize dataset and request queue
        const runId = Date.now();
        const datasetName = `${siteName.toLowerCase().replace(/\s+/g, '')}-${runId}`;
        const dataset = await Dataset.open(datasetName);
        const requestQueue = await RequestQueue.open(`${siteName.toLowerCase().replace(/\s+/g, '')}-queue-${runId}`);

        // Initialize polite crawler
        const politeCrawler = this.createPoliteCrawler();

        // Shared data between pages
        let totalProducts = 0;
        let actualPages = 0;
        let allProducts: ProductCardDataFromCrawling[] = [];
        let maxPages: number | null = null;

        // Shared data objects (passed by reference để site-specific handler có thể modify)
        const sharedData = {
            siteConfig: this.siteConfig,
            sourceContext: this.sourceContext,
            startPage: this.startPage,
            endPage: this.endPage,
            fullSiteCrawl: this.fullSiteCrawl,
            allProducts,
            maxPages: { value: maxPages },
            totalProducts: { value: totalProducts },
            actualPages: { value: actualPages },
            dataset,
            politeCrawler,
            requestQueue,
            getScrapingUrl: this.getScrapingUrl
        };

        // Add first page to queue
        const firstPageUrl = this.getScrapingUrl(this.sourceContext.scrapingSourceUrl, 1);
        await requestQueue.addRequest({
            url: firstPageUrl,
            userData: { pageNumber: 1 }
        });

        // Wrapper for site-specific request handler
        const wrappedRequestHandler = async (context: CheerioCrawlingContext): Promise<void> => {
            const { request, log } = context;
            const pageNumber = request.userData?.pageNumber || 1;
            
            log.info(`[${siteName}] Processing page ${pageNumber}: ${request.url}`);

            // POLITE CRAWLING: Check robots.txt compliance
            const isAllowed = await politeCrawler.isAllowed(request.url);
            if (!isAllowed) {
                log.error(`[${siteName}] BLOCKED by robots.txt: ${request.url}`);
                throw new Error(`robots.txt blocked access to ${request.url}`);
            }

            try {
                // Call site-specific request handler
                await this.requestHandler(context, sharedData);

                // POLITE CRAWLING: Apply delay
                const delayMs = await politeCrawler.getCrawlDelay(request.url);
                log.info(`[${siteName}] Using polite crawl delay: ${delayMs}ms for ${request.url}`);
                await new Promise(resolve => setTimeout(resolve, delayMs));

            } catch (error) {
                log.error(`[${siteName}] Error processing page ${pageNumber}:`, { error });
                throw error;
            }
        };

        // Create error handler
        const errorHandler = this.createErrorHandler(siteName);

        // Configure crawler
        const crawlerConfig = this.createCrawlerConfig(requestQueue, wrappedRequestHandler, errorHandler);
        const crawler = new CheerioCrawler(crawlerConfig);

        // Run crawler
        await crawler.run();

        // Get final results from shared data
        totalProducts = sharedData.totalProducts.value;
        actualPages = sharedData.actualPages.value;
        maxPages = sharedData.maxPages.value;

        // Log results
        const duration = Date.now() - startTime;
        
        apiLogger.info(`[${siteName} Scraper] Crawling completed`, {
            totalProducts: sharedData.allProducts.length,
            totalPages: actualPages,
            maxPages,
            duration: `${duration}ms`,
            scrapingSourceUrl: this.sourceContext.scrapingSourceUrl
        });

        return {
            totalProducts: sharedData.allProducts.length,
            totalPages: actualPages,
            products: sharedData.allProducts,
            timestamp: new Date(),
            duration: Date.now() - startTime,
        };
    }
}

/**
 * 📋 USAGE PATTERN:
 * 
 * 1. Site-specific scraper creates CommonCrawler instance
 * 2. Provides site-specific requestHandler function
 * 3. Calls crawler.crawl() to execute
 * 4. CommonCrawler handles all infrastructure
 * 5. Site-specific handler focuses only on data extraction
 * 
 * EXAMPLE:
 * ```typescript
 * const crawler = new CommonCrawler(
 *     siteConfig,
 *     sourceContext,
 *     async (context, sharedData) => {
 *         // Site-specific extraction logic here
 *         const result = extractProductsFromHTML($, siteConfig, ...);
 *         sharedData.allProducts.push(...result.products);
 *         // Handle pagination logic
 *     },
 *     getScrapingUrl,
 *     startPage,
 *     endPage,
 *     fullSiteCrawl
 * );
 * 
 * return await crawler.crawl();
 * ```
 */