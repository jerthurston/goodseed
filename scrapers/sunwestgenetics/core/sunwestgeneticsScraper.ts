/**
 * SunWest Genetics Product List Scraper (Cheerio - Standard Pagination)
 * 
 * Uses Cheerio for fast HTML parsing with standard pagination
 * Adapted from Vancouver Seed Bank scraper
 */

import { extractProductsFromHTML } from '@/scrapers/sunwestgenetics/utils/extractProductsFromHTML';
import { ProductsDataResultFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { CheerioCrawler, Dataset, RequestQueue } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';

/**
 * SunWestGeneticsProductListScraper
 * 
 * Nhiệm vụ chính:
 * 1. Crawl danh sách sản phẩm từ SunWest Genetics (product listing pages)
 * 2. Hỗ trợ 2 chế độ:
 *    - Fixed mode: Crawl số trang cố định (maxPages > 0)
 *    - Auto mode: Crawl tự động đến hết trang (maxPages = 0)
 * 
 * 3. Extract thông tin từ product sections:
 *    - Tên sản phẩm, URL, slug
 *    - Hình ảnh
 *    - Strain type (Indica Dominant Hybrid, Sativa Dominant Hybrid, Balanced Hybrid, etc.)
 *    - Rating và review count từ "Rated X.XX out of 5 based on N customer ratings"
 *    - THC/CBD levels với parsing thông minh từ text patterns
 *    - Flowering time, growing level
 *    - Pricing với pack sizes (5, 10, 25 seeds) từ "Pack 5 10 25 $65.00 – $240.00"
 * 
 * 4. Sử dụng CheerioCrawler:
 *    - Parse HTML sections thay vì structured product cards
 *    - Text-based extraction cho SunWest Genetics format
 * 
 * 5. Trả về CategoryResultFromCrawling:
 *    - Danh sách products[]
 *    - Metadata (totalProducts, totalPages, duration)
 * 
 * Lưu ý:
 * - Không lưu database, chỉ crawl và return data
 * - Để lưu DB, dùng SaveDbService
 * - Để crawl theo batch, dùng scrape-batch.ts script
 * 
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
    const datasetName = `sunwest-${runId}`;
    const dataset = await Dataset.open(datasetName);
    const requestQueue = await RequestQueue.open(`sunwest-queue-${runId}`);

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

            await dataset.pushData({ 
                products, 
                url: request.url, 
                hasNextPage,
                maxPages: maxPages // Include maxPages in dataset
            });

            // ✅ POLITE CRAWLING: Apply delay from parsed robots.txt
            log.debug(`[SunWest Product List] ⏱️ Applying crawl delay: ${crawlDelay}ms (${hasExplicitCrawlDelay ? 'robots.txt' : 'default'})`);
            await new Promise(resolve => setTimeout(resolve, crawlDelay));
        },

        maxRequestsPerMinute: calculatedMaxRate, // ✅ Dynamic rate from robots.txt
        maxConcurrency: maxConcurrency,          // ✅ Sequential requests
        maxRequestRetries: 3,
    });

    // Auto-crawl mode: Start with startPage to detect maxPages, then crawl remaining pages
    apiLogger.info(`[SunWest Product List] Starting crawl with page ${startPage} to detect pagination...`);
        
    // First, crawl startPage to detect maxPages from pagination  
    const firstPageUrl = startPage === 1 ? 
        `${baseUrl}/shop/` : 
        `${baseUrl}/shop/page/${startPage}/`;
    
    await requestQueue.addRequest({ url: firstPageUrl });
    await crawler.run();
    
    // Check first page result to get maxPages and products
    const firstResults = await dataset.getData();
    let detectedMaxPages = startPage; // default fallback
    
    if (firstResults.items.length > 0) {
        const firstResult = firstResults.items[0] as any;
        if (firstResult.products && firstResult.products.length > 0) {
            apiLogger.info(`[SunWest Product List] Found ${firstResult.products.length} products on page ${startPage}`);
            
            // Try to detect pagination from extractProductsFromHTML
            detectedMaxPages = firstResult.maxPages || startPage;
            apiLogger.info(`[SunWest Product List] Detected ${detectedMaxPages} total pages from pagination`);
            
            // Calculate effective end page
            const effectiveEndPage = endPage ? Math.min(endPage, detectedMaxPages) : detectedMaxPages;
            
            // Now crawl remaining pages (startPage+1 to effectiveEndPage) if needed
            if (effectiveEndPage > startPage) {
                const remainingUrls: string[] = [];
                
                for (let page = startPage + 1; page <= effectiveEndPage; page++) {
                    // SunWest Genetics WooCommerce standard format: /shop/page/2/
                    remainingUrls.push(`${baseUrl}/shop/page/${page}/`);
                }
                
                if (remainingUrls.length > 0) {
                    apiLogger.info(`[SunWest Product List] Crawling remaining ${remainingUrls.length} pages (${startPage + 1} to ${effectiveEndPage})...`);
                    for (const url of remainingUrls) {
                        await requestQueue.addRequest({ url });
                    }
                    await crawler.run();
                }
            }
            
            actualPages = effectiveEndPage - startPage + 1;
        } else {
            apiLogger.warn(`[SunWest Product List] No products found on page ${startPage}, using fallback`);
        }
    } else {
        apiLogger.warn(`[SunWest Product List] No results from page ${startPage} crawl`);
    }

    // Collect results from dataset
    const results = await dataset.getData();
    const allProducts: ProductCardDataFromCrawling[] = [];

    results.items.forEach((item) => {
        allProducts.push(...(item as { products: ProductCardDataFromCrawling[] }).products);
    });

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