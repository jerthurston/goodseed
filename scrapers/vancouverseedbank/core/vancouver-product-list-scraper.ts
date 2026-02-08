/**
 * Vancouver Seed Bank Product List Scraper (Cheerio - Standard Pagination)
 * 
 * KIẾN TRÚC TỔNG QUAN:
 * - Uses Cheerio for fast HTML parsing với WooCommerce standard pagination
 * - Design Pattern: Function-based scraper với delegation pattern
 * - Performance: Cheerio nhanh hơn 10-20x so với P    // Step 1: Crawl first page to detect total pages
    await requestQueue.addRequest({ url: firstPageUrl });
    await crawler.run();

    // Check first page result from allProducts array
    let detectedMaxPages = 1; // default fallback

    if (allProducts.length > 0) {
        apiLogger.info(`[Product List] Found ${allProducts.length} products on page 1`);

        // Try to detect pagination from extractProductsFromHTML
        // Note: detectedMaxPages should be returned from extractProductsFromHTML if needed
        // For now, we'll use a simple heuristic
        detectedMaxPages = maxPages || 100; // Use provided maxPages or default safety limit
        apiLogger.info(`[Product List] Will crawl up to ${detectedMaxPages} total pages`);r automation
 * - Rate Limiting: Tuân thủ 2-5 giây delay giữa requests theo project requirement
 */

import { extractProductsFromHTML } from '@/scrapers/vancouverseedbank/utils/extractProductsFromHTML';
import { ProductsDataResultFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { CheerioAPI, CheerioCrawler, CheerioCrawlingContext, ErrorHandler, Log, RequestQueue, RobotsTxtFile } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';

import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';

/**
 * ProductListScraper - LUỒNG XỬ LÝ CHÍNH
 * 
 * NHIỆM VỤ CHÍNH:
 * 1. 🕷️ Crawl danh sách sản phẩm từ Vancouver Seed Bank (product listing pages)
 * 2. 📄 Hỗ trợ chế độ:
 *    - Auto mode: Crawl tự động đến hết trang (maxPages = 0)
 *    - Limited mode: Crawl với giới hạn dbMaxPage parameter
 * 
 * 3. 📋 Extract thông tin từ product cards:
 *    - Tên sản phẩm, URL, slug
 *    - Hình ảnh (xử lý lazy loading với data-src fallback)
 *    - Strain type (Indica, Sativa, Hybrid)
 *    - Rating và review count
 *    - THC/CBD levels (min/max parsing)
 *    - Flowering time, growing level
 * 
 * 4. ⚡ Sử dụng CheerioCrawler (nhanh, không cần Playwright):
 *    - Phù hợp với WooCommerce standard pagination (không có JS dynamic content)
 *    - Không cần browser rendering → tiết kiệm resources
 *    - Sequential crawling với rate limiting
 * 
 * 5. 📤 Trả về ProductsDataResultFromCrawling:
 *    - Danh sách products[] với full metadata
 *    - Pagination info (totalProducts, totalPages, duration)
 *    - Performance metrics cho monitoring
 * 
 * SEPARATION OF CONCERNS:
 * - Scraper này KHÔNG lưu database, chỉ crawl và return data
 * - Để lưu DB: dùng VancouverSeedBankDbService
 * - Để crawl theo batch: dùng scrape-batch.ts script
 * 
 * LUỒNG DỮ LIỆU:
 * VancouverSeedBankProductListScraper
    │
    ├─> 🌐 Fetch page 1, 2, 3... (CheerioCrawler với rate limiting)
    │
    └─> 📄 Mỗi page gọi extractProductsFromHTML($) 
            │
            └─> 🔍 Parse HTML → return products[] với full metadata

    /**
     * MAIN SCRAPER FUNCTION - Entry point cho Vancouver Seed Bank scraping
     * 
     * PARAMETERS EXPLAINED:
     * @param siteConfig - Factory pattern config chứa baseUrl, selectors, implementation status
     * @param dbMaxPage - GIỚI HẠN PAGES: undefined = unlimited, number = max pages to crawl
     * @param startPage - Start từ page nào (currently not implemented - future enhancement)
     * @param endPage - End ở page nào (currently not implemented - future enhancement) 
     * @param fullSiteCrawl - Full site mode vs limited mode (currently not implemented)
     * 
     * RETURN: ProductsDataResultFromCrawling với complete metadata
     */

/**
 * Polite crawling should be happen like that:
 * 1. Trình tự tổng thể (High-level flow)
Start
↓
Check Legal / ToS / robots.txt
↓
Decide Crawl Scope
↓
Request Scheduling (Rate limit)
↓
Fetch Page (with headers)
↓
Respect Response (status / retry / backoff)
↓
Parse & Extract Data
↓
Normalize & Store
↓
Cache / Fingerprint
↓
Schedule Next Crawl
↓
End
*/


export async function vancouverProductListScraper(
    siteConfig: SiteConfig,
    // dbMaxPage?: number,
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
    const { baseUrl, selectors } = siteConfig


    // Debug log để kiểm tra siteConfig
    apiLogger.info('[Product List] Starting with siteConfig', {
        name: siteConfig.name,
        baseUrl: siteConfig.baseUrl,
        isImplemented: siteConfig.isImplemented
    });

    const runId = Date.now();
    
    // ✅ Initialize products array to store scraped data
    const allProducts: ProductCardDataFromCrawling[] = [];
    
    //Initialize request queue (keep for deduplication & retry logic)
    const queueName = `vsb-queue-${runId}`;
    const requestQueue = await RequestQueue.open(queueName);

    // Initialize polite crawler
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: 'GoodSeed-Bot/1.0 (+https://goodseed.ca/contact) Commercial Cannabis Research',
        acceptLanguage: 'en-US,en;q=0.9',
        minDelay: 2000,
        maxDelay: 5000
    });

    // ✅ Parse robots.txt ONCE at initialization
    const robotsRules = await politeCrawler.parseRobots(baseUrl);
    const { crawlDelay, disallowedPaths, allowedPaths, hasExplicitCrawlDelay, userAgent } = robotsRules;

    // Check if this is test mode
    const isTestMode = startPage !== null && startPage !== undefined && 
                       endPage !== null && endPage !== undefined;

    // ✅ Log robots.txt compliance
    apiLogger.info('[Vancouver] 🤖 Robots.txt compliance', {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        disallowedPaths: disallowedPaths.length,
        allowedPaths: allowedPaths.length,
        strategy: hasExplicitCrawlDelay ? 'robots.txt enforced' : 'intelligent default'
    });

    // ✅ Calculate optimal maxRequestsPerMinute based on crawlDelay
    const calculatedMaxRate = hasExplicitCrawlDelay 
        ? Math.floor(60000 / crawlDelay)  // Respect explicit robots.txt delay
        : 15;                              // Intelligent default

    const maxConcurrency = 1; // Sequential for same site

    apiLogger.info('[Vancouver] ⚙️ Crawler configuration', {
        crawlDelayMs: crawlDelay,
        maxRequestsPerMinute: calculatedMaxRate,
        maxConcurrency,
        hasExplicitCrawlDelay,
        mode: isTestMode ? 'TEST' : 'AUTO'
    });

    let actualPages = 0;
    const emptyPages = new Set<string>();
    let successCount = 0;
    let errorCount = 0;

    // Initialize requestHandler with proper TypeScript types
    async function requestHandler(context: CheerioCrawlingContext): Promise<void> {
        const { $, request, log }: { 
            $: CheerioAPI; 
            request: CheerioCrawlingContext['request']; 
            log: Log 
        } = context;
        
        log.info(`[Product List] Scraping: ${request.url}`);

        // POLITE CRAWLING: Check robots.txt compliance (already parsed at initialization)
        const isAllowed = await politeCrawler.isAllowed(request.url);
        if (!isAllowed) {
            errorCount++;
            log.error(`[Product List] BLOCKED by robots.txt: ${request.url}`);
            throw new Error(`robots.txt blocked access to ${request.url}`);
        }

        // Extract products and pagination from current page
        const extractResult = extractProductsFromHTML($, siteConfig, sourceContext?.dbMaxPage, startPage, endPage, fullSiteCrawl);
        const products = extractResult.products;
        const maxPages = extractResult.maxPages;

        // Use ScraperLogger for aggregated page progress (reduces 4 logs to 1)
        const pageMatch = request.url.match(/\/page\/(\d+)\//);
        const currentPage = pageMatch ? parseInt(pageMatch[1]) : 1;
        
        apiLogger.logPageProgress({
            page: currentPage,
            totalPages: maxPages || actualPages || 1,
            productsFound: products.length,
            totalProductsSoFar: 0, // Will be updated in final summary
            url: request.url
        });

        // Track success
        successCount += products.length;

        // Track empty pages
        if (products.length === 0) {
            emptyPages.add(request.url);
        }

        // Check if there's a next page (verbose only)
        const hasNextPage = $(selectors.nextPage).length > 0;
        apiLogger.debug(`[Product List] Has next page: ${hasNextPage}`);

        // ✅ Push directly to allProducts array instead of dataset
        allProducts.push(...products);
        
        apiLogger.debug(`[Vancouver] Progress: ${allProducts.length} total products collected`);

        // POLITE CRAWLING: Delay is handled by crawler configuration (maxRequestsPerMinute)
        // No need for manual delay here since we use calculatedMaxRate
    }

    // Initialize errorHandler with proper TypeScript types
    const errorHandler: ErrorHandler<CheerioCrawlingContext> = async (context: CheerioCrawlingContext, error: Error): Promise<void> => {
        const { request, log }: {
            request: CheerioCrawlingContext['request'];
            log: Log;
        } = context;
        
        errorCount++;
        
        // POLITE CRAWLING: Handle HTTP status codes properly
        const httpError = error as any;
        if (httpError?.response?.status) {
            const statusCode: number = httpError.response.status;
            const shouldRetry: boolean = politeCrawler.shouldRetryOnStatus(statusCode);

            if (shouldRetry) {
                const backoffDelay: number = await politeCrawler.handleHttpStatus(statusCode, request.url);
                apiLogger.debug(`[Product List] HTTP ${statusCode} for ${request.url}, backing off for ${backoffDelay}ms`);
                await new Promise<void>(resolve => setTimeout(resolve, backoffDelay));
                throw error; // Re-throw to trigger retry
            } else {
                log.error(`[Product List] Non-retryable HTTP ${statusCode} for ${request.url}`);
                throw error;
            }
        } else {
            log.error(`[Product List] Non-HTTP error for ${request.url}`);
            throw error;
        }
    };

    // Thiết lập function crawler
    const crawler = new CheerioCrawler({
        requestQueue,
        requestHandler, // Use the extracted requestHandler function
        errorHandler, // Use the extracted errorHandler function
        maxRequestsPerMinute: calculatedMaxRate, // ✅ Dynamic from robots.txt
        maxConcurrency: maxConcurrency,          // ✅ Use calculated value
        maxRequestRetries: 3,
        preNavigationHooks: [
            async (crawlingContext, requestAsBrowserOptions) => {
                // Add polite crawler headers
                const headers = politeCrawler.getHeaders();
                Object.assign(requestAsBrowserOptions.headers || {}, headers);
            }
        ],
    });

    // Auto-crawl mode: Start với page 1 để detect maxPages, sau đó crawl remaining pages
    apiLogger.info('[Product List] Starting crawl with page 1 to detect pagination...');

    // Extract path from source URL - handle both /shop and /product-category/* patterns
    let sourcePath = '/shop'; // default fallback

    if (sourceContext?.scrapingSourceUrl) {
        try {
            const url = new URL(sourceContext.scrapingSourceUrl);
            sourcePath = url.pathname;

            // Ensure path doesn't end with slash for consistent URL building
            sourcePath = sourcePath.replace(/\/$/, '');

            apiLogger.info(`[Product List] Using dynamic source path: ${sourcePath}`);
        } catch (error) {
            apiLogger.warn('[Product List] Invalid sourceContext URL, using default /shop', {
                url: sourceContext.scrapingSourceUrl,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            sourcePath = '/shop';
        }
    } else {
        apiLogger.info('[Product List] No sourceContext provided, using default /shop');
    }

    const firstPageUrl = `${baseUrl}${sourcePath}/`;

    // Step 1: Crawl page 1 to detect total pages and collect first batch
    await requestQueue.addRequest({ url: firstPageUrl });
    
    try {
        await crawler.run();
    } finally {
        // ✅ Cleanup will happen after all pages are crawled
    }

    // Step 2: Check first page result from allProducts array
    let detectedMaxPages = 1; // default fallback

    if (allProducts.length > 0) {
        apiLogger.info(`[Product List] Found ${allProducts.length} products on page 1`);

        // Try to detect pagination from extractProductsFromHTML
        // The maxPages should come from the extractResult in requestHandler
        // For now, we'll use sourceContext?.dbMaxPage or a safe default
        detectedMaxPages = sourceContext?.dbMaxPage || 50;
        
        // In test mode, use endPage as limit
        if (isTestMode && endPage) {
            detectedMaxPages = Math.min(endPage, detectedMaxPages);
        }
        
        apiLogger.info(`[Product List] Will crawl up to ${detectedMaxPages} total pages`);

        // Step 3: Crawl remaining pages (2 to maxPages) if more than 1 page
        if (detectedMaxPages > 1) {
            const remainingUrls: string[] = [];

            for (let page = 2; page <= detectedMaxPages; page++) {
                const pageUrl = `${baseUrl}${sourcePath}/page/${page}/`;
                remainingUrls.push(pageUrl);
            }

            if (remainingUrls.length > 0) {
                apiLogger.info(`[Product List] Crawling remaining ${remainingUrls.length} pages (2 to ${detectedMaxPages})...`);
                for (const url of remainingUrls) {
                    await requestQueue.addRequest({ url });
                }
                
                try {
                    await crawler.run();
                } finally {
                    // ✅ Cleanup: Drop request queue to free up memory/storage
                    try {
                        await requestQueue.drop();
                        apiLogger.debug(`[Vancouver] Cleaned up request queue: ${queueName}`);
                    } catch (cleanupError) {
                        apiLogger.logError('[Vancouver] Failed to cleanup request queue:', cleanupError as Error, {
                            queueName
                        });
                    }
                }
            }
        } else {
            // ✅ Only 1 page, cleanup now
            try {
                await requestQueue.drop();
                apiLogger.debug(`[Vancouver] Cleaned up request queue: ${queueName}`);
            } catch (cleanupError) {
                apiLogger.logError('[Vancouver] Failed to cleanup request queue:', cleanupError as Error, {
                    queueName
                });
            }
        }
        
        actualPages = detectedMaxPages;
    } else {
        apiLogger.warn('[Product List] No products found on page 1, using fallback');
        
        // ✅ Cleanup even on failure
        try {
            await requestQueue.drop();
            apiLogger.debug(`[Vancouver] Cleaned up request queue: ${queueName}`);
        } catch (cleanupError) {
            apiLogger.logError('[Vancouver] Failed to cleanup request queue:', cleanupError as Error, {
                queueName
            });
        }
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // ✅ Aggregated completion logging
    apiLogger.info('[Vancouver] ✅ Crawling completed', {
        '📊 Products': allProducts.length,
        '📄 Pages Processed': actualPages,
        '✅ Success': successCount,
        '❌ Errors': errorCount,
        '⏱️ Duration': `${(processingTime / 1000).toFixed(2)}s`,
        '🤖 Robots.txt': hasExplicitCrawlDelay ? 'enforced' : 'default',
        '🚀 Rate': `${calculatedMaxRate} req/min`
    });

    return {
        // category: listingUrl,
        totalProducts: allProducts.length,
        totalPages: actualPages,
        products: allProducts,
        timestamp: new Date(),
        duration: processingTime,
    };
}

// }


