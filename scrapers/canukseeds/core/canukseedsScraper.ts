/**
 * Canuk Seeds Product List Scraper (Refactored with CommonCrawler Pattern)
 * 
 * ARCHITECTURE OVERVIEW:
 * - Uses CommonCrawler infrastructure pattern for reusability
 * - Focuses only on Canuk Seeds-specific extraction logic
 * - Uses Magento/WooCommerce standard structure
 * - All common functionality follows best practices
 * 
 * DIFFERENCES FROM OTHER SCRAPERS:
 * - Uses Canuk Seeds specific HTML structure
 * - Query parameter pagination format (?p=N)
 * - Magento-based product attributes extraction
 * 
 * OPTIMIZATION (v2):
 * - ✅ Removed Dataset (unnecessary intermediate storage)
 * - ✅ Uses simple array for product collection
 * - ✅ Keeps RequestQueue for deduplication, retry, and state management
 * - ✅ Automatic cleanup with finally block to free memory
 */

import { extractProductFromDetailHTML, extractProductUrls } from '@/scrapers/canukseeds/utils/index';
import { ProductCardDataFromCrawling, ProductsDataResultFromCrawling } from '@/types/crawl.type';
import { CheerioAPI, CheerioCrawler, CheerioCrawlingContext, ErrorHandler, Log, RequestQueue } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';

/**
 * Filter URLs by robots.txt disallowed paths
 */
function filterUrlsByRobotsTxt(urls: string[], disallowedPaths: string[]): string[] {
    return urls.filter(url => {
        const urlPath = new URL(url).pathname;
        return !disallowedPaths.some(disallowedPath => urlPath.startsWith(disallowedPath));
    });
}

/**
 * CanukSeedsProductListScraper - Site-specific implementation using CommonCrawler pattern
 * 
 * RESPONSIBILITIES:
 * 1. 🕷️ Extract products from Canuk Seeds (product listing pages)  
 * 2. 📄 Support pagination-based URL extraction
 * 3. 📋 Extract cannabis-specific data with Canuk Seeds structure
 * 4. ⚡ Use CommonCrawler infrastructure pattern
 */

export async function canukSeedScraper(
    siteConfig: SiteConfig,
    startPage?: number | null,
    endPage?: number | null,
    sourceContext?: {
        scrapingSourceUrl: string;
        sourceName: string;
        dbMaxPage: number;
    }
): Promise<ProductsDataResultFromCrawling> {

    const startTime = Date.now();
    const { baseUrl } = siteConfig;

    if (!sourceContext) {
        throw new Error('[Canuk Seeds Scraper] sourceContext is required');
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

    // ✅ Initialize products array to store scraped data
    const products: ProductCardDataFromCrawling[] = [];
    
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

    apiLogger.info(`[Canuk Seeds] Robots.txt rules loaded:`, {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        disallowedCount: disallowedPaths.length,
        allowedCount: allowedPaths.length,
        userAgent: USERAGENT
    });

    let actualPages = 0;
    let productUrls: string[] = [];
    let urlsToProcess: string[] = [];
    let totalProductsToScrape = 0; // Track total for progress calculation
    let lastLoggedProgress = 0; // Track last logged progress percentage
    
    // STEP 2: Extract product URLs from pagination pages
    try {
        apiLogger.info(`[Canuk Seeds] Extracting product URLs from: ${scrapingSourceUrl}`);
        
        // 🧪 TEST MODE: Only crawl 2 pagination pages for faster testing
        const maxPagesToTest = isTestMode ? 2 : undefined;
        
        // IMPORTANT: Call extractProductUrls to crawl all pagination pages and get product URLs
        productUrls = await extractProductUrls(sourceContext, maxPagesToTest, robotsRules, headers, baseUrl);
        
        apiLogger.info(`[Canuk Seeds] Extracted ${productUrls.length} product URLs from pagination pages`);

        // ✅ Filter URLs against robots.txt
        urlsToProcess = filterUrlsByRobotsTxt(productUrls, disallowedPaths);
        
        apiLogger.info(`[Canuk Seeds] Robots.txt filtering results:`, { 
            total: productUrls.length, 
            allowed: urlsToProcess.length, 
            blocked: productUrls.length - urlsToProcess.length
        });

        // ✅ TEST MODE: Limit number of products for testing
        if (isTestMode && startPage !== null && endPage !== null) {
            const limitCount = endPage - startPage + 1;
            urlsToProcess = urlsToProcess.slice(0, limitCount);
            
            apiLogger.info(`[Canuk Seeds] TEST MODE: Limited to ${limitCount} products (startPage: ${startPage}, endPage: ${endPage})`);
        }

        // Add filtered product URLs to queue
        for (const productUrl of urlsToProcess) {
            await requestQueue.addRequest({
                url: productUrl,
                userData: { type: 'product' }
            });
        }

        apiLogger.info(`[Canuk Seeds] Added ${urlsToProcess.length} product URLs to crawl queue`);
        
        // Store total for progress tracking
        totalProductsToScrape = urlsToProcess.length;
        
        // ✅ Clear arrays immediately to free memory (we don't need them anymore)
        productUrls = [];
        urlsToProcess = [];

    } catch (error) {
        apiLogger.logError('[Canuk Seeds] Failed to extract product URLs:', error as Error, {
            scrapingSourceUrl
        });
        throw new Error(`Failed to extract product URLs: ${error}`);
    }

    // STEP 3: Request handler - Process each product detail page
    async function canukSeedsRequestHandler(context: CheerioCrawlingContext): Promise<void> {
        const { $, request, log } = context;
        
        const product = extractProductFromDetailHTML($, siteConfig, request.url);
        
        if (product) {
            // ✅ Push directly to products array instead of dataset
            products.push(product);
            
            actualPages++;
            
            // 📊 Progress tracking - Log every 10% completion
            const progressPercent = Math.floor((actualPages / totalProductsToScrape) * 100);
            const progressMilestone = Math.floor(progressPercent / 10) * 10; // Round to nearest 10%
            
            if (progressMilestone > lastLoggedProgress && progressMilestone % 10 === 0) {
                lastLoggedProgress = progressMilestone;
                apiLogger.info(`[Canuk Seeds] 📊 Progress: ${progressMilestone}% (${actualPages}/${totalProductsToScrape} products)`);
            }
        } else {
            log.error(`[Canuk Seeds] ⚠️ Failed to extract: ${request.url}`);
        }

        // Apply crawl delay
        await new Promise(resolve => setTimeout(resolve, crawlDelay));
    }

    // STEP 4: Error handling
    const canukSeedsErrorHandler: ErrorHandler<CheerioCrawlingContext> = async (context: CheerioCrawlingContext, error: Error): Promise<void> => {
        const { request, log }: {
            request: CheerioCrawlingContext['request'];
            log: Log;
        } = context;

        // POLITE CRAWLING: Handle HTTP status codes properly
        const httpsError = error as any;
        if (httpsError?.response?.status) {
            const statusCode: number = httpsError.response.status;
            const shouldRetry: boolean = politeCrawler.shouldRetryOnStatus(statusCode);

            if (shouldRetry) {
                const backoffDelay: number = await politeCrawler.handleHttpStatus(statusCode, request.url);
                log.info(`[Canuk Seeds Scraper] HTTP ${statusCode} for ${request.url}, backing off for ${backoffDelay}ms`);

                await new Promise<void>(resolve => setTimeout(resolve, backoffDelay));
                throw error;
            } else {
                log.error(`[Canuk Seeds Scraper] HTTP ${statusCode} for ${request.url}, not retrying`);
                throw error;
            }
        }
    };

    // ✅ STEP 5: Calculate dynamic rate limiting based on robots.txt
    const calculatedMaxRate = hasExplicitCrawlDelay 
        ? Math.floor(60000 / crawlDelay)
        : 15; // Default 15 req/min if no explicit delay
    
    apiLogger.info(`[Canuk Seeds] Dynamic rate limiting:`, {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        maxRequestsPerMinute: calculatedMaxRate
    });

    // STEP 6: Create and run crawler with optimized configuration
    const crawler = new CheerioCrawler({
        requestQueue,
        requestHandler: canukSeedsRequestHandler,
        errorHandler: canukSeedsErrorHandler,
        maxConcurrency: 1, // Sequential requests for polite crawling
        maxRequestsPerMinute: calculatedMaxRate, // ✅ Dynamic rate based on robots.txt
        maxRequestRetries: 3,
        navigationTimeoutSecs: 60,      // 🔧 Increased from 30s default - site needs more time
        requestHandlerTimeoutSecs: 90,  // 🔧 Increased from 60s default
        preNavigationHooks: [
            async (requestAsBrowserOptions) => {
                const headers = politeCrawler.getHeaders();
                Object.assign(requestAsBrowserOptions.headers || {}, headers);
            }
        ]
    });

    // STEP 7: Run main crawler with cleanup
    apiLogger.info(`[Canuk Seeds] 🚀 Starting crawler for ${totalProductsToScrape} products...`);
    
    try {
        await crawler.run();
    } finally {
        // ✅ Cleanup: Drop request queue to free up memory/storage
        try {
            await requestQueue.drop();
            apiLogger.debug(`[Canuk Seeds] Cleaned up request queue: ${queueName}`);
        } catch (cleanupError) {
            apiLogger.logError('[Canuk Seeds] Failed to cleanup request queue:', cleanupError as Error, {
                queueName
            });
        }
        
        // ✅ Cleanup: Teardown crawler to release connections and internal state
        try {
            await crawler.teardown();
            apiLogger.debug(`[Canuk Seeds] Crawler teardown completed`);
        } catch (teardownError) {
            apiLogger.logError('[Canuk Seeds] Failed to teardown crawler:', teardownError as Error);
        }
    }

    // STEP 8: Log summary and return results
    const endTime = Date.now();
    const duration = endTime - startTime;

    apiLogger.info(`[Canuk Seeds] ✅ Scraping completed:`, {
        totalProducts: products.length,
        successful: actualPages,
        duration: `${(duration / 1000).toFixed(2)}s`,
        avgTimePerProduct: `${(duration / actualPages / 1000).toFixed(2)}s`
    });
    
    return {
        totalProducts: products.length,
        totalPages: actualPages,
        products,
        timestamp: new Date(),
        duration
    };
}

export default canukSeedScraper;
