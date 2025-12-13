/**
 * SunWest Genetics Product List Scraper (Cheerio - Standard Pagination)
 * 
 * Uses Cheerio for fast HTML parsing with standard pagination
 * Adapted from Vancouver Seed Bank scraper
 */

import { extractProductsFromHTML } from '@/scrapers/sunwestgenetics/utils/extractProductsFromHTML';
import { CategoryResultFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { CheerioCrawler, Dataset, RequestQueue } from 'crawlee';
import { BASE_URL, PRODUCT_CARD_SELECTORS, getCategoryUrl } from './selectors';

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
export class ProductListScraper {
    private baseUrl: string;

    constructor(baseUrl: string = BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Scrape product listing with pagination support
     * 
     * @param listingUrl - Base URL of the listing page
     * @param maxPages - Maximum pages to scrape (0 = crawl all pages until no products found)
     */
    async scrapeProductList(listingUrl: string, maxPages: number = 5): Promise<CategoryResultFromCrawling> {
        const startTime = Date.now();

        const runId = Date.now();
        const datasetName = `sunwest-${runId}`;
        const dataset = await Dataset.open(datasetName);
        const requestQueue = await RequestQueue.open(`sunwest-queue-${runId}`);

        let actualPages = 0;
        const emptyPages = new Set<string>();

        const crawler = new CheerioCrawler({
            requestQueue,
            async requestHandler({ $, request, log }) {
                log.info(`[SunWest Product List] Scraping: ${request.url}`);

                // Extract products from current page
                const products = extractProductsFromHTML($);
                log.info(`[SunWest Product List] Extracted ${products.length} products`);

                // Track empty pages
                if (products.length === 0) {
                    emptyPages.add(request.url);
                }

                // Check if there's a next page
                const hasNextPage = $(PRODUCT_CARD_SELECTORS.nextPage).length > 0;
                log.info(`[SunWest Product List] Has next page: ${hasNextPage}`);

                await dataset.pushData({ products, url: request.url, hasNextPage });

                // PROJECT REQUIREMENT: Wait 2-5 seconds between requests to same site
                const delayMs = Math.floor(Math.random() * 3000) + 2000; // Random 2000-5000ms
                log.info(`[SunWest Product List] Waiting ${delayMs}ms before next request (project requirement: 2-5 seconds)`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            },

            // PROJECT REQUIREMENT COMPLIANCE:
            maxRequestsPerMinute: 15, // Reduced to ensure 2-5 second delays are respected
            maxConcurrency: 1, // Sequential requests within same site (project requirement)
            maxRequestRetries: 2, // Keep reduced retries for faster failure handling
            requestHandlerTimeoutSecs: 30, // Add timeout
            
            // Additional optimizations
            additionalMimeTypes: ['text/html'],
            ignoreSslErrors: false,
            persistCookiesPerSession: false, // Disable cookies for performance
        });

        // Auto-crawl mode: discover pages until no more products
        if (maxPages === 0) {
            let page = 1;
            const urls: string[] = [];

            while (true) {
                const pageUrl = getCategoryUrl(listingUrl, page);
                urls.push(pageUrl);

                // Crawl current page
                await crawler.run([pageUrl]);

                // Check if page has products
                const results = await dataset.getData();
                const lastResult = results.items[results.items.length - 1] as { products: ProductCardDataFromCrawling[], hasNextPage: boolean };

                if (lastResult.products.length === 0) {
                    console.log(`[SunWest Product List] Page ${page} is empty. Stopping.`);
                    break;
                }

                if (!lastResult.hasNextPage) {
                    console.log(`[SunWest Product List] No next page button found. Stopping at page ${page}.`);
                    actualPages = page;
                    break;
                }

                actualPages = page;
                page++;

                // Safety limit
                if (page > 200) {
                    console.log('[SunWest Product List] Reached safety limit of 200 pages. Stopping.');
                    break;
                }
            }
        } else {
            // Fixed pages mode
            const urls: string[] = [];
            for (let page = 1; page <= maxPages; page++) {
                urls.push(getCategoryUrl(listingUrl, page));
            }
            await crawler.run(urls);
            actualPages = maxPages;
        }

        // Collect results from dataset
        const results = await dataset.getData();
        const allProducts: ProductCardDataFromCrawling[] = [];

        results.items.forEach((item) => {
            allProducts.push(...(item as { products: ProductCardDataFromCrawling[] }).products);
        });

        return {
            category: listingUrl,
            totalProducts: allProducts.length,
            totalPages: actualPages,
            products: allProducts,
            timestamp: new Date(),
            duration: Date.now() - startTime,
        };
    }

    /**
     * Scrape product listing by batch (page range)
     * 
     * Nhiệm vụ:
     * - Crawl một range page cụ thể (startPage → endPage)
     * - Tránh crawl lại những page đã crawl trước đó
     * - Phù hợp cho crawl batch: chia nhỏ công việc, dễ dừng/resume
     * 
     * Ví dụ:
     * - Batch 1: scrapeProductListByBatch(url, 1, 10)   → Page 1-10
     * - Batch 2: scrapeProductListByBatch(url, 11, 20)  → Page 11-20
     * - Batch 3: scrapeProductListByBatch(url, 21, 30)  → Page 21-30
     * 
     * @param listingUrl - Base URL of the listing page
     * @param startPage - Start page number (inclusive)
     * @param endPage - End page number (inclusive)
     * @returns CategoryScrapeResult with products from specified page range
     */
    async scrapeProductListByBatch(
        listingUrl: string,
        startPage: number,
        endPage: number
    ): Promise<CategoryResultFromCrawling> {
        if (startPage < 1 || endPage < startPage) {
            throw new Error(`Invalid page range: ${startPage}-${endPage}. Start must be >= 1 and end must be >= start.`);
        }

        const startTime = Date.now();
        const totalPages = endPage - startPage + 1;

        const runId = Date.now();
        const datasetName = `sunwest-batch-${runId}`;
        const dataset = await Dataset.open(datasetName);
        const requestQueue = await RequestQueue.open(`sunwest-queue-batch-${runId}`);

        // Generate URLs for page range
        const urls: string[] = [];
        for (let page = startPage; page <= endPage; page++) {
            urls.push(getCategoryUrl(listingUrl, page));
        }

        console.log(`[SunWest Batch] Scraping pages ${startPage}-${endPage} (${totalPages} pages)`);

        // Crawl pages
        const crawler = new CheerioCrawler({
            requestQueue,
            async requestHandler({ $, request, log }) {
                // Extract page number from URL
                const url = new URL(request.url);
                const pageNum = url.searchParams.get('page') || '1';
                log.info(`[SunWest Batch] Page ${pageNum}: ${request.url}`);

                const products = extractProductsFromHTML($);
                log.info(`[SunWest Batch] Page ${pageNum}: Extracted ${products.length} products`);

                await dataset.pushData({ products, page: pageNum });

                // PROJECT REQUIREMENT: Wait 2-5 seconds between requests to same site
                const delayMs = Math.floor(Math.random() * 3000) + 2000; // Random 2000-5000ms
                log.info(`[SunWest Batch] Page ${pageNum}: Waiting ${delayMs}ms before next request (project requirement: 2-5 seconds)`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            },
            // PROJECT REQUIREMENT COMPLIANCE:
            maxRequestsPerMinute: 15, // Reduced to ensure 2-5 second delays are respected
            maxConcurrency: 1, // Sequential requests within same site (project requirement)
            maxRequestRetries: 3,
        });

        await crawler.run(urls);

        // Collect results from dataset
        const results = await dataset.getData();
        const allProducts: ProductCardDataFromCrawling[] = [];

        results.items.forEach((item) => {
            allProducts.push(...(item as { products: ProductCardDataFromCrawling[] }).products);
        });

        return {
            category: listingUrl,
            totalProducts: allProducts.length,
            totalPages: totalPages,
            products: allProducts,
            timestamp: new Date(),
            duration: Date.now() - startTime,
        };
    }
}