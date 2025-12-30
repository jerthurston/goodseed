/**
 * Vancouver Seed Bank Product List Scraper (Cheerio - Standard Pagination)
 * 
 * KIẾN TRÚC TỔNG QUAN:
 * - Uses Cheerio for fast HTML parsing với WooCommerce standard pagination
 * - Design Pattern: Function-based scraper với delegation pattern
 * - Performance: Cheerio nhanh hơn 10-20x so với Playwright browser automation
 * - Rate Limiting: Tuân thủ 2-5 giây delay giữa requests theo project requirement
 */

import { extractProductsFromHTML } from '@/scrapers/vancouverseedbank/utils/extractProductsFromHTML';
import { ProductsDataResultFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { CheerioCrawler, Dataset, RequestQueue, RobotsTxtFile } from 'crawlee';
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
    const datasetName = `vsb-${runId}`;
    const dataset = await Dataset.open(datasetName);
    const requestQueue = await RequestQueue.open(`vsb-queue-${runId}`);

    // Initialize polite crawler
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: 'GoodSeed-Bot/1.0 (+https://goodseed.ca/contact) Commercial Cannabis Research',
        acceptLanguage: 'en-US,en;q=0.9',
        minDelay: 2000,
        maxDelay: 5000
    });

    let actualPages = 0;
    const emptyPages = new Set<string>();

    // Xử lý load robots.txt
    // const robots = await RobotsTxtFile.find('https://vancouverseedbank.ca/robots.txt')
    // apiLogger.info('[Product List] Loaded robots.txt', { robots });


    const crawler = new CheerioCrawler({
        requestQueue,
        async requestHandler({ $, request, log }) {
            log.info(`[Product List] Scraping: ${request.url}`);

            // POLITE CRAWLING: Check robots.txt compliance
            const isAllowed = await politeCrawler.isAllowed(request.url);
            if (!isAllowed) {
                log.error(`[Product List] BLOCKED by robots.txt: ${request.url}`);
                throw new Error(`robots.txt blocked access to ${request.url}`);
            }

            // Extract products and pagination from current page
            const extractResult = extractProductsFromHTML($, siteConfig, sourceContext?.dbMaxPage, startPage, endPage, fullSiteCrawl);
            const products = extractResult.products;
            const maxPages = extractResult.maxPages;

            log.info(`[Product List] Extracted ${products.length} products`);
            if (maxPages) {
                log.info(`[Product List] Detected ${maxPages} total pages from pagination`);
            }

            // Track empty pages
            if (products.length === 0) {
                emptyPages.add(request.url);
            }

            // Check if there's a next page
            const hasNextPage = $(selectors.nextPage).length > 0;
            log.info(`[Product List] Has next page: ${hasNextPage}`);

            await dataset.pushData({
                products,
                url: request.url,
                hasNextPage,
                maxPages: maxPages // Include maxPages in dataset
            });

            // POLITE CRAWLING: Use polite crawler for delays and robots.txt compliance
            const delayMs = await politeCrawler.getCrawlDelay(request.url);
            log.info(`[Product List] Using polite crawl delay: ${delayMs}ms for ${request.url}`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        },
        maxRequestsPerMinute: 15, // Reduced to ensure 2-5 second delays are respected
        maxConcurrency: 1, // Sequential requests within same site (project requirement)
        maxRequestRetries: 3,
        preNavigationHooks: [
            async (crawlingContext, requestAsBrowserOptions) => {
                // Add polite crawler headers
                const headers = politeCrawler.getHeaders();
                Object.assign(requestAsBrowserOptions.headers || {}, headers);
            }
        ],
        errorHandler: async ({ request, error, log }) => {
            // POLITE CRAWLING: Handle HTTP status codes properly
            const httpError = error as any;
            if (httpError?.response?.status) {
                const statusCode = httpError.response.status;
                const shouldRetry = politeCrawler.shouldRetryOnStatus(statusCode);
                
                if (shouldRetry) {
                    const backoffDelay = await politeCrawler.handleHttpStatus(statusCode, request.url);
                    log.info(`[Product List] HTTP ${statusCode} for ${request.url}, backing off for ${backoffDelay}ms`);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    throw error; // Re-throw to trigger retry
                } else {
                    log.error(`[Product List] Non-retryable HTTP ${statusCode} for ${request.url}`);
                    throw error;
                }
            } else {
                log.error(`[Product List] Non-HTTP error for ${request.url}`);
                throw error;
            }
        },
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

    // First, crawl page 1 to detect maxPages from pagination
    // const firstPageUrl = `${baseUrl}${sourcePath}/`; 
    await requestQueue.addRequest({ url: firstPageUrl });
    await crawler.run();

    // Check first page result to get maxPages and products
    const firstResults = await dataset.getData();
    let detectedMaxPages = 1; // default fallback

    if (firstResults.items.length > 0) {
        const firstResult = firstResults.items[0] as any;
        if (firstResult.products && firstResult.products.length > 0) {
            apiLogger.info(`[Product List] Found ${firstResult.products.length} products on page 1`);

            // Try to detect pagination from extractProductsFromHTML
            detectedMaxPages = firstResult.maxPages || 1;
            apiLogger.info(`[Product List] Detected ${detectedMaxPages} total pages from pagination`);

            // Now crawl remaining pages (2 to maxPages) if more than 1 page
            if (detectedMaxPages > 1) {
                const remainingUrls: string[] = [];

                // Use maxPages from test mode if available, otherwise use detected pages with safety limit
                const finalMaxPages = firstResult.maxPages || Math.min(detectedMaxPages, 50);

                for (let page = 2; page <= finalMaxPages; page++) {
                    const pageUrl = `${baseUrl}${sourcePath}/page/${page}/`;
                    remainingUrls.push(pageUrl);
                }

                if (remainingUrls.length > 0) {
                    apiLogger.info(`[Product List] Crawling remaining ${remainingUrls.length} pages (finalMaxPages=${finalMaxPages})...`);
                    for (const url of remainingUrls) {
                        await requestQueue.addRequest({ url });
                    }
                    await crawler.run();
                }
            }
            // Use maxPages from test mode if available, otherwise use detected pages with safety limit
            actualPages = firstResult.maxPages || Math.min(detectedMaxPages, 50);
        } else {
            apiLogger.warn('[Product List] No products found on page 1, using fallback');
        }
    } else {
        apiLogger.warn('[Product List] No results from page 1 crawl');
    }

    // Collect results from dataset
    const results = await dataset.getData();
    const allProducts: ProductCardDataFromCrawling[] = [];

    results.items.forEach((item) => {
        allProducts.push(...(item as { products: ProductCardDataFromCrawling[] }).products);
    });

    return {
        // category: listingUrl,
        totalProducts: allProducts.length,
        totalPages: actualPages,
        products: allProducts,
        timestamp: new Date(),
        duration: Date.now() - startTime,
    };
}

// }


