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
import { BASE_URL } from './constants';
import { ManualSelectors, SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';

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
// export class VancouverProductListScraper {
//     // private baseUrl: string;
    
//     constructor(private baseUrl: string = BASE_URL, private selectors: ManualSelectors) {
//         this.baseUrl = baseUrl;
//         this.selectors = selectors;
//     }

    /**
     * Scrape product listing with pagination support
     * 
     * @param listingUrl - Base URL of the listing page
     * @param maxPages - Maximum pages to scrape (0 = crawl all pages until no products found)
     */
    // export async function scrapeProductList(listingUrl: string, maxPages: number = 5): Promise<ProductsDataResultFromCrawling> {
    export async function vancouverProductListScraper(siteConfig: SiteConfig): Promise<ProductsDataResultFromCrawling> {

        const startTime = Date.now();

        const runId = Date.now();
        const datasetName = `vsb-${runId}`;
        const dataset = await Dataset.open(datasetName);
        const requestQueue = await RequestQueue.open(`vsb-queue-${runId}`);

        let actualPages = 0;
        const emptyPages = new Set<string>();

        const {selectors} = siteConfig

        const crawler = new CheerioCrawler({
            requestQueue,
            async requestHandler({ $, request, log }) {
                log.info(`[Product List] Scraping: ${request.url}`);

                // Extract products and pagination from current page
                const extractResult = extractProductsFromHTML($,selectors);
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

      // Cách xử lý maxPages chổ này? 

        // Discover total pages from pagination first
        // if (maxPages === 0) {
        //     apiLogger.info('[Product List] Auto-crawl mode: Detecting total pages from pagination...');
            
        //     // First, crawl page 1 to detect maxPages from pagination
        //     const firstPageUrl = getScrapingUrl(listingUrl, 1);
        //     await crawler.run([firstPageUrl]);
            
        //     // Check first page result to get maxPages
        //     const firstResults = await dataset.getData();
        //     const firstResult = firstResults.items[0] as { products: ProductCardDataFromCrawling[], maxPages: number };
            
        //     let detectedMaxPages = firstResult.maxPages;
        //     apiLogger.info(`[Product List] Detected ${detectedMaxPages} total pages from pagination`);
            
        //     // Now crawl remaining pages (2 to maxPages)
        //     const remainingUrls: string[] = [];
        //     for (let page = 2; page <= detectedMaxPages; page++) {
        //         remainingUrls.push(getScrapingUrl(listingUrl, page));
        //     }
            
        //     if (remainingUrls.length > 0) {
        //         apiLogger.info(`[Product List] Crawling remaining ${remainingUrls.length} pages...`);
        //         await crawler.run(remainingUrls);
        //     }
            
        //     actualPages = detectedMaxPages;
        // } else {
        //     // Fixed pages mode
        //     const urls: string[] = [];
        //     for (let page = 1; page <= maxPages; page++) {
        //         urls.push(getScrapingUrl(listingUrl, page));
        //     }
        //     await crawler.run(urls);
        //     actualPages = maxPages;
        // }

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


