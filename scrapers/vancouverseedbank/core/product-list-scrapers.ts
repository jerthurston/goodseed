/**
 * Vancouver Seed Bank Product List Scraper (Cheerio - Standard Pagination)
 * 
 * Uses Cheerio for fast HTML parsing with WooCommerce standard pagination
 */

import { extractProductsFromHTML } from '@/scrapers/vancouverseedbank/utils/extractProductsFromHTML';
import { ProductsDataResultFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { CheerioCrawler, Dataset, RequestQueue } from 'crawlee';
import { VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS } from './selectors';
import { getScrapingUrl } from '../utils/getScrapingUrl';

/**
 * ProductListScraper
 * 
 * Nhiệm vụ chính:
 * 1. Crawl danh sách sản phẩm từ Vancouver Seed Bank (product listing pages)
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
 * - Để lưu DB, dùng VancouverSeedBankDbService
 * - Để crawl theo batch, dùng scrape-batch.ts script
 * 
 * VancouverSeedBankProductListScraper
    │
    ├─> Fetch page 1, 2, 3... (CheerioCrawler)
    │
    └─> Mỗi page gọi extractProductsFromHTML($)
            │
            └─> Parse HTML → return products[]
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
    async scrapeProductList(listingUrl: string, maxPages: number = 5): Promise<ProductsDataResultFromCrawling> {
        const startTime = Date.now();

        const runId = Date.now();
        const datasetName = `vsb-${runId}`;
        const dataset = await Dataset.open(datasetName);
        const requestQueue = await RequestQueue.open(`vsb-queue-${runId}`);

        let actualPages = 0;
        const emptyPages = new Set<string>();

        const crawler = new CheerioCrawler({
            requestQueue,
            async requestHandler({ $, request, log }) {
                log.info(`[Product List] Scraping: ${request.url}`);

                // Extract products and pagination from current page
                const extractResult = extractProductsFromHTML($);
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
                const hasNextPage = $(VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS.nextPage).length > 0;
                log.info(`[Product List] Has next page: ${hasNextPage}`);

                await dataset.pushData({ products, url: request.url, hasNextPage });

                // PROJECT REQUIREMENT: Wait 2-5 seconds between requests to same site
                const delayMs = Math.floor(Math.random() * 3000) + 2000; // Random 2000-5000ms
                log.info(`[Product List] Waiting ${delayMs}ms before next request (project requirement: 2-5 seconds)`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            },

            maxRequestsPerMinute: 15, // Reduced to ensure 2-5 second delays are respected
            maxConcurrency: 1, // Sequential requests within same site (project requirement)
            maxRequestRetries: 3,
        });

        // Auto-crawl mode: discover total pages from pagination first
        if (maxPages === 0) {
            console.log('[Product List] Auto-crawl mode: Detecting total pages from pagination...');
            
            // First, crawl page 1 to detect maxPages from pagination
            const firstPageUrl = getScrapingUrl(listingUrl, 1);
            await crawler.run([firstPageUrl]);
            
            // Check first page result to get maxPages
            const firstResults = await dataset.getData();
            const firstResult = firstResults.items[0] as { products: ProductCardDataFromCrawling[], maxPages: number | null };
            
            let detectedMaxPages = firstResult.maxPages || 50; // fallback to 50 if not detected
            console.log(`[Product List] Detected ${detectedMaxPages} total pages from pagination`);
            
            // Now crawl remaining pages (2 to maxPages)
            const remainingUrls: string[] = [];
            for (let page = 2; page <= detectedMaxPages; page++) {
                remainingUrls.push(getScrapingUrl(listingUrl, page));
            }
            
            if (remainingUrls.length > 0) {
                console.log(`[Product List] Crawling remaining ${remainingUrls.length} pages...`);
                await crawler.run(remainingUrls);
            }
            
            actualPages = detectedMaxPages;
        } else {
            // Fixed pages mode
            const urls: string[] = [];
            for (let page = 1; page <= maxPages; page++) {
                urls.push(getScrapingUrl(listingUrl, page));
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
            // category: listingUrl,
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

    // TẠM THỜI SCRAPE THEO BATCH SẼ CHƯA SỬ DỤNG, CHỈ DÙNG ĐỂ THỬ NGIỆM
    // async scrapeProductListByBatch(
    //     listingUrl: string,
    //     startPage: number,
    //     endPage: number
    // ): Promise<ProductsDataResultFromCrawling> {
    //     if (startPage < 1 || endPage < startPage) {
    //         throw new Error(`Invalid page range: ${startPage}-${endPage}. Start must be >= 1 and end must be >= start.`);
    //     }

    //     const startTime = Date.now();
    //     const totalPages = endPage - startPage + 1;

    //     const runId = Date.now();
    //     const datasetName = `vsb-batch-${runId}`;
    //     const dataset = await Dataset.open(datasetName);
    //     const requestQueue = await RequestQueue.open(`vsb-queue-batch-${runId}`);

    //     // Generate URLs for page range
    //     const urls: string[] = [];
    //     for (let page = startPage; page <= endPage; page++) {
    //         urls.push(getScrapingUrl(listingUrl, page));
    //     }

    //     console.log(`[Batch] Scraping pages ${startPage}-${endPage} (${totalPages} pages)`);

    //     // Crawl pages
    //     const crawler = new CheerioCrawler({
    //         requestQueue,
    //         async requestHandler({ $, request, log }) {
    //             const pageNum = request.url.match(/pagenum\/(\d+)/)?.[1] || '1';
    //             log.info(`[Batch] Page ${pageNum}: ${request.url}`);

    //             const extractResult = extractProductsFromHTML($);
    //             const products = extractResult.products;
    //             log.info(`[Batch] Page ${pageNum}: Extracted ${products.length} products`);

    //             await dataset.pushData({ products, page: pageNum });

    //             // PROJECT REQUIREMENT: Wait 2-5 seconds between requests to same site
    //             const delayMs = Math.floor(Math.random() * 3000) + 2000; // Random 2000-5000ms
    //             log.info(`[Batch] Page ${pageNum}: Waiting ${delayMs}ms before next request (project requirement: 2-5 seconds)`);
    //             await new Promise(resolve => setTimeout(resolve, delayMs));
    //         },
    //         maxRequestsPerMinute: 15, // Reduced to ensure 2-5 second delays are respected
    //         maxConcurrency: 1, // Sequential requests within same site (project requirement)
    //         maxRequestRetries: 3,
    //     });

    //     await crawler.run(urls);

    //     // Collect results from dataset
    //     const results = await dataset.getData();
    //     const allProducts: ProductCardDataFromCrawling[] = [];

    //     results.items.forEach((item) => {
    //         allProducts.push(...(item as { products: ProductCardDataFromCrawling[] }).products);
    //     });

    //     return {
    //         // category: listingUrl,
    //         totalProducts: allProducts.length,
    //         totalPages: totalPages,
    //         products: allProducts,
    //         timestamp: new Date(),
    //         duration: Date.now() - startTime,
    //     };
    // }
}


