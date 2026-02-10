/**
 * Rocket Seeds Product List Scraper (Refactored with Best Practices)
 * 
 * ARCHITECTURE OVERVIEW:
 * - Sitemap-based scraper with pagination crawling
 * - Uses icon-based extraction from specification_individual blocks
 * - Icon-based field targeting for cannabis data
 * - pvtfw_variant_table_block for pricing extraction
 * 
 * OPTIMIZATION:
 * - ✅ ProgressLogger for milestone-based logging (every 10%)
 * - ✅ MemoryMonitor for tracking memory usage
 * - ✅ Robots.txt parsing and dynamic rate limiting
 * - ✅ Proper cleanup (requestQueue.drop() + crawler.teardown())
 * - ✅ Structured logging with apiLogger.crawl()
 * - ✅ Removed Dataset (unnecessary intermediate storage)
 * - ✅ Uses simple array for product collection
 * - ✅ Keeps RequestQueue for deduplication, retry, and state management
 */

import { extractProductFromDetailHTML, extractProductUrls } from '@/scrapers/rocketseeds/utils/index';
import { ProductCardDataFromCrawling, ProductsDataResultFromCrawling } from '@/types/crawl.type';
import { CheerioAPI, CheerioCrawler, CheerioCrawlingContext, ErrorHandler, Log, RequestQueue } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';
import { ProgressLogger, MemoryMonitor } from '@/scrapers/(common)/logging-helpers';

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
 * RocketSeedsProductListScraper - Site-specific implementation with best practices
 * 
 * RESPONSIBILITIES:
 * 1. 🕷️ Extract products from Rocket Seeds (product listing pages)  
 * 2. 📄 Support sitemap-based URL extraction with pagination
 * 3. 📋 Extract cannabis-specific data with specification_individual structure
 * 4. ⚡ Follow polite crawling practices and robots.txt compliance
 * 5. 🧹 Proper memory cleanup after crawling
 */

export async function RocketSeedsScraper(
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
        throw new Error('[Rocket Seeds Scraper] sourceContext is required');
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

    // Get Header from politeCrawler
    const headers = politeCrawler.getHeaders();

    // ✅ Parse robots.txt FIRST for polite crawling compliance
    const robotsRules = await politeCrawler.parseRobots(baseUrl);
    const { 
        crawlDelay, // Crawl delay in milliseconds
        disallowedPaths, // List of disallowed paths
        allowedPaths, // List of allowed paths
        hasExplicitCrawlDelay // Whether there is an explicit crawl delay
    } = robotsRules;

    // Log robots.txt compliance info
    apiLogger.crawl('Robots.txt parsed', {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        disallowedCount: disallowedPaths.length
    });

    apiLogger.info(`[Rocket Seeds] Robots.txt rules loaded:`, {
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
        apiLogger.info(`[Rocket Seeds] Extracting product URLs from: ${scrapingSourceUrl}`);
        
        // 🧪 TEST MODE: Only crawl 2 pagination pages for faster testing
        const maxPagesToTest = isTestMode ? 2 : undefined;
        
        // IMPORTANT: Call extractProductUrls to crawl all pagination pages and get product URLs
        productUrls = await extractProductUrls(sourceContext, maxPagesToTest, robotsRules, headers, baseUrl);
        
        apiLogger.info(`[Rocket Seeds] Extracted ${productUrls.length} product URLs from pagination pages`);

        // ✅ Filter URLs against robots.txt
        urlsToProcess = filterUrlsByRobotsTxt(productUrls, disallowedPaths);
        
        apiLogger.info(`[Rocket Seeds] Robots.txt filtering results:`, { 
            total: productUrls.length, 
            allowed: urlsToProcess.length, 
            blocked: productUrls.length - urlsToProcess.length
        });

        // ✅ TEST MODE: Limit number of products for testing
        if (isTestMode && startPage !== null && endPage !== null) {
            const limitCount = endPage - startPage + 1;
            urlsToProcess = urlsToProcess.slice(0, limitCount);
            
            apiLogger.info(`[Rocket Seeds] TEST MODE: Limited to ${limitCount} products (startPage: ${startPage}, endPage: ${endPage})`);
        }

        // ✅ Initialize progress logger and memory monitor after knowing total URLs
        const expectedPages = urlsToProcess.length;
        const progressLogger = new ProgressLogger(expectedPages, 'Rocket Seeds');
        const memoryMonitor = MemoryMonitor.fromEnv();
        
        // Log scraper initialization
        apiLogger.crawl('Initializing scraper', {
            seller: sourceName,
            mode: isTestMode ? 'test' : 'normal',
            baseUrl,
            scrapingSourceUrl,
            expectedPages,
            urlsFiltered: productUrls.length - urlsToProcess.length
        });

        // Add filtered product URLs to queue
        for (const productUrl of urlsToProcess) {
            await requestQueue.addRequest({
                url: productUrl,
                userData: { type: 'product' }
            });
        }

        apiLogger.info(`[Rocket Seeds] Added ${urlsToProcess.length} product URLs to crawl queue`);

        // STEP 3: Request handler with milestone logging
        async function rocketSeedsRequestHandler(context: CheerioCrawlingContext): Promise<void> {
            const { $, request, log } = context;
            
            const product = extractProductFromDetailHTML($, siteConfig, request.url);
            
            if (product) {
                // ✅ Push directly to products array instead of dataset
                products.push(product);
                
                actualPages++;

                // ✅ Progress-based logging (every 10%) instead of per-request
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
                        apiLogger.warn(`[Rocket Seeds] Memory usage high: ${memStatus.usedMB.toFixed(2)}MB (${memStatus.percentUsed.toFixed(1)}%)`);
                    } else if (memStatus.status === 'critical') {
                        apiLogger.logError('[Rocket Seeds] CRITICAL memory usage:', new Error('Memory limit approaching'), {
                            usedMB: memStatus.usedMB,
                            percentUsed: memStatus.percentUsed
                        });
                    }
                }
            } else {
                log.error(`[Rocket Seeds] ⚠️ Failed to extract: ${request.url}`);
            }

            // Apply crawl delay
            await new Promise(resolve => setTimeout(resolve, crawlDelay));
        }

        // STEP 4: Error handling
        const rocketSeedsErrorHandler: ErrorHandler<CheerioCrawlingContext> = async (context: CheerioCrawlingContext, error: Error): Promise<void> => {
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
                    log.info(`[Rocket Seeds Scraper] HTTP ${statusCode} for ${request.url}, backing off for ${backoffDelay}ms`);

                    await new Promise<void>(resolve => setTimeout(resolve, backoffDelay));
                    throw error;
                } else {
                    log.error(`[Rocket Seeds Scraper] HTTP ${statusCode} for ${request.url}, not retrying`);
                    throw error;
                }
            }
        };

        // ✅ STEP 5: Calculate dynamic rate limiting based on robots.txt
        const calculatedMaxRate = hasExplicitCrawlDelay 
            ? Math.floor(60000 / crawlDelay)
            : 15; // Default 15 req/min if no explicit delay
        
        apiLogger.info(`[Rocket Seeds] Dynamic rate limiting:`, {
            crawlDelay: `${crawlDelay}ms`,
            hasExplicitCrawlDelay,
            maxRequestsPerMinute: calculatedMaxRate
        });

        // STEP 6: Create and run crawler with optimized configuration
        const crawler = new CheerioCrawler({
            requestQueue,
            requestHandler: rocketSeedsRequestHandler,
            errorHandler: rocketSeedsErrorHandler,
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
        apiLogger.info(`[Rocket Seeds] Starting main crawler to process ${urlsToProcess.length} products...`);
        
        try {
            await crawler.run();
        } finally {
            // ✅ Cleanup: Drop request queue to free up memory/storage
            try {
                await requestQueue.drop();
                apiLogger.debug(`[Rocket Seeds] Cleaned up request queue: ${queueName}`);
            } catch (cleanupError) {
                apiLogger.logError('[Rocket Seeds] Failed to cleanup request queue:', cleanupError as Error, {
                    queueName
                });
            }
            
            // ✅ Cleanup: Teardown crawler to release connections and internal state
            try {
                await crawler.teardown();
                apiLogger.debug(`[Rocket Seeds] Crawler teardown completed`);
            } catch (teardownError) {
                apiLogger.logError('[Rocket Seeds] Failed to teardown crawler:', teardownError as Error);
            }
        }

        // STEP 8: Log summary and return results
        const endTime = Date.now();
        const duration = endTime - startTime;

        // ✅ Final progress log with completion summary
        apiLogger.crawl('Scraping completed', {
            totalProducts: products.length,
            totalPages: actualPages,
            duration: `${(duration / 1000).toFixed(2)}s`,
            avgTimePerProduct: actualPages > 0 ? `${((duration / actualPages) / 1000).toFixed(2)}s` : '0s',
            finalMemory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`
        });

        apiLogger.info(`[Rocket Seeds] ✅ Scraping completed successfully:`, {
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

    } catch (error) {
        apiLogger.logError('[Rocket Seeds] Failed to extract product URLs:', error as Error, {
            scrapingSourceUrl
        });
        throw new Error(`Failed to extract product URLs: ${error}`);
    }
    
    return {
        totalProducts: products.length,
        totalPages: actualPages,
        products,
        timestamp: new Date(),
        duration: Date.now() - startTime
    };
}

export default RocketSeedsScraper;