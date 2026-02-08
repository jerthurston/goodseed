/**
 * Sonoma Seeds Product List Scraper (Cheerio - Standard Pagination)
 * 
 * Uses Cheerio for fast HTML parsing with WooCommerce standard pagination
 */

import { extractProductsFromHTML } from '@/scrapers/sonomaseeds/utils/extractProductsFromHTML';
import { ProductsDataResultFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { CheerioCrawler, RequestQueue } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';

/**
 * ProductListScraper for Sonoma Seeds
 * 
 * Nhiệm vụ chính:
 * 1. Crawl danh sách sản phẩm từ Sonoma Seeds (product listing pages)
 * 2. Hỗ trợ chế độ:
 *    - Auto mode: Crawl tự động đến hết trang (maxPages = 0)
 * 
 * 3. Extract thông tin từ product cards:
 *    - Tên sản phẩm, URL, slug
 *    - Hình ảnh (xử lý lazy loading)
 *    - Strain type (Indica, Sativa, Hybrid)
 *    - Rating và review count
 *    - THC/CBD levels (min/max)
 *    - Flowering time, growing level
 *    - Pack sizes and pricing
 * 
 * 4. Sử dụng CheerioCrawler (nhanh, không cần Playwright):
 *    - Phù hợp với WooCommerce standard pagination
 *    - Không có JavaScript dynamic content
 * 
 * 5. Trả về CategoryScrapeResult:
 *    - Danh sách products[]
 *    - Metadata (totalProducts, totalPages, duration)
 * 
 * Lưu ý:
 * - Không lưu database, chỉ crawl và return data
 * - Để lưu DB, dùng SonomaSeedsDbService
 * - Để crawl theo batch, dùng scrape-batch.ts script
 * 
 * SonomaSeedsProductListScraper
    │
    ├─> Fetch page 1, 2, 3... (CheerioCrawler)
    │
    └─> Mỗi page gọi extractProductsFromHTML($)
            │
            └─> Parse HTML → return products[]
 */

/**
 * Scrape product listing with pagination support
 * 
 * @param siteConfig - Site configuration containing baseUrl and selectors
 * @param startPage - Optional start page for range scraping (test mode)
 * @param endPage - Optional end page for range scraping (test mode)
 * @param fullSiteCrawl - Optional flag for full site crawl (auto mode)
 * @param sourceContext - Optional source context for scraping
 */
export async function sonomaSeedsProductListScraper(
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
    const {baseUrl, selectors} = siteConfig

    const startTime = Date.now();

    // Determine scraping mode
    const isTestMode = startPage !== null && endPage !== null && startPage !== undefined && endPage !== undefined;
    const dbMaxPage = sourceContext?.dbMaxPage || 200; // Default max pages

    apiLogger.info('[Sonoma Seeds] 🚀 Starting scraper', {
        mode: isTestMode ? 'TEST' : 'AUTO',
        startPage: startPage || 'N/A',
        endPage: endPage || 'N/A',
        dbMaxPage,
        fullSiteCrawl: fullSiteCrawl || false
    });

    const runId = Date.now();
    
    // ✅ Initialize products array to store scraped data
    const allProducts: ProductCardDataFromCrawling[] = [];
    
    const queueName = `sonoma-queue-${runId}`;
    const requestQueue = await RequestQueue.open(queueName);

    // ✅ STEP 0: Initialize polite crawler 
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: USERAGENT,
        acceptLanguage: ACCEPTLANGUAGE,
    });
    //and parse robots.txt
    const robotsRules = await politeCrawler.parseRobots(baseUrl);
    const { crawlDelay, disallowedPaths, allowedPaths, hasExplicitCrawlDelay } = robotsRules;

    // Log robots.txt rules
    apiLogger.info('[Sonoma Seeds] 🤖 Robots.txt compliance', {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        disallowedPaths: disallowedPaths.length,
        allowedPaths: allowedPaths.length,
        strategy: hasExplicitCrawlDelay ? 'robots.txt enforced' : 'intelligent default'
    });

    let actualPages = 0;
    const emptyPages = new Set<string>();

    // ✅ Calculate optimal maxRequestsPerMinute based on robots.txt crawlDelay
    const calculatedMaxRate = hasExplicitCrawlDelay 
        ? Math.floor(60000 / crawlDelay)  // Respect robots.txt
        : 15;                              // Intelligent default

    const maxConcurrency = 1; // Sequential for same site

    apiLogger.info('[Sonoma Seeds] ⚙️ Crawler configuration', {
        crawlDelayMs: crawlDelay,
        maxRequestsPerMinute: calculatedMaxRate,
        maxConcurrency,
        hasExplicitCrawlDelay,
        mode: isTestMode ? 'TEST' : 'AUTO'
    });

    const crawler = new CheerioCrawler({
        requestQueue,
        async requestHandler({ $, request, log }) {
            log.info(`[Sonoma Seeds] 📄 Processing: ${request.url}`);

            // Extract products and pagination from current page
            const extractResult = extractProductsFromHTML($,selectors,baseUrl,dbMaxPage);
            const products = extractResult.products;
            const maxPages = extractResult.maxPages;
            
            log.info(`[Sonoma Seeds] Extracted ${products.length} products`);
            if (maxPages) {
                log.debug(`[Sonoma Seeds] Detected ${maxPages} total pages from pagination`);
            }

            // Track empty pages
            if (products.length === 0) {
                emptyPages.add(request.url);
            }

            // Check if there's a next page
            const hasNextPage = $(selectors.nextPage).length > 0;

            // ✅ Push directly to allProducts array instead of dataset
            allProducts.push(...products);
            
            log.debug(`[Sonoma Seeds] Progress: ${allProducts.length} total products collected`);

            // ✅ POLITE CRAWLING: Apply delay from parsed robots.txt
            log.debug(`[Sonoma Seeds] ⏱️ Applying crawl delay: ${crawlDelay}ms (${hasExplicitCrawlDelay ? 'robots.txt' : 'default'})`);
            await new Promise(resolve => setTimeout(resolve, crawlDelay));
        },

        maxRequestsPerMinute: calculatedMaxRate, // ✅ Use calculated rate from robots.txt
        maxConcurrency: maxConcurrency, // ✅ Use calculated value
        maxRequestRetries: 3,
    });

    // Auto-crawl mode: Start với page 1 để detect maxPages, sau đó crawl remaining pages
    if (isTestMode) {
        apiLogger.info(`[Sonoma Seeds] 🧪 TEST MODE: Crawling pages ${startPage} to ${endPage}`);
        
        // Test mode: Crawl specific page range
        const testUrls: string[] = [];
        for (let page = startPage!; page <= endPage!; page++) {
            const url = page === 1 
                ? `${baseUrl}/shop/` 
                : `${baseUrl}/shop/page/${page}/`;
            testUrls.push(url);
        }
        
        apiLogger.info(`[Sonoma Seeds] 📋 Adding ${testUrls.length} URLs to queue`);
        for (const url of testUrls) {
            await requestQueue.addRequest({ url });
        }
        
        apiLogger.info('[Sonoma Seeds] 🕷️ Starting crawler...');
        await crawler.run();
        actualPages = endPage! - startPage! + 1;
        
    } else {
        // AUTO MODE: Detect pagination and crawl all pages
        apiLogger.info('[Sonoma Seeds] 🚀 AUTO MODE: Starting with page 1 to detect pagination...');
        
        // First, crawl page 1 to detect maxPages from pagination  
        const firstPageUrl = `${baseUrl}/shop/`; // Sonoma Seeds main shop page
        await requestQueue.addRequest({ url: firstPageUrl });
        
        try {
            await crawler.run();
        } finally {
            // ✅ Cleanup: Drop request queue to free up memory/storage
            try {
                await requestQueue.drop();
                apiLogger.debug(`[Sonoma Seeds] Cleaned up request queue: ${queueName}`);
            } catch (cleanupError) {
                apiLogger.logError('[Sonoma Seeds] Failed to cleanup request queue:', cleanupError as Error, {
                    queueName
                });
            }
        }
        
        // Check collected products from allProducts array
        let detectedMaxPages = 1; // default fallback
        
        if (allProducts.length > 0) {
            apiLogger.info(`[Sonoma Seeds] Found ${allProducts.length} products on page 1`);
            
            // Try to detect pagination from extractProductsFromHTML
            // For simplified version, use dbMaxPage
            detectedMaxPages = dbMaxPage || 50;
            apiLogger.info(`[Sonoma Seeds] Will crawl up to ${detectedMaxPages} pages`);
            
            // Now crawl remaining pages (2 to maxPages) if more than 1 page
            if (detectedMaxPages > 1) {
                const remainingUrls: string[] = [];
                // Limit to dbMaxPage for safety
                const pagesToCrawl = Math.min(detectedMaxPages, dbMaxPage);
                for (let page = 2; page <= pagesToCrawl; page++) {
                    // Sonoma Seeds WooCommerce standard format: /shop/page/2/
                    remainingUrls.push(`${baseUrl}/shop/page/${page}/`);
                }
                
                if (remainingUrls.length > 0) {
                    apiLogger.info(`[Sonoma Seeds] 🕷️ Crawling remaining ${remainingUrls.length} pages...`);
                    for (const url of remainingUrls) {
                        await requestQueue.addRequest({ url });
                    }
                    await crawler.run();
                }
            }
            // Set actual pages based on what we actually plan to crawl
            actualPages = Math.min(detectedMaxPages, dbMaxPage);
        } else {
            apiLogger.warn('[Sonoma Seeds] ⚠️ No products found on page 1, using fallback');
        }
    }

    const duration = Date.now() - startTime;

    // ✅ Aggregated final summary
    apiLogger.info('[Sonoma Seeds] ✅ Crawling completed', {
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