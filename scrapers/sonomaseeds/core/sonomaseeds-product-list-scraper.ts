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
import { ProgressLogger, MemoryMonitor } from '@/scrapers/(common)/logging-helpers';

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
    let detectedMaxPagesFromFirstPage: number | null = null; // ✅ Track detected maxPages from page 1
    let totalPagesEstimate = dbMaxPage; // Initial estimate for ProgressLogger
    let pagesProcessed = 0; // Track pages processed for progress logging

    // ✅ Initialize MemoryMonitor from environment
    const memoryMonitor = MemoryMonitor.fromEnv();
    const memoryConfig = memoryMonitor.getConfig();
    
    apiLogger.info('[Sonoma Seeds] 💾 Memory configuration', {
        limitMB: memoryConfig.limitMB,
        warningMB: Math.round(memoryConfig.warningMB),
        criticalMB: Math.round(memoryConfig.criticalMB)
    });

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
            pagesProcessed++;
            
            // Extract products and pagination from current page
            const extractResult = extractProductsFromHTML($,selectors,baseUrl,dbMaxPage);
            const products = extractResult.products;
            const maxPages = extractResult.maxPages;
            
            // ✅ Save detected maxPages from first page for AUTO mode
            if (maxPages && !detectedMaxPagesFromFirstPage && request.url.includes('/shop/') && !request.url.includes('/page/')) {
                detectedMaxPagesFromFirstPage = maxPages;
                totalPagesEstimate = maxPages; // Update estimate for ProgressLogger
                apiLogger.info(`[Sonoma Seeds] 📊 Detected ${maxPages} total pages from pagination`);
            }

            // Track empty pages
            if (products.length === 0) {
                emptyPages.add(request.url);
            }

            // ✅ Push products to collection
            allProducts.push(...products);
            
            // ✅ Progress logging at milestones (10%, 20%, etc.) - only for AUTO mode with multiple pages
            if (!isTestMode && totalPagesEstimate > 1) {
                const progressLogger = new ProgressLogger(totalPagesEstimate, 'Sonoma Seeds');
                if (progressLogger.shouldLog(pagesProcessed)) {
                    const memoryCheck = memoryMonitor.check();
                    apiLogger.crawl('[Sonoma Seeds] 📈 Progress Update', {
                        progress: `${progressLogger.getProgress(pagesProcessed)}%`,
                        pagesProcessed,
                        totalPages: totalPagesEstimate,
                        productsCollected: allProducts.length,
                        memoryUsed: `${memoryCheck.usedMB.toFixed(0)}MB`,
                        memoryStatus: memoryCheck.status
                    });
                }
            }

            // ✅ POLITE CRAWLING: Apply delay from parsed robots.txt
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
        
        totalPagesEstimate = testUrls.length;
        await requestQueue.addRequest({ url: testUrls[0] });
        
        apiLogger.crawl('[Sonoma Seeds] �️ Starting TEST crawl...');
        await crawler.run();
        
        // Add remaining pages
        for (let i = 1; i < testUrls.length; i++) {
            await requestQueue.addRequest({ url: testUrls[i] });
        }
        if (testUrls.length > 1) {
            await crawler.run();
        }
        
        actualPages = endPage! - startPage! + 1;
        
    } else {
        // AUTO MODE: Detect pagination and crawl all pages
        apiLogger.crawl('[Sonoma Seeds] 🚀 AUTO MODE: Detecting pagination from page 1...');
        
        // First, crawl page 1 to detect maxPages from pagination  
        const firstPageUrl = `${baseUrl}/shop/`; // Sonoma Seeds main shop page
        await requestQueue.addRequest({ url: firstPageUrl });
        await crawler.run();
        
        // Check collected products from allProducts array
        let detectedMaxPages = 1; // default fallback
        
        if (allProducts.length > 0) {
            // ✅ Use detected maxPages from first page crawl (from extractProductsFromHTML)
            detectedMaxPages = detectedMaxPagesFromFirstPage || dbMaxPage || 50;
            
            if (detectedMaxPagesFromFirstPage) {
                apiLogger.crawl(`[Sonoma Seeds] ✅ Detected ${detectedMaxPagesFromFirstPage} pages, collected ${allProducts.length} products from page 1`);
            } else {
                apiLogger.warn(`[Sonoma Seeds] ⚠️ Pagination not detected, using fallback: ${detectedMaxPages} pages`);
            }
            
            // Now crawl remaining pages (2 to maxPages) if more than 1 page
            if (detectedMaxPages > 1) {
                const pagesToCrawl = Math.min(detectedMaxPages, dbMaxPage);
                totalPagesEstimate = pagesToCrawl; // Update for ProgressLogger
                
                apiLogger.crawl(`[Sonoma Seeds] 🕷️ Crawling remaining ${pagesToCrawl - 1} pages (2-${pagesToCrawl})...`);
                
                for (let page = 2; page <= pagesToCrawl; page++) {
                    await requestQueue.addRequest({ url: `${baseUrl}/shop/page/${page}/` });
                }
                await crawler.run();
            }
            
            // ✅ Set actual pages based on detected value (not dbMaxPage limit)
            actualPages = detectedMaxPages; // Use the detected or fallback value we determined
        } else {
            apiLogger.warn('[Sonoma Seeds] ⚠️ No products found on page 1');
        }
    }
    
    // ✅ Cleanup: Drop request queue AFTER all crawling is done
    try {
        await requestQueue.drop();
    } catch (cleanupError) {
        apiLogger.logError('[Sonoma Seeds] Queue cleanup failed:', cleanupError as Error, { queueName });
    }

    const duration = Date.now() - startTime;
    const finalMemory = memoryMonitor.check();

    // ✅ Final summary with memory stats
    apiLogger.crawl('[Sonoma Seeds] ✅ Crawling completed', {
        '📊 Products': allProducts.length,
        '📄 Pages': actualPages,
        '⏱️ Duration': `${(duration / 1000).toFixed(2)}s`,
        '💾 Memory': `${finalMemory.usedMB.toFixed(0)}MB (${finalMemory.percentUsed.toFixed(1)}%)`,
        '🤖 Robots.txt': hasExplicitCrawlDelay ? 'enforced' : 'default',
        '🚀 Rate': `${calculatedMaxRate} req/min`,
        ...(emptyPages.size > 0 && { '⚠️ Empty pages': emptyPages.size })
    });

    return {
        totalProducts: allProducts.length,
        totalPages: actualPages,
        products: allProducts,
        timestamp: new Date(),
        duration,
    };
}