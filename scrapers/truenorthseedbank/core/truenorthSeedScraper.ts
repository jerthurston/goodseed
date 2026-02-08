/**
 * True North Seed Bank Product List Scraper (Refactored with CommonCrawler Pattern)
 * 
 * ARCHITECTURE OVERVIEW:
 * - Uses CommonCrawler infrastructure pattern for reusability
 * - Focuses only on True North Seed Bank-specific extraction logic
 * - Uses Magento 2 standard structure (same as True North)
 * - All common functionality follows best practices
 * 
 * DIFFERENCES FROM OTHER SCRAPERS:
 * - Uses True North Seed Bank specific HTML structure
 * - Query parameter pagination format (?p=N)
 * - Magento-based product attributes extraction
 * - Larger product catalog (~1400+ products across 60+ pages)
 * 
 * OPTIMIZATION (v2):
 * - ✅ Removed Dataset (unnecessary intermediate storage)
 * - ✅ Uses simple array for product collection
 * - ✅ Keeps RequestQueue for deduplication, retry, and state management
 * - ✅ Automatic cleanup with finally block to free memory
 */

import { extractProductFromDetailHTML, extractProductUrls } from '@/scrapers/truenorthseedbank/utils/index';
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
 * TrueNorthSeedBankScraper - Site-specific implementation using CommonCrawler pattern
 * 
 * RESPONSIBILITIES:
 * 1. 🕷️ Extract products from True North Seed Bank (product listing pages)  
 * 2. 📄 Support pagination-based URL extraction
 * 3. 📋 Extract cannabis-specific data with True North structure
 * 4. ⚡ Use CommonCrawler infrastructure pattern
 */

export async function truenorthSeedScraper(
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
        throw new Error('[True North Scraper] sourceContext is required');
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
    
    // Debug log
    apiLogger.debug('[True North Scraper] Starting with siteConfig', {
        name: siteConfig.name,
        baseUrl,
        isImplemented: siteConfig.isImplemented,
        scrapingSourceUrl: sourceContext?.scrapingSourceUrl
    });

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

    apiLogger.info(`[True North] Robots.txt rules loaded:`, {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        disallowedCount: disallowedPaths.length,
        allowedCount: allowedPaths.length,
        userAgent: USERAGENT
    });

    let actualPages = 0;
    let productUrls: string[] = [];
    let urlsToProcess: string[] = [];
    
    // STEP 2: Extract product URLs from pagination pages
    try {
        apiLogger.info(`[True North] Extracting product URLs from: ${scrapingSourceUrl}`);
        
        // 🧪 TEST MODE: Only crawl 2 pagination pages for faster testing
        const maxPagesToTest = isTestMode ? 2 : undefined;
        
        // IMPORTANT: Call extractProductUrls to crawl all pagination pages and get product URLs
        productUrls = await extractProductUrls(sourceContext, maxPagesToTest, robotsRules, headers, baseUrl);
        
        apiLogger.info(`[True North] Extracted ${productUrls.length} product URLs from pagination pages`);

        // ✅ Filter URLs against robots.txt
        urlsToProcess = filterUrlsByRobotsTxt(productUrls, disallowedPaths);
        
        apiLogger.info(`[True North] Robots.txt filtering results:`, { 
            total: productUrls.length, 
            allowed: urlsToProcess.length, 
            blocked: productUrls.length - urlsToProcess.length
        });

        // ✅ TEST MODE: Limit number of products for testing
        if (isTestMode && startPage !== null && endPage !== null) {
            const limitCount = endPage - startPage + 1;
            urlsToProcess = urlsToProcess.slice(0, limitCount);
            
            apiLogger.info(`[True North] TEST MODE: Limited to ${limitCount} products (startPage: ${startPage}, endPage: ${endPage})`);
        }

        // Add filtered product URLs to queue
        for (const productUrl of urlsToProcess) {
            await requestQueue.addRequest({
                url: productUrl,
                userData: { type: 'product' }
            });
        }

        apiLogger.info(`[True North] Added ${urlsToProcess.length} product URLs to crawl queue`);

    } catch (error) {
        apiLogger.logError('[True North] Failed to extract product URLs:', error as Error, {
            scrapingSourceUrl
        });
        throw new Error(`Failed to extract product URLs: ${error}`);
    }

    // STEP 3: Request handler - Process each product detail page
    async function trueNorthRequestHandler(context: CheerioCrawlingContext): Promise<void> {
        const { $, request, log } = context;

        log.info(`[True North] Processing product: ${request.url}`);
        
        // 🐛 DEBUG: Log HTML length to diagnose extraction failures
        const htmlLength = $.html().length;
        log.info(`[True North] HTML length: ${htmlLength} characters`);
        
        // 🐛 DEBUG: Check if product name selector works
        const productNameElement = $(siteConfig.selectors.productName);
        log.info(`[True North] Product name selector found: ${productNameElement.length} elements`);
        if (productNameElement.length > 0) {
            const productNameText = productNameElement.first().text().trim();
            log.info(`[True North] Product name text: "${productNameText}"`);
        }
        
        const product = extractProductFromDetailHTML($, siteConfig, request.url);
        
        if (product) {
            // ✅ Push directly to products array instead of dataset
            products.push(product);
            
            actualPages++;
            log.info(`[True North] ✅ Extracted: ${product.name} (${actualPages}/${urlsToProcess.length})`);
        } else {
            log.error(`[True North] ⚠️ Failed to extract: ${request.url} - Check debug logs above for details`);
        }

        // Apply crawl delay
        await new Promise(resolve => setTimeout(resolve, crawlDelay));
    }

    // STEP 4: Error handling
    const trueNorthErrorHandler: ErrorHandler<CheerioCrawlingContext> = async (context: CheerioCrawlingContext, error: Error): Promise<void> => {
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
                log.info(`[True North Scraper] HTTP ${statusCode} for ${request.url}, backing off for ${backoffDelay}ms`);

                await new Promise<void>(resolve => setTimeout(resolve, backoffDelay));
                throw error;
            } else {
                log.error(`[True North Scraper] HTTP ${statusCode} for ${request.url}, not retrying`);
                throw error;
            }
        }
    };

    // ✅ STEP 5: Calculate dynamic rate limiting based on robots.txt
    const calculatedMaxRate = hasExplicitCrawlDelay 
        ? Math.floor(60000 / crawlDelay)
        : 15; // Default 15 req/min if no explicit delay
    
    apiLogger.info(`[True North] Dynamic rate limiting:`, {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        maxRequestsPerMinute: calculatedMaxRate
    });

    // STEP 6: Create and run crawler with optimized configuration
    const crawler = new CheerioCrawler({
        requestQueue,
        requestHandler: trueNorthRequestHandler,
        errorHandler: trueNorthErrorHandler,
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

    // STEP 7: Run main crawler with cleanup
    apiLogger.info(`[True North] Starting main crawler to process ${urlsToProcess.length} products...`);
    
    try {
        await crawler.run();
    } finally {
        // ✅ Cleanup: Drop request queue to free up memory/storage
        try {
            await requestQueue.drop();
            apiLogger.debug(`[True North] Cleaned up request queue: ${queueName}`);
        } catch (cleanupError) {
            apiLogger.logError('[True North] Failed to cleanup request queue:', cleanupError as Error, {
                queueName
            });
        }
    }

    // STEP 8: Log summary and return results
    const endTime = Date.now();
    const duration = endTime - startTime;

    apiLogger.info(`[True North] ✅ Scraping completed successfully:`, {
        scraped: products.length,
        saved: actualPages,
        duration: `${(duration / 1000).toFixed(2)}s`,
        robotsCompliance: {
            crawlDelay: `${crawlDelay}ms`,
            hasExplicitCrawlDelay,
            maxRequestsPerMinute: calculatedMaxRate,
            urlsFiltered: productUrls.length - urlsToProcess.length,
            urlsProcessed: urlsToProcess.length
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

export default truenorthSeedScraper;
