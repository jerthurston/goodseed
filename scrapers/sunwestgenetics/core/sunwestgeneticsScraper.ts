/**
 * SunWest Genetics Product List Scraper (Cheerio - Standard Pagination)
 * 
 * Uses Cheerio for fast HTML parsing with standard pagination
 * Adapted from Vancouver Seed Bank scraper
 */

import { extractProductsFromHTML } from '@/scrapers/sunwestgenetics/utils/extractProductsFromHTML';
import { ProductsDataResultFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { CheerioCrawler, RequestQueue } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';

/**
 * SunWestGeneticsProductListScraper
 * SunWestGeneticsProductListScraper
    │
    ├─> Fetch page 1, 2, 3... (CheerioCrawler)
    │
    └─> Mỗi page gọi extractProductsFromHTML($)
            │
            └─> Parse HTML sections → extract text patterns → return products[]
 */

/**
 * SunWest Genetics Product List Scraper function
 * 
 * Follows the same pattern as Vancouver Seed Bank scraper:
 * - Takes SiteConfig as parameter
 * - Auto-detects total pages from first page crawl
 * - Returns ProductsDataResultFromCrawling
 */
export async function sunwestgeneticsScraper(
    siteConfig: SiteConfig, 
    dbMaxPage?: number,
    startPage: number = 1,
    endPage?: number
): Promise<ProductsDataResultFromCrawling> {
    const startTime = Date.now();
    
    const { selectors, baseUrl } = siteConfig;
    // Debug log để kiểm tra siteConfig
    apiLogger.info('[SunWest Product List] Starting with siteConfig', {
        name: siteConfig.name,
        baseUrl: siteConfig.baseUrl,
        isImplemented: siteConfig.isImplemented,
        startPage,
        endPage
    });

    const runId = Date.now();
    
    // ✅ Initialize products array to store scraped data
    const allProducts: ProductCardDataFromCrawling[] = [];
    
    const queueName = `sunwest-queue-${runId}`;
    const requestQueue = await RequestQueue.open(queueName);

    let actualPages = 0;
    const emptyPages = new Set<string>();

    // ✅ STEP 0: Initialize SimplePoliteCrawler and parse robots.txt FIRST
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: USERAGENT,
        acceptLanguage: ACCEPTLANGUAGE
    });

    // ✅ Parse robots.txt at initialization
    const robotsRules = await politeCrawler.parseRobots(baseUrl);
    const { crawlDelay, disallowedPaths, allowedPaths, hasExplicitCrawlDelay } = robotsRules;

    apiLogger.info('[SunWest Product List] 🤖 Robots.txt compliance', {
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

    apiLogger.info('[SunWest Product List] ⚙️ Crawler configuration', {
        crawlDelayMs: crawlDelay,
        maxRequestsPerMinute: calculatedMaxRate,
        maxConcurrency,
        hasExplicitCrawlDelay,
        mode: endPage ? 'TEST' : 'AUTO'
    });


    const crawler = new CheerioCrawler({
        requestQueue,
        async requestHandler({ $, request, log }) {
            log.info(`[SunWest Product List] Scraping: ${request.url}`);

            // Extract products and pagination from current page
            const extractResult = extractProductsFromHTML($, selectors, baseUrl, dbMaxPage);
            const products = extractResult.products;
            const maxPages = extractResult.maxPages;
            
            log.info(`[SunWest Product List] Extracted ${products.length} products`);
            if (maxPages) {
                log.info(`[SunWest Product List] Detected ${maxPages} total pages from pagination`);
            }

            // Track empty pages
            if (products.length === 0) {
                emptyPages.add(request.url);
            }

            // Check if there's a next page
            const hasNextPage = $(selectors.nextPage).length > 0;
            log.info(`[SunWest Product List] Has next page: ${hasNextPage}`);

            // ✅ Push directly to allProducts array instead of dataset
            allProducts.push(...products);
            
            log.info(`[SunWest Product List] Progress: ${allProducts.length} total products collected`);

            // ✅ POLITE CRAWLING: Apply delay from parsed robots.txt
            log.debug(`[SunWest Product List] ⏱️ Applying crawl delay: ${crawlDelay}ms (${hasExplicitCrawlDelay ? 'robots.txt' : 'default'})`);
            await new Promise(resolve => setTimeout(resolve, crawlDelay));
        },

        maxRequestsPerMinute: calculatedMaxRate, // ✅ Dynamic rate from robots.txt
        maxConcurrency: maxConcurrency,          // ✅ Sequential requests
        maxRequestRetries: 3,
    });

    // Auto-crawl mode: Detect pagination first, then add all URLs before running crawler
    apiLogger.info(`[SunWest Product List] Preparing to crawl pages ${startPage} to ${endPage || dbMaxPage || 50}...`);
    
    // Determine effective end page based on mode
    const effectiveEndPage = endPage ? Math.min(endPage, dbMaxPage || 200) : (dbMaxPage || 50);
    
    // Add all page URLs to queue BEFORE running crawler
    const pagesToCrawl: string[] = [];
    for (let page = startPage; page <= effectiveEndPage; page++) {
        const pageUrl = page === 1 ? 
            `${baseUrl}/shop/` : 
            `${baseUrl}/shop/page/${page}/`;
        pagesToCrawl.push(pageUrl);
    }
    
    apiLogger.info(`[SunWest Product List] Adding ${pagesToCrawl.length} pages to queue (${startPage} to ${effectiveEndPage})`);
    
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
            apiLogger.debug(`[SunWest Product List] Cleaned up request queue: ${queueName}`);
        } catch (cleanupError) {
            apiLogger.logError('[SunWest Product List] Failed to cleanup request queue:', cleanupError as Error, {
                queueName
            });
        }
    }
    
    if (allProducts.length === 0) {
        apiLogger.warn(`[SunWest Product List] No products found across ${actualPages} pages`);
    }

    const duration = Date.now() - startTime;

    // ✅ Aggregated logging
    apiLogger.info('[SunWest Product List] ✅ Crawling completed', {
        '📊 Products': allProducts.length,
        '📄 Pages': actualPages,
        '⏱️ Duration': `${(duration / 1000).toFixed(2)}s`,
        '🤖 Robots.txt': hasExplicitCrawlDelay ? 'enforced' : 'default',
        '🚀 Rate': `${calculatedMaxRate} req/min`
    });

    return {
        totalProducts: allProducts.length,
        totalPages: actualPages,
        products: allProducts,
        timestamp: new Date(),
        duration,
    };
}