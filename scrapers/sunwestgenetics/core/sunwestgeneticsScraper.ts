/**
 * SunWest Genetics Product List Scraper (Refactored with Best Practices)
 * 
 * ARCHITECTURE OVERVIEW:
 * - Uses Cheerio for fast HTML parsing with standard pagination
 * - WordPress-based pagination structure (/page/N/)
 * - Parse robots.txt for polite crawling compliance
 * - Dynamic rate limiting based on robots.txt
 * 
 * OPTIMIZATION:
 * - ✅ ProgressLogger for milestone-based logging (every 10%)
 * - ✅ MemoryMonitor for tracking memory usage
 * - ✅ Robots.txt parsing and dynamic rate limiting
 * - ✅ Proper cleanup (requestQueue.drop() + crawler.teardown())
 * - ✅ Structured logging with apiLogger.crawl()
 */

import { extractProductsFromHTML } from '@/scrapers/sunwestgenetics/utils/extractProductsFromHTML';
import { ProductsDataResultFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { CheerioCrawler, RequestQueue } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';
import { ProgressLogger, MemoryMonitor } from '@/scrapers/(common)/logging-helpers';

/**
 * SunWest Genetics Product List Scraper function
 * 
 * RESPONSIBILITIES:
 * 1. 🕷️ Extract products from SunWest Genetics (pagination pages)
 * 2. 📄 Support WordPress standard pagination (/page/N/)
 * 3. 📋 Extract cannabis-specific data from product cards
 * 4. ⚡ Follow polite crawling practices and robots.txt compliance
 * 5. 🧹 Proper memory cleanup after crawling
 */
export async function sunwestgeneticsScraper(
    siteConfig: SiteConfig, 
    dbMaxPage?: number,
    startPage: number = 1,
    endPage?: number
): Promise<ProductsDataResultFromCrawling> {
    const startTime = Date.now();
    
    const { selectors, baseUrl } = siteConfig;
    
    // Determine scraping mode
    const isTestMode = endPage !== undefined && endPage !== null;

    const runId = Date.now();
    
    // ✅ Initialize products array to store scraped data
    const allProducts: ProductCardDataFromCrawling[] = [];
    
    const queueName = `sunwest-queue-${runId}`;
    const requestQueue = await RequestQueue.open(queueName);

    let actualPages = 0;

    // ✅ STEP 0: Initialize SimplePoliteCrawler and parse robots.txt FIRST
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: USERAGENT,
        acceptLanguage: ACCEPTLANGUAGE
    });

    // ✅ Parse robots.txt at initialization
    const robotsRules = await politeCrawler.parseRobots(baseUrl);
    const { crawlDelay, disallowedPaths, allowedPaths, hasExplicitCrawlDelay } = robotsRules;

    // Log robots.txt compliance info
    apiLogger.crawl('Robots.txt parsed', {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        disallowedCount: disallowedPaths.length
    });

    apiLogger.info('[SunWest Genetics] Robots.txt rules loaded', {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        disallowedPaths: disallowedPaths.length,
        allowedPaths: allowedPaths.length,
        strategy: hasExplicitCrawlDelay ? 'robots.txt enforced' : 'intelligent default'
    });

    // ✅ STEP 1: Calculate dynamic rate limiting based on robots.txt crawlDelay
    const calculatedMaxRate = hasExplicitCrawlDelay 
        ? Math.floor(60000 / crawlDelay)  // Respect robots.txt
        : 15;                              // Intelligent default

    const maxConcurrency = 1; // Sequential for same site

    apiLogger.info('[SunWest Genetics] Dynamic rate limiting:', {
        crawlDelayMs: crawlDelay,
        maxRequestsPerMinute: calculatedMaxRate,
        maxConcurrency,
        hasExplicitCrawlDelay,
        mode: isTestMode ? 'TEST' : 'AUTO'
    });

    // Determine effective end page based on mode
    const effectiveEndPage = endPage ? Math.min(endPage, dbMaxPage || 200) : (dbMaxPage || 50);
    
    // ✅ Initialize progress logger and memory monitor
    const expectedPages = effectiveEndPage - startPage + 1;
    const progressLogger = new ProgressLogger(expectedPages, 'SunWest Genetics');
    const memoryMonitor = MemoryMonitor.fromEnv();
    
    // Log scraper initialization
    apiLogger.crawl('Initializing scraper', {
        seller: 'sunwestgenetics',
        mode: isTestMode ? 'test' : 'normal',
        baseUrl,
        startPage,
        endPage: effectiveEndPage,
        expectedPages
    });

    const crawler = new CheerioCrawler({
        requestQueue,
        async requestHandler({ $, request, log }) {
            // Extract products and pagination from current page
            const extractResult = extractProductsFromHTML($, selectors, baseUrl, dbMaxPage);
            const products = extractResult.products;
            const maxPages = extractResult.maxPages;
            
            if (maxPages && actualPages === 0) {
                log.info(`[SunWest Genetics] Detected ${maxPages} total pages from pagination`);
            }

            // ✅ Push directly to allProducts array instead of dataset
            allProducts.push(...products);
            actualPages++;

            // ✅ Progress-based logging (every 10%) instead of per-page
            if (progressLogger.shouldLog(actualPages)) {
                const metadata = progressLogger.getMetadata(actualPages, startTime);
                const memStatus = memoryMonitor.check();
                
                apiLogger.crawl('Scraping progress', {
                    ...metadata,
                    productsCollected: allProducts.length,
                    memoryStatus: memStatus.status
                });
                
                // Warn if memory approaching limit
                if (memStatus.status === 'warning') {
                    apiLogger.warn(`[SunWest Genetics] Memory usage high: ${memStatus.usedMB.toFixed(2)}MB (${memStatus.percentUsed.toFixed(1)}%)`);
                } else if (memStatus.status === 'critical') {
                    apiLogger.logError('[SunWest Genetics] CRITICAL memory usage:', new Error('Memory limit approaching'), {
                        usedMB: memStatus.usedMB,
                        percentUsed: memStatus.percentUsed
                    });
                }
            }

            // ✅ POLITE CRAWLING: Apply delay from parsed robots.txt
            await new Promise(resolve => setTimeout(resolve, crawlDelay));
        },

        maxRequestsPerMinute: calculatedMaxRate, // ✅ Dynamic rate from robots.txt
        maxConcurrency: maxConcurrency,          // ✅ Sequential requests
        maxRequestRetries: 3,
        preNavigationHooks: [
            async (requestAsBrowserOptions) => {
                const headers = politeCrawler.getHeaders();
                Object.assign(requestAsBrowserOptions.headers || {}, headers);
            }
        ]
    });

    // Add all page URLs to queue BEFORE running crawler
    apiLogger.info(`[SunWest Genetics] Preparing to crawl pages ${startPage} to ${effectiveEndPage}...`);
    
    const pagesToCrawl: string[] = [];
    for (let page = startPage; page <= effectiveEndPage; page++) {
        const pageUrl = page === 1 ? 
            `${baseUrl}/shop/` : 
            `${baseUrl}/shop/page/${page}/`;
        pagesToCrawl.push(pageUrl);
    }
    
    apiLogger.info(`[SunWest Genetics] Adding ${pagesToCrawl.length} pages to queue (${startPage} to ${effectiveEndPage})`);
    
    for (const url of pagesToCrawl) {
        await requestQueue.addRequest({ url });
    }
    
    // Run crawler once with all URLs in queue
    try {
        await crawler.run();
        actualPages = pagesToCrawl.length;
    } finally {
        // ✅ Cleanup: Drop request queue to free up memory/storage
        try {
            await requestQueue.drop();
            apiLogger.debug(`[SunWest Genetics] Cleaned up request queue: ${queueName}`);
        } catch (cleanupError) {
            apiLogger.logError('[SunWest Genetics] Failed to cleanup request queue:', cleanupError as Error, {
                queueName
            });
        }
        
        // ✅ Cleanup: Teardown crawler to release connections and internal state
        try {
            await crawler.teardown();
            apiLogger.debug(`[SunWest Genetics] Crawler teardown completed`);
        } catch (teardownError) {
            apiLogger.logError('[SunWest Genetics] Failed to teardown crawler:', teardownError as Error);
        }
    }
    
    if (allProducts.length === 0) {
        apiLogger.warn(`[SunWest Genetics] No products found across ${actualPages} pages`);
    }

    const duration = Date.now() - startTime;

    // ✅ Final progress log with completion summary
    apiLogger.crawl('Scraping completed', {
        totalProducts: allProducts.length,
        totalPages: actualPages,
        duration: `${(duration / 1000).toFixed(2)}s`,
        avgTimePerPage: actualPages > 0 ? `${((duration / actualPages) / 1000).toFixed(2)}s` : '0s',
        finalMemory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`
    });

    apiLogger.info('[SunWest Genetics] ✅ Crawling completed', {
        products: allProducts.length,
        pages: actualPages,
        duration: `${(duration / 1000).toFixed(2)}s`,
        robotsCompliance: hasExplicitCrawlDelay ? 'enforced' : 'default',
        maxRate: `${calculatedMaxRate} req/min`
    });

    return {
        totalProducts: allProducts.length,
        totalPages: actualPages,
        products: allProducts,
        timestamp: new Date(),
        duration,
    };
}