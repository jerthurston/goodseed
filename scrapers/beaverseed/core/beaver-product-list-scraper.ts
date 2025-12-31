/**
 * Beaver Seed Product List Scraper (Cheerio - Jet Smart Filters Pagination)
 * 
 * KIẾN TRÚC TỔNG QUAN:
 * - Uses Cheerio for fast HTML parsing với jet-smart-filters pagination
 * - Design Pattern: Function-based scraper với delegation pattern
 * - Performance: Cheerio nhanh hơn 10-20x so với Playwright browser automation
 * - Rate Limiting: Tuân thủ 2-5 giây delay giữa requests theo project requirement
 * 
 * DIFFERENCES FROM VANCOUVER SEED BANK:
 * - Uses jet-smart-filters pagination instead of WooCommerce standard
 * - Same WooCommerce product structure, different pagination handling
 */

import { extractProductsFromHTML } from '@/scrapers/beaverseed/utils/extractProductsFromHTML';
import { getScrapingUrl } from '@/scrapers/beaverseed/utils/getScrapingUrl';
import { ProductsDataResultFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { CheerioAPI, CheerioCrawler, CheerioCrawlingContext, Dataset, ErrorHandler, Log, RequestQueue } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';

/**
 * BeaverSeedProductListScraper - LUỒNG XỬ LÝ CHÍNH
 * 
 * NHIỆM VỤ CHÍNH:
 * 1. 🕷️ Crawl danh sách sản phẩm từ Beaver Seed (product listing pages)
 * 2. 📄 Hỗ trợ chế độ:
 *    - Auto mode: Crawl tự động đến hết trang (maxPages = 0)
 *    - Limited mode: Crawl với giới hạn dbMaxPage parameter
 *    - Test mode: Crawl với startPage/endPage custom range
 * 
 * 3. 📋 Extract thông tin từ product cards:
 *    - Tên sản phẩm, URL, slug
 *    - Hình ảnh (xử lý lazy loading với data-src fallback)
 *    - Strain type (Indica Dominant Hybrid, etc.)
 *    - Rating và review count
 *    - THC/CBD levels (min/max parsing)
 *    - Flowering time, growing level
 *    - Price variations (5/10/25 seeds packs)
 * 
 * 4. ⚡ Sử dụng CheerioCrawler với jet-smart-filters handling:
 *    - Phù hợp với Beaver Seed's AJAX pagination system
 *    - Không cần browser rendering → tiết kiệm resources
 *    - Sequential crawling với rate limiting
 * 
 * 5. 📤 Trả về ProductsDataResultFromCrawling:
 *    - Danh sách products[] với full metadata
 *    - Pagination info (totalProducts, totalPages, duration)
 *    - Performance metrics cho monitoring
 */

export async function BeaverSeedProductListScraper(
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

    // Debug log
    apiLogger.info('[Beaver Seed Scraper] Starting with siteConfig', {
        name: siteConfig.name,
        baseUrl: siteConfig.baseUrl,
        isImplemented: siteConfig.isImplemented,
        scrapingSourceUrl: sourceContext?.scrapingSourceUrl
    });

    // Validate sourceContext
    if (!sourceContext?.scrapingSourceUrl) {
        throw new Error('[Beaver Seed Scraper] scrapingSourceUrl is required in sourceContext');
    }

    // Initialize dataset and request queue
    const runId = Date.now();
    const datasetName = `beaverseed-${runId}`;
    const dataset = await Dataset.open(datasetName);
    const requestQueue = await RequestQueue.open(`beaverseed-queue-${runId}`);

    // Initialize polite crawler
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: 'GoodSeed-Bot/1.0 (+https://goodseed.ca/contact) Commercial Cannabis Research',
        acceptLanguage: 'en-US,en;q=0.9',
        minDelay: 2000,
        maxDelay: 5000
    });

    let totalProducts = 0;
    let actualPages = 0;
    let allProducts: ProductCardDataFromCrawling[] = [];
    let maxPages: number | null = null;

    // Add first page to queue
    const firstPageUrl = getScrapingUrl(sourceContext.scrapingSourceUrl, 1);
    await requestQueue.addRequest({
        url: firstPageUrl,
        userData: { pageNumber: 1 }
    });

    // Request handler
    async function requestHandler(context: CheerioCrawlingContext): Promise<void> {
        const { $, request, log }: { 
            $: CheerioAPI; 
            request: CheerioCrawlingContext['request']; 
            log: Log 
        } = context;
        
        const pageNumber = request.userData?.pageNumber || 1;
        log.info(`[Beaver Seed] Processing page ${pageNumber}: ${request.url}`);

        // POLITE CRAWLING: Check robots.txt compliance
        const isAllowed = await politeCrawler.isAllowed(request.url);
        if (!isAllowed) {
            log.error(`[Beaver Seed] BLOCKED by robots.txt: ${request.url}`);
            throw new Error(`robots.txt blocked access to ${request.url}`);
        }

        try {
            // Extract products and pagination info from current page
            const result = extractProductsFromHTML(
                $, 
                siteConfig,
                sourceContext?.dbMaxPage,
                startPage,
                endPage,
                fullSiteCrawl
            );

            // Update maxPages from first page
            if (pageNumber === 1 && result.maxPages) {
                maxPages = result.maxPages;
                log.info(`[Beaver Seed] Detected ${maxPages} total pages from jet-smart-filters pagination`);
            }

            // Add products to collection
            allProducts.push(...result.products);
            totalProducts += result.products.length;
            actualPages++;

            log.info(`[Beaver Seed] Page ${pageNumber}: Found ${result.products.length} products`);

            // Save page data to dataset
            await dataset.pushData({
                pageNumber,
                url: request.url,
                products: result.products,
                extractedAt: new Date().toISOString()
            });

            // Determine if we should crawl more pages
            let shouldContinue = false;

            if (startPage !== null && startPage !== undefined && 
                endPage !== null && endPage !== undefined) {
                // Test mode: crawl specific range
                shouldContinue = pageNumber < endPage;
                log.info(`[Beaver Seed] Test mode: Page ${pageNumber}/${endPage}`);
            } else if (maxPages && maxPages > 0) {
                // Auto/Manual mode: crawl to detected max pages
                shouldContinue = pageNumber < maxPages;
                log.info(`[Beaver Seed] Auto mode: Page ${pageNumber}/${maxPages}`);
            } else {
                // Fallback: stop after first page if no pagination detected
                shouldContinue = false;
                log.info(`[Beaver Seed] No pagination detected, stopping after page ${pageNumber}`);
            }

            // Add next page to queue if needed
            if (shouldContinue) {
                const nextPageNumber = pageNumber + 1;
                const nextPageUrl = getScrapingUrl(sourceContext?.scrapingSourceUrl || '', nextPageNumber);
                
                await requestQueue.addRequest({
                    url: nextPageUrl,
                    userData: { pageNumber: nextPageNumber }
                });
                
                log.info(`[Beaver Seed] Added next page to queue: ${nextPageNumber}`);
            }

        } catch (error) {
            log.error(`[Beaver Seed] Error processing page ${pageNumber}:`, { error });
            throw error;
        }

        // POLITE CRAWLING: Apply delay
        const delayMs = await politeCrawler.getCrawlDelay(request.url);
        log.info(`[Beaver Seed] Using polite crawl delay: ${delayMs}ms for ${request.url}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Error handler
    const errorHandler: ErrorHandler<CheerioCrawlingContext> = async (context: CheerioCrawlingContext, error: Error): Promise<void> => {
        const { request, log }: {
            request: CheerioCrawlingContext['request'];
            log: Log;
        } = context;
        
        // POLITE CRAWLING: Handle HTTP status codes properly
        const httpError = error as any;
        if (httpError?.response?.status) {
            const statusCode: number = httpError.response.status;
            
            if (statusCode === 429) {
                log.info(`[Beaver Seed] Rate limited (429) - increasing delay: ${request.url}`);
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10s delay
                throw error; // Let Crawlee retry
            } else if (statusCode >= 500) {
                log.info(`[Beaver Seed] Server error (${statusCode}) - will retry: ${request.url}`);
                throw error;
            } else if (statusCode === 404) {
                log.info(`[Beaver Seed] Page not found (404) - skipping: ${request.url}`);
                return; // Skip this request
            }
        }
        
        log.error(`[Beaver Seed] Unhandled error for ${request.url}:`, error);
        throw error;
    };

    // Configure crawler
    const crawler = new CheerioCrawler({
        requestQueue,
        requestHandler,
        errorHandler,
        maxRequestRetries: 3,
        maxRequestsPerCrawl: 0, // No limit
        maxConcurrency: 1,      // Sequential processing
        requestHandlerTimeoutSecs: 60,
        navigationTimeoutSecs: 30,
    });

    // Run crawler
    await crawler.run();

    // Log results
    const duration = Date.now() - startTime;
    
    apiLogger.info('[Beaver Seed Scraper] Crawling completed', {
        totalProducts: allProducts.length,
        totalPages: actualPages,
        maxPages,
        duration: `${duration}ms`,
        scrapingSourceUrl: sourceContext.scrapingSourceUrl
    });

    return {
        totalProducts: allProducts.length,
        totalPages: actualPages,
        products: allProducts,
        timestamp: new Date(),
        duration: Date.now() - startTime,
    };
}

// Export the scraper function
export default BeaverSeedProductListScraper;