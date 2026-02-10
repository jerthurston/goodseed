/**
 * Mary Jane's Garden Product List Scraper (Refactored with Best Practices)
 * 
 * ARCHITECTURE OVERVIEW:
 * - Follows general-worker-flow.md best practices
 * - WordPress standard pagination handling (/page/N/)
 * - WooCommerce product structure extraction
 * - Polite crawling with robots.txt compliance
 * - Memory-efficient with proper cleanup
 * 
 * OPTIMIZATION:
 * - ✅ ProgressLogger for milestone-based logging (every 10%)
 * - ✅ MemoryMonitor for tracking memory usage
 * - ✅ Robots.txt parsing and dynamic rate limiting
 * - ✅ Proper cleanup (requestQueue.drop() + crawler.teardown())
 * - ✅ Structured logging with apiLogger
 */

import { extractProductsFromHTML } from '@/scrapers/maryjanesgarden/utils/extractProductsFromHTML';
import { getScrapingUrl } from '@/scrapers/maryjanesgarden/utils/getScrapingUrl';
import { ProductCardDataFromCrawling, ProductsDataResultFromCrawling } from '@/types/crawl.type';
import { CheerioCrawler, CheerioCrawlingContext, ErrorHandler, Log, RequestQueue } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';
import { ProgressLogger, MemoryMonitor } from '@/scrapers/(common)/logging-helpers';

/**
 * MaryJanesGardenScraper - Site-specific implementation with best practices
 * 
 * RESPONSIBILITIES:
 * 1. 🕷️ Extract products from Mary Jane's Garden (product listing pages)  
 * 2. 📄 Support WordPress standard pagination (/page/N/)
 * 3. 📋 Extract cannabis-specific data with WooCommerce structure
 * 4. ⚡ Follow polite crawling practices and robots.txt compliance
 * 5. 🧹 Proper memory cleanup after crawling
 */

export async function MaryJanesGardenScraper(
    siteConfig: SiteConfig,
    startPage?: number | null,
    endPage?: number | null,
    fullSiteCrawl?: boolean | null,
    sourceContext?: {
        scrapingSourceUrl: string;
        sourceName: string;
        dbMaxPage: number;
    }
): Promise<ProductsDataResultFromCrawling> {
    
    const startTime = Date.now();
    const { baseUrl } = siteConfig;
    
    if (!sourceContext) {
        throw new Error('[Mary Jane\'s Garden Scraper] sourceContext is required');
    }

    const {
        scrapingSourceUrl,
        sourceName,
        dbMaxPage
    } = sourceContext;

    // Determine scraping mode
    const isTestMode = 
        startPage !== null && 
        endPage !== null && 
        startPage !== undefined && 
        endPage !== undefined;
    
    // Calculate expected pages for progress tracking
    const expectedPages = isTestMode 
        ? (endPage! - startPage! + 1) 
        : (fullSiteCrawl ? dbMaxPage : dbMaxPage);
    
    // ✅ Initialize progress logger and memory monitor
    const progressLogger = new ProgressLogger(expectedPages, 'Mary Jane\'s Garden');
    const memoryMonitor = MemoryMonitor.fromEnv();
    
    // Log scraper initialization
    apiLogger.crawl('Initializing scraper', {
        seller: sourceName,
        mode: isTestMode ? 'test' : fullSiteCrawl ? 'full' : 'normal',
        baseUrl,
        scrapingSourceUrl,
        expectedPages
    });
    
    // Debug log
    apiLogger.debug('[Mary Jane\'s Garden] Starting with siteConfig', {
        name: siteConfig.name,
        baseUrl,
        isImplemented: siteConfig.isImplemented,
        scrapingSourceUrl,
        dbMaxPage
    });

    // ✅ Initialize products array to store scraped data
    const products: ProductCardDataFromCrawling[] = [];
    let actualPages = 0;
    let maxPages: number | null = null;
    
    // Initialize request queue (keep for deduplication & retry logic)
    const runId = Date.now();
    const queueName = `${sourceName}-${runId}`;
    const requestQueue = await RequestQueue.open(queueName);
    
    // STEP 1: Initialize polite crawler policy
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: USERAGENT,
        acceptLanguage: ACCEPTLANGUAGE
    });

    // Get headers from politeCrawler
    const headers = politeCrawler.getHeaders();

    // ✅ Parse robots.txt FIRST for polite crawling compliance
    const robotsRules = await politeCrawler.parseRobots(baseUrl);
    const { 
        crawlDelay, // Crawl delay in milliseconds
        disallowedPaths, // List of disallowed paths
        allowedPaths, // List of allowed paths
        hasExplicitCrawlDelay // Whether there is an explicit crawl delay
    } = robotsRules;

    apiLogger.info('[Mary Jane\'s Garden] Robots.txt rules loaded:', {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        disallowedCount: disallowedPaths.length,
        allowedCount: allowedPaths.length,
        userAgent: USERAGENT
    });
    
    // Log robots.txt compliance info
    apiLogger.crawl('Robots.txt parsed', {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        disallowedCount: disallowedPaths.length
    });

    // Add first page to queue
    const firstPageUrl = getScrapingUrl(scrapingSourceUrl, startPage || 1);
    await requestQueue.addRequest({
        url: firstPageUrl,
        userData: { pageNumber: startPage || 1 }
    });

    apiLogger.info(`[Mary Jane's Garden] Added first page to queue: ${firstPageUrl}`);

    // STEP 2: Request handler - Process each pagination page
    async function maryJanesGardenRequestHandler(context: CheerioCrawlingContext): Promise<void> {
        const { $, request, log } = context;
        
        const pageNumber = request.userData?.pageNumber || 1;

        // Extract products and pagination info from current page
        const result = extractProductsFromHTML(
            $, 
            siteConfig,
            dbMaxPage,
            startPage,
            endPage,
            fullSiteCrawl
        );

        // Update maxPages from first page
        if (pageNumber === 1 && result.maxPages) {
            maxPages = result.maxPages;
            
            // ✅ Update progress logger with actual total
            if (!isTestMode && maxPages) {
                (progressLogger as any).totalItems = maxPages;
            }
            
            apiLogger.info(`[Mary Jane's Garden] Detected ${maxPages} total pages from WordPress pagination`);
        }

        // ✅ Push products directly to array
        products.push(...result.products);
        actualPages++;

        // ✅ Progress-based logging (every 10%) instead of per-page
        if (progressLogger.shouldLog(actualPages)) {
            const metadata = progressLogger.getMetadata(actualPages, startTime);
            const memStatus = memoryMonitor.check();
            
            apiLogger.crawl('Scraping progress', {
                ...metadata,
                productsCollected: products.length,
                memoryStatus: memStatus.status
            });
            
            // Warn if memory approaching limit
            if (memStatus.status === 'warning') {
                apiLogger.warn(`[Mary Jane's Garden] Memory usage high: ${memStatus.usedMB.toFixed(2)}MB (${memStatus.percentUsed.toFixed(1)}%)`);
            } else if (memStatus.status === 'critical') {
                apiLogger.logError('[Mary Jane\'s Garden] CRITICAL memory usage:', new Error('Memory limit approaching'), {
                    usedMB: memStatus.usedMB,
                    percentUsed: memStatus.percentUsed
                });
            }
        }

        // Determine if we should crawl more pages
        let shouldContinue = false;

        if (isTestMode) {
            // Test mode: crawl specific range
            shouldContinue = pageNumber < endPage!;
            if (shouldContinue) {
                log.info(`[Mary Jane's Garden] Test mode: Page ${pageNumber}/${endPage}`);
            }
        } else if (maxPages && maxPages > 0) {
            // Auto/Manual mode: crawl to detected max pages
            shouldContinue = pageNumber < maxPages;
            if (shouldContinue) {
                log.info(`[Mary Jane's Garden] Auto mode: Page ${pageNumber}/${maxPages}`);
            }
        } else {
            // Fallback: stop after first page if no pagination detected
            shouldContinue = false;
            log.info(`[Mary Jane's Garden] No pagination detected, stopping after page ${pageNumber}`);
        }

        // Add next page to queue if needed
        if (shouldContinue) {
            const nextPageNumber = pageNumber + 1;
            const nextPageUrl = getScrapingUrl(scrapingSourceUrl, nextPageNumber);
            
            await requestQueue.addRequest({
                url: nextPageUrl,
                userData: { pageNumber: nextPageNumber }
            });
        }

        // Apply crawl delay
        await new Promise(resolve => setTimeout(resolve, crawlDelay));
    }

    // STEP 3: Error handling
    const maryJanesGardenErrorHandler: ErrorHandler<CheerioCrawlingContext> = async (context: CheerioCrawlingContext, error: Error): Promise<void> => {
        const { request, log } = context;

        // POLITE CRAWLING: Handle HTTP status codes properly
        const httpsError = error as any;
        if (httpsError?.response?.status) {
            const statusCode: number = httpsError.response.status;
            const shouldRetry: boolean = politeCrawler.shouldRetryOnStatus(statusCode);

            if (shouldRetry) {
                const backoffDelay: number = await politeCrawler.handleHttpStatus(statusCode, request.url);
                log.info(`[Mary Jane's Garden] HTTP ${statusCode} for ${request.url}, backing off for ${backoffDelay}ms`);

                await new Promise<void>(resolve => setTimeout(resolve, backoffDelay));
                throw error;
            } else {
                log.error(`[Mary Jane's Garden] HTTP ${statusCode} for ${request.url}, not retrying`);
                throw error;
            }
        }
    };

    // ✅ STEP 4: Calculate dynamic rate limiting based on robots.txt
    const calculatedMaxRate = hasExplicitCrawlDelay 
        ? Math.floor(60000 / crawlDelay)
        : 15; // Default 15 req/min if no explicit delay
    
    apiLogger.info('[Mary Jane\'s Garden] Dynamic rate limiting:', {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        maxRequestsPerMinute: calculatedMaxRate
    });

    // STEP 5: Create and run crawler with optimized configuration
    const crawler = new CheerioCrawler({
        requestQueue,
        requestHandler: maryJanesGardenRequestHandler,
        errorHandler: maryJanesGardenErrorHandler,
        maxConcurrency: 1, // Sequential requests for polite crawling
        maxRequestsPerMinute: calculatedMaxRate, // ✅ Dynamic rate based on robots.txt
        maxRequestRetries: 3,
        preNavigationHooks: [
            async (requestAsBrowserOptions) => {
                const headers = politeCrawler.getHeaders();
                Object.assign(requestAsBrowserOptions.headers || {}, headers);
            }
        ]
    });

    // STEP 6: Run main crawler with cleanup
    apiLogger.info(`[Mary Jane's Garden] Starting crawler to process pagination pages...`);
    
    try {
        await crawler.run();
    } finally {
        // ✅ Cleanup: Drop request queue to free up memory/storage
        try {
            await requestQueue.drop();
            apiLogger.debug(`[Mary Jane's Garden] Cleaned up request queue: ${queueName}`);
        } catch (cleanupError) {
            apiLogger.logError('[Mary Jane\'s Garden] Failed to cleanup request queue:', cleanupError as Error, {
                queueName
            });
        }
        
        // ✅ Cleanup: Teardown crawler to release connections and internal state
        try {
            await crawler.teardown();
            apiLogger.debug(`[Mary Jane's Garden] Crawler teardown completed`);
        } catch (teardownError) {
            apiLogger.logError('[Mary Jane\'s Garden] Failed to teardown crawler:', teardownError as Error);
        }
    }

    // STEP 7: Log summary and return results
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // ✅ Final progress log with completion summary
    apiLogger.crawl('Scraping completed', {
        totalProducts: products.length,
        totalPages: actualPages,
        duration: `${(duration / 1000).toFixed(2)}s`,
        avgTimePerPage: actualPages > 0 ? `${((duration / actualPages) / 1000).toFixed(2)}s` : '0s',
        finalMemory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`
    });

    apiLogger.info('[Mary Jane\'s Garden] ✅ Scraping completed successfully:', {
        scraped: products.length,
        pages: actualPages,
        duration: `${(duration / 1000).toFixed(2)}s`,
        robotsCompliance: {
            crawlDelay: `${crawlDelay}ms`,
            hasExplicitCrawlDelay,
            maxRequestsPerMinute: calculatedMaxRate
        }
    });
    
    return {
        totalProducts: products.length,
        totalPages: actualPages,
        products,
        timestamp: new Date(),
        duration
    };
}

export default MaryJanesGardenScraper;