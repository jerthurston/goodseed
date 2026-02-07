/**
 * Rocket Seeds Product List Scraper (Refactored with CommonCrawler)
 * 
 * KIẾN TRÚC TỔNG QUAN:
 * - Uses CommonCrawler infrastructure for reusability
 * - Focuses only on Rocket Seeds-specific extraction logic
 * - Uses icon-based extraction from specification_individual blocks
 * - All common functionality delegated to CommonCrawler
 * 
 * DIFFERENCES FROM MJ SEEDS CANADA:
 * - Uses specification_individual structure instead of specifications table
 * - Icon-based field targeting for cannabis data
 * - pvtfw_variant_table_block for pricing extraction
 */

import { extractProductFromDetailHTML, extractProductUrlsFromSitemap } from '@/scrapers/rocketseeds/utils/index';
import { ProductCardDataFromCrawling, ProductsDataResultFromCrawling } from '@/types/crawl.type';
import { CheerioAPI, CheerioCrawler, CheerioCrawlingContext, ErrorHandler, Log, RequestQueue, Dataset, Dictionary } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger'
;
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';

/**
 * RocketSeedsProductListScraper - Site-specific implementation using CommonCrawler
 * 
 * NHIỆM VỤ:
 * 1. 🕷️ Extract sản phẩm từ Rocket Seeds (product listing pages)  
 * 2. 📄 Hỗ trợ sitemap-based URL extraction
 * 3. 📋 Extract cannabis-specific data với specification_individual structure
 * 4. ⚡ Sử dụng CommonCrawler infrastructure với icon-based targeting
 */

export async function RocketSeedsScraper(
    siteConfig: SiteConfig,
    startPage?: number | null,
    endPage?: number | null,
    sourceContext?: {
        scrapingSourceUrl: string;
        sourceName: string;
        dbMaxPage: number;
    }
): Promise<ProductsDataResultFromCrawling> {

    const startTime = Date.now();
    const { baseUrl } = siteConfig;

    // Debug log
    apiLogger.debug('[Rocket Seeds Scraper] Starting with siteConfig', {
        name: siteConfig.name,
        baseUrl,
        isImplemented: siteConfig.isImplemented,
        scrapingSourceUrl: sourceContext?.scrapingSourceUrl
    });

    if (!sourceContext?.scrapingSourceUrl) {
        throw new Error('[Rocket Seeds Scraper] scrapingSourceUrl is required in sourceContext');
    }

    // Initialize request queue
    const runId = Date.now();
    const requestQueue = await RequestQueue.open(`rocket-seeds-queue-${runId}`);
    
    // Initialize dataset
    const datasetName = `rocketseeds-${runId}`;
    const dataset = await Dataset.open(datasetName);
    
    // Initialize polite crawler policy
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: USERAGENT,
        acceptLanguage: ACCEPTLANGUAGE
    });

    // ✅ Parse robots.txt FIRST for polite crawling compliance
    const robotsRules = await politeCrawler.parseRobots(baseUrl);
    const { crawlDelay, disallowedPaths, allowedPaths, hasExplicitCrawlDelay } = robotsRules;

    apiLogger.info(`[Rocket Seeds] Robots.txt rules loaded:`, {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        disallowedCount: disallowedPaths.length,
        allowedCount: allowedPaths.length,
        userAgent: USERAGENT
    });

    let actualPages = 0;
    let productUrls: string[] = [];
    let urlsToProcess: string[] = [];
    
    // Step 1: Extract and filter product URLs
    try {
        productUrls = await extractProductUrlsFromSitemap(sourceContext.scrapingSourceUrl);

        apiLogger.info(`[Rocket Seeds] Extracted ${productUrls.length} product URLs from sitemap`);

        // ✅ Filter URLs against robots.txt BEFORE adding to queue
        const allowedUrls: string[] = [];
        const blockedUrls: string[] = [];
        
        for (const url of productUrls) {
            const urlPath = new URL(url).pathname;
            
            // Check if URL is allowed by robots.txt
            let isAllowed = true;
            for (const disallowedPath of disallowedPaths) {
                if (urlPath.startsWith(disallowedPath)) {
                    isAllowed = false;
                    blockedUrls.push(url);
                    break;
                }
            }
            
            if (isAllowed) {
                allowedUrls.push(url);
            }
        }
        
        apiLogger.info(`[Rocket Seeds] Robots.txt filtering results:`, { 
            total: productUrls.length, 
            allowed: allowedUrls.length, 
            blocked: blockedUrls.length 
        });
        
        // Use filtered URLs
        urlsToProcess = allowedUrls;

        // Calculate number of products to process based on startPage and endPage
        // Chỉ áp dụng cho mode = test. Chỉ test 5 productUrl (startPage = 1, và endPage = 6. số lượng 5 url)
        if (startPage !== null && startPage !== undefined && endPage !== null && endPage !== undefined) {
            const pageRange = endPage - startPage;
            const limitedCount = Math.max(1, pageRange); // Ensure at least 1 product
            urlsToProcess = allowedUrls.slice(0, limitedCount);
            
            apiLogger.info(`[Rocket Seeds] Limited processing to ${limitedCount} products (startPage: ${startPage}, endPage: ${endPage}, range: ${pageRange})`);
        }
        // ==== Code này dành cho Quick testing scraper.

        // Add filtered URLs to queue for crawling
        for (const productUrl of urlsToProcess) {
            await requestQueue.addRequest({
                url: productUrl,
                userData: { type: 'product' }
            });
        }

    } catch (error) {
        apiLogger.logError('[Rocket Seeds] Failed to load sitemap:', {
            error,
            sitemapUrl: sourceContext.scrapingSourceUrl
        });
        throw new Error(`Failed to load sitemap: ${error}`);
    }

    // Step 2: Request handler (URLs already filtered, no redundant checks)
    async function rocketSeedsRequestHandler(context: CheerioCrawlingContext): Promise<void> {
        const {
            $,
            request,
            log 
        }: {
            $: CheerioAPI;
            request: CheerioCrawlingContext['request'];
            log: Log;
        } = context;

        // ✅ URLs already filtered by robots.txt, no need for isAllowed() check
        // Extract product data from detail product page
        if (request.userData?.type === 'product') {
            const product = extractProductFromDetailHTML($, siteConfig, request.url);
            if (product) {
                /**
                 * Rocket Seeds product structure with icon-based extraction:
                 * - THC/CBD from specification_individual with icons
                 * - Cannabis type from strain-types-1.jpg icon
                 * - Genetics from igenetics_img.png icon  
                 * - Flowering time from marijuana.png icon
                 * - Yield info from indoor/outdoor yield icons
                 * - Pricing from pvtfw_variant_table_block
                 */
                // Save product to dataset
                await dataset.pushData({
                    product,
                    url: request.url,
                    extractedAt: new Date().toISOString()
                });
                // Increment actual pages count
                actualPages++;
            }
        }

        // ✅ Use parsed crawlDelay value (no need to call getCrawlDelay() per request)
        await new Promise(resolve => setTimeout(resolve, crawlDelay));
    }

    // Step 3: Error handling
    const rocketSeedsErrorHandler: ErrorHandler<CheerioCrawlingContext> = async (context: CheerioCrawlingContext, error: Error): Promise<void> => {
        const { request, log }: {
            request: CheerioCrawlingContext['request'];
            log: Log;
        } = context;

        // POLITE CRAWLING: Handle HTTP status codes properly
        const httpsError = error as any;
        if (httpsError?.response?.status) {
            const statusCode: number = httpsError.response.status;
            const shouldRetry: boolean = politeCrawler.shouldRetryOnStatus(statusCode);

            if (shouldRetry) {
                const backoffDelay: number = await politeCrawler.handleHttpStatus(statusCode, request.url);
                log.info(`[Rocket Seeds Scraper] HTTP ${statusCode} for ${request.url}, backing off for ${backoffDelay}ms`);

                await new Promise<void>(resolve => setTimeout(resolve, backoffDelay));
                throw error;
            } else {
                log.error(`[Rocket Seeds Scraper] HTTP ${statusCode} for ${request.url}, not retrying`);
                throw error;
            }
        }
    };

    // ✅ Step 4: Calculate dynamic rate limiting based on robots.txt
    const calculatedMaxRate = hasExplicitCrawlDelay 
        ? Math.floor(60000 / crawlDelay)
        : 15; // Default 15 req/min if no explicit delay
    
    apiLogger.info(`[Rocket Seeds] Dynamic rate limiting:`, {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        maxRequestsPerMinute: calculatedMaxRate
    });

    // Step 5: Create and run crawler with optimized configuration
    const crawler = new CheerioCrawler({
        requestQueue,
        requestHandler: rocketSeedsRequestHandler,
        errorHandler: rocketSeedsErrorHandler,
        maxConcurrency: 1, // Sequential requests for polite crawling
        maxRequestsPerMinute: calculatedMaxRate, // ✅ Dynamic rate based on robots.txt
        maxRequestRetries: 3,
        preNavigationHooks: [
            async (requestAsBrowserOptions) => {
                const headers = politeCrawler.getHeaders();
                Object.assign(requestAsBrowserOptions.headers || {}, headers);
            }
        ]
    });

    // Step 6: Run main crawler
    apiLogger.info(`[Rocket Seeds] Starting main crawler...`);
    await crawler.run();

    // Step 7: Extract products and log summary
    const products = (await dataset.getData()).items.map(item => item.product);
    const endTime = Date.now();
    const duration = endTime - startTime;

    apiLogger.info(`[Rocket Seeds] ✅ Scraping completed successfully:`, {
        scraped: products.length,
        saved: actualPages,
        duration: `${(duration / 1000).toFixed(2)}s`,
        robotsCompliance: {
            crawlDelay: `${crawlDelay}ms`,
            hasExplicitCrawlDelay,
            maxRequestsPerMinute: calculatedMaxRate,
            urlsFiltered: productUrls.length - urlsToProcess.length,
            urlsProcessed: urlsToProcess.length
        }
    });
    
    return {
        totalProducts: products.length,
        totalPages: actualPages,
        products,
        timestamp: new Date(),
        duration
    };
}

export default RocketSeedsScraper;