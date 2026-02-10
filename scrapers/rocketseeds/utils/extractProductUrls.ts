/**
 * ROCKET SEEDS PAGINATION CRAWLER (Cheerio Optimized)
 * Function extractProductUrls: Crawls all pagination pages and extracts product URLs
 * 
 * Strategy:
 * 1. Start with base shop URL (https://rocketseeds.com/shop/)
 * 2. Detect total pages from pagination
 * 3. Crawl all pages sequentially (respecting robots.txt)
 * 4. Extract all product card links
 * 5. Return aggregated list of unique product URLs
 * 
 * Example:
 * - Input: https://rocketseeds.com/shop/
 * - Process: Crawl page 1, 2, 3...39
 * - Output: ~624 product URLs (39 pages × ~16 products/page)
 * 
 * OPTIMIZATION (v2):
 * - ✅ Removed Dataset (unnecessary intermediate storage)
 * - ✅ Uses Set<string> for automatic URL deduplication
 * - ✅ Keeps RequestQueue for crawl state management
 * - ✅ Automatic cleanup to free memory
 */

import { apiLogger } from "@/lib/helpers/api-logger";
import { RobotsRules, SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { USERAGENT } from "@/scrapers/(common)/constants";
import { CheerioCrawler, RequestQueue } from 'crawlee';

// ========================================
// CONFIGURATION CONSTANTS (Top of file for easy management and testing)
// ========================================

/**
 * Default rate limiting fallback when robots.txt doesn't specify crawl-delay
 */
const DEFAULT_MAX_REQUESTS_PER_MINUTE = 15;

/**
 * Base domain for constructing absolute URLs
 */
// const SITE_BASE_URL = 'https://rocketseeds.com';

/**
 * Logging prefix for consistent log messages
 */
const LOG_PREFIX = '[Rocket Seeds extractProductUrls]';

/**
 * PRODUCT CARD SELECTORS
 * Based on actual HTML structure from scrapers/rocketseeds/materials/product-card.html
 * 
 * HTML Structure:
 * <div class="slidermn_best_seller_in">
 *   <div class="slidermn_best_seller_in_top">
 *     <figure class="main_img">
 *       <a href="https://rocketseeds.com/product/space-cookies-autoflower-marijuana-seeds/">
 *     </figure>
 *   </div>
 *   <div class="slidermn_best_seller_in_btm">
 *     <h3 class="woocommerce-loop-product__title">
 *       <a href="https://rocketseeds.com/product/space-cookies-autoflower-marijuana-seeds/">
 *     </h3>
 *   </div>
 * </div>
 */
const PRODUCT_CARD_SELECTORS = {
    /**
     * Product card container selector
     */
    productCard: '.slidermn_best_seller_in',
    
    /**
     * Product link selectors (multiple locations for fallback)
     * Priority order:
     * 1. Image link in top section
     * 2. Title link in bottom section
     * 3. Generic 'a' tag as last resort
     */
    productLinkTop: '.slidermn_best_seller_in_top figure.main_img a',
    productLinkTitle: '.slidermn_best_seller_in_btm h3.woocommerce-loop-product__title a',
    productLinkFallback: 'a[href*="/product/"]',
} as const;

/**
 * PAGINATION SELECTORS
 * Based on WordPress standard pagination structure
 * 
 * Example HTML from scrapers/rocketseeds/materials/pagination.html:
 * <nav class="woocommerce-pagination">
 *   <ul class="page-numbers">
 *     <li><span class="page-numbers current">1</span></li>
 *     <li><a class="page-numbers" href="...?paged=2">2</a></li>
 *     <li><a class="page-numbers" href="...?paged=39">39</a></li>
 *   </ul>
 * </nav>
 * 
 * Note: Actual URLs use query parameter format:
 * https://rocketseeds.com/shop?swoof=1&product_brand=rocketseeds&paged=2
 */
const PAGINATION_SELECTORS = {
    /**
     * Page number links (excluding prev/next/current/dots)
     * Used to detect total pages by finding highest page number
     */
    pageLinks: '.page-numbers:not(.prev):not(.next):not(.current):not(.dots)',
} as const;

// ========================================
// MAIN FUNCTION
// ========================================

/**
 * Extract product URLs from ALL pagination pages using CheerioCrawler
 * 
 * @param scrapingSourceUrl - Base shop URL (e.g., https://rocketseeds.com/shop/)
 * @param politeCrawler - SimplePoliteCrawler instance for polite crawling
 * @param maxPagesToTest - Optional: Limit pages to crawl for testing (default: all pages)
 * @returns Promise<string[]> - Array of unique product URLs
 */
export async function extractProductUrls(
    sourceContext: {
        scrapingSourceUrl: string;
        sourceName: string;
        dbMaxPage: number;
    },
    maxPagesToTest: number | undefined,
    robotsRules: RobotsRules,
    headers:Record<string,string>,
    baseUrl:string
): Promise<string[]> {
    try {

        const { scrapingSourceUrl, sourceName, dbMaxPage } = sourceContext;
        
        apiLogger.crawl('URL extraction starting', {
            seller: sourceName,
            url: scrapingSourceUrl
        });

        const runId = Date.now();
        const queueName = `${sourceName}-url-queue-${runId}`;
        const requestQueue = await RequestQueue.open(queueName);

        const allProductUrls = new Set<string>();
        let totalPages = 1;
        let pagesProcessed = 0;
       
        const { crawlDelay, hasExplicitCrawlDelay } = robotsRules;
        
        // Calculate max requests per minute based on robots.txt
        const maxRequestsPerMinute = hasExplicitCrawlDelay 
            ? Math.floor(60000 / crawlDelay)
            : DEFAULT_MAX_REQUESTS_PER_MINUTE;

        apiLogger.crawl('Rate limiting configured', {
            crawlDelay: `${crawlDelay}ms`,
            maxRequestsPerMinute,
            source: hasExplicitCrawlDelay ? 'robots.txt' : 'default',
            seller: sourceName
        });

        // Create CheerioCrawler to crawl pagination pages
        const crawler = new CheerioCrawler({
            requestQueue,
            async requestHandler({ $, request }) {
                // Removed verbose log.info statements to reduce memory usage
                
                // Extract product links from current page using selectors
                const pageProductUrls: string[] = [];

                // Find all product cards
                $(PRODUCT_CARD_SELECTORS.productCard).each((_, element) => {
                    const $card = $(element);
                    
                    // Try multiple selectors in priority order for robustness
                    let productLink = $card.find(PRODUCT_CARD_SELECTORS.productLinkTop).first().attr('href');
                    
                    if (!productLink) {
                        productLink = $card.find(PRODUCT_CARD_SELECTORS.productLinkTitle).first().attr('href');
                    }
                    
                    if (!productLink) {
                        productLink = $card.find(PRODUCT_CARD_SELECTORS.productLinkFallback).first().attr('href');
                    }

                    if (productLink) {
                        // Ensure absolute URL
                        const absoluteUrl = productLink.startsWith('http') 
                            ? productLink 
                            : `${baseUrl}${productLink.startsWith('/') ? '' : '/'}${productLink}`;
                        
                        pageProductUrls.push(absoluteUrl);
                        allProductUrls.add(absoluteUrl);
                    }
                });

                // Detect total pages from pagination (only on first page)
                if (pagesProcessed === 0) {
                    totalPages = detectTotalPages($);
                    apiLogger.crawl('Pagination detected', {
                        totalPages,
                        seller: sourceName
                    });

                    // 🧪 TEST MODE: Limit pages if maxPagesToTest is specified
                    if (maxPagesToTest && maxPagesToTest > 0) {
                        totalPages = Math.min(totalPages, maxPagesToTest);
                        apiLogger.crawl('Test mode enabled', {
                            limitedPages: totalPages,
                            seller: sourceName
                        });
                    }

                    // Add remaining pages to queue with query parameter format
                    for (let page = 2; page <= totalPages; page++) {
                        const pageUrl = buildPaginationUrl(scrapingSourceUrl, page);
                        await requestQueue.addRequest({ url: pageUrl });
                    }
                }

                pagesProcessed++;
            },
            maxConcurrency: 1, // Sequential crawling for politeness
            maxRequestsPerMinute,
            maxRequestRetries: 3,
            preNavigationHooks: [
                async (crawlingContext, requestAsBrowserOptions) => {
                    // Add polite headers
                    Object.assign(requestAsBrowserOptions.headers || {}, headers);
                }
            ]
        });

        // Start crawling from first page
        const firstPageUrl = scrapingSourceUrl.endsWith('/') 
            ? scrapingSourceUrl 
            : `${scrapingSourceUrl}/`;

        await requestQueue.addRequest({ url: firstPageUrl });
        
        try {
            await crawler.run();
        } finally {
            // ✅ Cleanup: Drop request queue to free up memory/storage
            try {
                await requestQueue.drop();
                // Removed debug log for cleanup (not critical)
            } catch (cleanupError) {
                apiLogger.logError(`${LOG_PREFIX} Failed to cleanup request queue:`, cleanupError as Error, {
                    queueName
                });
            }
        }

        // Convert Set to Array
        const productUrlsArray = Array.from(allProductUrls);

        apiLogger.crawl('URL extraction completed', {
            seller: sourceName,
            totalPages: pagesProcessed,
            totalProducts: productUrlsArray.length
        });

        return productUrlsArray;

    } catch (error) {
        apiLogger.logError(`${LOG_PREFIX} Fatal error:`, error as Error, {
            url: sourceContext?.scrapingSourceUrl
        });
        return [];
    }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Build pagination URL with query parameter format
 * 
 * Rocket Seeds uses query parameter format for pagination:
 * - Base: https://rocketseeds.com/shop?swoof=1&product_brand=rocketseeds
 * - Page 2: https://rocketseeds.com/shop?swoof=1&product_brand=rocketseeds&paged=2
 * - Page 3: https://rocketseeds.com/shop?swoof=1&product_brand=rocketseeds&paged=3
 * 
 * @param baseUrl - Base shop URL (may already have query parameters)
 * @param pageNumber - Page number to navigate to
 * @returns Pagination URL with paged query parameter
 */
function buildPaginationUrl(baseUrl: string, pageNumber: number): string {
    try {
        const url = new URL(baseUrl);
        
        // Add or update 'paged' parameter
        url.searchParams.set('paged', pageNumber.toString());
        
        return url.toString();
    } catch (error) {
        // Fallback: if URL parsing fails, use simple query string append
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}paged=${pageNumber}`;
    }
}

/**
 * Detect total number of pages from pagination
 * 
 * Strategy: Parse pagination HTML to find the highest page number
 * Pagination structure always shows last page: 1, 2, 3, 4, ..., 37, 38, 39
 * 
 * @param $ - Cheerio instance loaded with HTML
 * @returns Total number of pages
 */
function detectTotalPages($: any): number {
    let maxPage = 1;
    
    // Parse all page number links from pagination
    $(PAGINATION_SELECTORS.pageLinks).each((_: any, element: any) => {
        const pageText = $(element).text().trim();
        
        // Skip if text is dots/ellipsis
        if (pageText === '…' || pageText === '...' || pageText === '....') {
            return; // continue
        }
        
        const pageNum = parseInt(pageText, 10);
        if (!isNaN(pageNum) && pageNum > maxPage) {
            maxPage = pageNum;
        }
    });

    // Removed debug log - not critical for production
    return maxPage;
}