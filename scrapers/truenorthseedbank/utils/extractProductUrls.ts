/**
 * TRUE NORTH SEED BANK PAGINATION CRAWLER (Cheerio Optimized)
 * Function extractProductUrls: Crawls all pagination pages and extracts product URLs
 * 
 * Strategy:
 * 1. Start with base shop URL (https://www.truenorthseedbank.com/cannabis-seeds)
 * 2. Detect total pages from pagination
 * 3. Crawl all pages sequentially (respecting robots.txt)
 * 4. Extract all product card links
 * 5. Return aggregated list of unique product URLs
 * 
 * Example:
 * - Input: https://www.truenorthseedbank.com/cannabis-seeds/feminized-seeds
 * - Process: Crawl page 1, 2, 3...60+
 * - Output: ~1400+ product URLs
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
const LOG_PREFIX = '[True North extractProductUrls]';

/**
 * PRODUCT CARD SELECTORS
 * Based on Magento 2 product listing structure
 * 
 * HTML Structure:
 * <div class="product-item">
 *   <div class="product-item-info">
 *     <a href="/product-url" class="product-item-photo">
 *     <a href="/product-url" class="product-item-name">
 *   </div>
 * </div>
 */
const PRODUCT_CARD_SELECTORS = {
    /**
     * Product card container selector
     */
    productCard: '.product-item',
    
    /**
     * Product link selectors (multiple locations for fallback)
     * Priority order:
     * 1. Image link in product-item-photo
     * 2. Title link in product-item-name
     * 3. Generic 'a' tag as last resort
     */
    productLinkTop: '.product-item-photo a',
    productLinkTitle: '.product-item-name a, .product-name a',
    productLinkFallback: 'a[href*="/product"]',
} as const;

/**
 * PAGINATION SELECTORS
 * Based on Magento 2 pagination structure
 * 
 * Example HTML from scrapers/truenorthseedbank/materials/pagination-product-per-page.html:
 * <div class="pages">
 *   <ul class="items pages-items">
 *     <li class="item"><a href="...?p=8" class="page"><span>8</span></a></li>
 *     <li class="item"><a href="...?p=9" class="page"><span>9</span></a></li>
 *     <li class="item current"><strong class="page"><span>10</span></strong></li>
 *     <li class="item"><a href="...?p=11" class="page"><span>11</span></a></li>
 *   </ul>
 * </div>
 * 
 * IMPORTANT: True North Seed Bank uses LAZY PAGINATION (same as Canuk Seeds)
 * - Only shows ~5 pages at a time (nearby current page)
 * - When on page 1: shows 1, 2, 3, 4, 5
 * - When on page 5: shows 3, 4, 5, 6, 7
 * - Cannot detect total pages from pagination alone!
 * 
 * SOLUTION: Use product count to calculate total pages
 * - Total items: <p class="toolbar-amount"><span class="toolbar-number">1479</span> items</p>
 * - Items per page: <select id="limiter"><option selected="selected">24</option></select>
 * - Formula: totalPages = ceil(totalItems / itemsPerPage)
 * 
 * Note: Actual URLs use query parameter format:
 * https://www.truenorthseedbank.com/cannabis-seeds/feminized-seeds?p=2
 */
const PAGINATION_SELECTORS = {
    /**
     * Page number links (excluding prev/next/current/dots)
     * Used to detect total pages by finding highest page number (FALLBACK only)
     */
    pageLinks: '.pages .items.pages-items .item:not(.pages-item-previous):not(.pages-item-next):not(.current) a.page',
    
    /**
     * Total product count selector
     * HTML: <p class="toolbar-amount"><span class="toolbar-number">971</span> items</p>
     */
    totalItemsSelector: '.toolbar-amount .toolbar-number',
    
    /**
     * Items per page selector (selected option in limiter dropdown)
     * HTML: <select id="limiter"><option value="24" selected="selected">24</option></select>
     */
    itemsPerPageSelector: '#limiter option[selected="selected"]',
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
        
        apiLogger.info(`${LOG_PREFIX} Starting pagination crawl from: ${scrapingSourceUrl}`);

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

        apiLogger.info(`${LOG_PREFIX} Rate limiting:`, {
            crawlDelay: `${crawlDelay}ms`,
            maxRequestsPerMinute,
            source: hasExplicitCrawlDelay ? 'robots.txt' : 'default'
        });

        // Create CheerioCrawler to crawl pagination pages
        const crawler = new CheerioCrawler({
            requestQueue,
            async requestHandler({ $, request, log }) {
                log.info(`${LOG_PREFIX} Processing pagination page: ${request.url}`);

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

                log.info(`${LOG_PREFIX} Found ${pageProductUrls.length} products on page`);

                // Detect total pages from pagination (only on first page)
                if (pagesProcessed === 0) {
                    totalPages = detectTotalPages($);
                    log.info(`${LOG_PREFIX} Detected ${totalPages} total pages`);

                    // 🧪 TEST MODE: Limit pages if maxPagesToTest is specified
                    if (maxPagesToTest && maxPagesToTest > 0) {
                        totalPages = Math.min(totalPages, maxPagesToTest);
                        log.info(`${LOG_PREFIX} 🧪 TEST MODE: Limited to ${totalPages} pages`);
                    }

                    // Add remaining pages to queue with query parameter format
                    // URL format: https://www.canukseeds.com/buy-canuk-seeds?p=X
                    for (let page = 2; page <= totalPages; page++) {
                        const pageUrl = buildPaginationUrl(scrapingSourceUrl, page);
                        await requestQueue.addRequest({ url: pageUrl });
                    }
                    
                    log.info(`${LOG_PREFIX} Added ${totalPages - 1} pagination pages to queue (page 2 to ${totalPages})`);
                }

                pagesProcessed++;

                // ✅ No need to save to dataset - we're collecting in allProductUrls Set
                log.info(`${LOG_PREFIX} Progress: ${pagesProcessed}/${totalPages} pages processed, ${allProductUrls.size} unique products found`);
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

        apiLogger.info(`${LOG_PREFIX} Starting crawler...`);
        
        try {
            await crawler.run();
        } finally {
            // ✅ Cleanup: Drop request queue to free up memory/storage
            try {
                await requestQueue.drop();
                apiLogger.debug(`${LOG_PREFIX} Cleaned up request queue: ${queueName}`);
            } catch (cleanupError) {
                apiLogger.logError(`${LOG_PREFIX} Failed to cleanup request queue:`, cleanupError as Error, {
                    queueName
                });
            }
        }

        // Convert Set to Array
        const productUrlsArray = Array.from(allProductUrls);

        apiLogger.info(`${LOG_PREFIX} ✅ Crawl completed:`, {
            totalPages: pagesProcessed,
            totalProducts: productUrlsArray.length,
            uniqueProducts: allProductUrls.size
        });

        // Log sample URLs
        if (productUrlsArray.length > 0) {
            apiLogger.info(`${LOG_PREFIX} Sample URLs:`, {
                first: productUrlsArray[0],
                last: productUrlsArray[productUrlsArray.length - 1],
                total: productUrlsArray.length
            });
        }

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
 * True North Seed Bank uses query parameter format for pagination:
 * - Base: https://www.truenorthseedbank.com/cannabis-seeds/feminized-seeds
 * - Page 2: https://www.truenorthseedbank.com/cannabis-seeds/feminized-seeds?p=2
 * - Page 3: https://www.truenorthseedbank.com/cannabis-seeds/feminized-seeds?p=3
 * 
 * @param baseUrl - Base shop URL (may already have query parameters)
 * @param pageNumber - Page number to navigate to
 * @returns Pagination URL with p query parameter
 */
function buildPaginationUrl(baseUrl: string, pageNumber: number): string {
    try {
        const url = new URL(baseUrl);
        
        // Add or update 'p' parameter
        url.searchParams.set('p', pageNumber.toString());
        
        return url.toString();
    } catch (error) {
        // Fallback: if URL parsing fails, use simple query string append
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}p=${pageNumber}`;
    }
}

/**
 * Detect total number of pages from pagination
 * 
 * Strategy: Calculate from total product count (more reliable for lazy pagination)
 * Canuk Seeds uses lazy pagination - only shows nearby pages, not all at once
 * 
 * Fallback: Parse pagination HTML to find the highest visible page number
 * 
 * @param $ - Cheerio instance loaded with HTML
 * @returns Total number of pages
 */
function detectTotalPages($: any): number {
    // PRIMARY STRATEGY: Calculate from total product count and items per page
    const totalItemsText = $(PAGINATION_SELECTORS.totalItemsSelector).first().text().trim();
    const itemsPerPageText = $(PAGINATION_SELECTORS.itemsPerPageSelector).first().text().trim();
    
    if (totalItemsText) {
        const totalItems = parseInt(totalItemsText, 10);
        
        if (!isNaN(totalItems) && totalItems > 0) {
            // Try to get dynamic items per page from selector
            let itemsPerPage = 24; // Default fallback
            
            if (itemsPerPageText) {
                const parsedItemsPerPage = parseInt(itemsPerPageText, 10);
                if (!isNaN(parsedItemsPerPage) && parsedItemsPerPage > 0) {
                    itemsPerPage = parsedItemsPerPage;
                }
            }
            
            const calculatedPages = Math.ceil(totalItems / itemsPerPage);
            
            apiLogger.debug(`${LOG_PREFIX} Detected ${calculatedPages} total pages from product count (${totalItems} items ÷ ${itemsPerPage} per page)`);
            
            return calculatedPages;
        }
    }
    
    // FALLBACK STRATEGY: Parse visible pagination links (less reliable with lazy pagination)
    apiLogger.warn(`${LOG_PREFIX} Could not detect total items, falling back to pagination links (may be incomplete)`);
    
    let maxPage = 1;
    
    // Parse all page number links from pagination
    $(PAGINATION_SELECTORS.pageLinks).each((_: any, element: any) => {
        // Extract text from nested <span> element
        const pageText = $(element).find('span').last().text().trim();
        
        // Skip if text is dots/ellipsis or label text
        if (pageText === '…' || pageText === '...' || pageText === '....' || pageText.toLowerCase() === 'page') {
            return; // continue
        }
        
        const pageNum = parseInt(pageText, 10);
        if (!isNaN(pageNum) && pageNum > maxPage) {
            maxPage = pageNum;
        }
    });

    // Also check current page
    const currentPageText = $('.pages .items.pages-items .item.current strong.page span').last().text().trim();
    if (currentPageText) {
        const currentPageNum = parseInt(currentPageText, 10);
        if (!isNaN(currentPageNum) && currentPageNum > maxPage) {
            maxPage = currentPageNum;
        }
    }

    apiLogger.debug(`${LOG_PREFIX} Detected ${maxPage} total pages from pagination links (FALLBACK - may be incomplete due to lazy pagination)`);
    
    return maxPage;
}