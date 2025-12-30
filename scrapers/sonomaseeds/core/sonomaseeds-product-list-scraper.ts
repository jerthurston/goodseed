/**
 * Sonoma Seeds Product List Scraper (Cheerio - Standard Pagination)
 * 
 * Uses Cheerio for fast HTML parsing with WooCommerce standard pagination
 */

import { extractProductsFromHTML } from '@/scrapers/sonomaseeds/utils/extractProductsFromHTML';
import { ProductsDataResultFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { CheerioCrawler, Dataset, RequestQueue } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';

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
 * @param dbMaxPage - Optional maximum pages to scrape limit
 */
export async function sonomaSeedsProductListScraper(siteConfig: SiteConfig, dbMaxPage?: number): Promise<ProductsDataResultFromCrawling> {
    const {baseUrl, selectors} = siteConfig

    const startTime = Date.now();

    // Debug log để kiểm tra siteConfig
    apiLogger.info('[Sonoma Seeds Product List] Starting with siteConfig', {
        name: siteConfig.name,
        baseUrl: siteConfig.baseUrl,
        isImplemented: siteConfig.isImplemented
    });

    const runId = Date.now();
    const datasetName = `sonoma-${runId}`;
    const dataset = await Dataset.open(datasetName);
    const requestQueue = await RequestQueue.open(`sonoma-queue-${runId}`);

    let actualPages = 0;
    const emptyPages = new Set<string>();

    const crawler = new CheerioCrawler({
        requestQueue,
        async requestHandler({ $, request, log }) {
            log.info(`[Sonoma Seeds Product List] Scraping: ${request.url}`);

            // Extract products and pagination from current page
            const extractResult = extractProductsFromHTML($,selectors,baseUrl,dbMaxPage);
            const products = extractResult.products;
            const maxPages = extractResult.maxPages;
            
            log.info(`[Sonoma Seeds Product List] Extracted ${products.length} products`);
            if (maxPages) {
                log.info(`[Sonoma Seeds Product List] Detected ${maxPages} total pages from pagination`);
            }

            // Track empty pages
            if (products.length === 0) {
                emptyPages.add(request.url);
            }

            // Check if there's a next page
            const hasNextPage = $(selectors.nextPage).length > 0;
            log.info(`[Sonoma Seeds Product List] Has next page: ${hasNextPage}`);

            await dataset.pushData({ 
                products, 
                url: request.url, 
                hasNextPage,
                maxPages: maxPages // Include maxPages in dataset
            });

            // PROJECT REQUIREMENT: Wait 2-5 seconds between requests to same site
            const delayMs = Math.floor(Math.random() * 3000) + 2000; // Random 2000-5000ms
            log.info(`[Sonoma Seeds Product List] Waiting ${delayMs}ms before next request (project requirement: 2-5 seconds)`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        },

        maxRequestsPerMinute: 15, // Reduced to ensure 2-5 second delays are respected
        maxConcurrency: 1, // Sequential requests within same site (project requirement)
        maxRequestRetries: 3,
    });

    // Auto-crawl mode: Start với page 1 để detect maxPages, sau đó crawl remaining pages
    apiLogger.info('[Sonoma Seeds Product List] Starting crawl with page 1 to detect pagination...');
    
    // First, crawl page 1 to detect maxPages from pagination  
    const firstPageUrl = `${baseUrl}/shop/`; // Sonoma Seeds main shop page
    await requestQueue.addRequest({ url: firstPageUrl });
    await crawler.run();
    
    // Check first page result to get maxPages and products
    const firstResults = await dataset.getData();
    let detectedMaxPages = 1; // default fallback
    
    if (firstResults.items.length > 0) {
        const firstResult = firstResults.items[0] as any;
        if (firstResult.products && firstResult.products.length > 0) {
            apiLogger.info(`[Sonoma Seeds Product List] Found ${firstResult.products.length} products on page 1`);
            
            // Try to detect pagination from extractProductsFromHTML
            detectedMaxPages = firstResult.maxPages || 1;
            apiLogger.info(`[Sonoma Seeds Product List] Detected ${detectedMaxPages} total pages from pagination`);
            
            // Now crawl remaining pages (2 to maxPages) if more than 1 page
            if (detectedMaxPages > 1) {
                const remainingUrls: string[] = [];
                // Limit to 50 pages for safety
                const pagesToCrawl = Math.min(detectedMaxPages, dbMaxPage || 50);
                for (let page = 2; page <= pagesToCrawl; page++) {
                    // Sonoma Seeds WooCommerce standard format: /shop/page/2/
                    remainingUrls.push(`${baseUrl}/shop/page/${page}/`);
                }
                
                if (remainingUrls.length > 0) {
                    apiLogger.info(`[Sonoma Seeds Product List] Crawling remaining ${remainingUrls.length} pages...`);
                    for (const url of remainingUrls) {
                        await requestQueue.addRequest({ url });
                    }
                    await crawler.run();
                }
            }
            // Set actual pages based on what we actually plan to crawl
            actualPages = Math.min(detectedMaxPages, dbMaxPage || 50);
        } else {
            apiLogger.warn('[Sonoma Seeds Product List] No products found on page 1, using fallback');
        }
    } else {
        apiLogger.warn('[Sonoma Seeds Product List] No results from page 1 crawl');
    }

    // Collect results from dataset
    const results = await dataset.getData();
    const allProducts: ProductCardDataFromCrawling[] = [];

    results.items.forEach((item) => {
        allProducts.push(...(item as { products: ProductCardDataFromCrawling[] }).products);
    });

    return {
        totalProducts: allProducts.length,
        totalPages: actualPages,
        products: allProducts,
        timestamp: new Date(),
        duration: Date.now() - startTime,
    };
}