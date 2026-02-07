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

import { extractProductFromDetailHTML, extractProductUrls } from '@/scrapers/rocketseeds/utils/index';
import { ProductCardDataFromCrawling, ProductsDataResultFromCrawling } from '@/types/crawl.type';
import { CheerioAPI, CheerioCrawler, CheerioCrawlingContext, ErrorHandler, Log, RequestQueue, Dataset, Dictionary } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';

/**
 * Filter URLs by robots.txt disallowed paths
 */
function filterUrlsByRobotsTxt(urls: string[], disallowedPaths: string[]): string[] {
    return urls.filter(url => {
        const urlPath = new URL(url).pathname;
        return !disallowedPaths.some(disallowedPath => urlPath.startsWith(disallowedPath));
    });
}

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

    if (!sourceContext) {
        throw new Error('[Rocket Seeds Scraper] sourceContext is required');
    }

    const {
        scrapingSourceUrl,
        sourceName,
        dbMaxPage
    } = sourceContext;

    //Determine scraping mode
    const isTestMode = 
    startPage !==null && 
    endPage !==null && 
    startPage !== undefined && 
    endPage !== undefined;
    // Debug log
    apiLogger.debug('[Rocket Seeds Scraper] Starting with siteConfig', {
        name: siteConfig.name,
        baseUrl,
        isImplemented: siteConfig.isImplemented,
        scrapingSourceUrl: sourceContext?.scrapingSourceUrl
    });

    // Initialize request queue
    const runId = Date.now();
    const datasetName = `rocketseeds-${runId}`;
    const dataset = await Dataset.open(datasetName);
    const requestQueue = await RequestQueue.open(`${sourceName}-${runId}`);
    
    // STEP1: Initialize polite crawler policy
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: USERAGENT,
        acceptLanguage: ACCEPTLANGUAGE
    });

    // Get Header from politeCrawler
    const headers = politeCrawler.getHeaders();

    // ✅ Parse robots.txt FIRST for polite crawling compliance
    const robotsRules = await politeCrawler.parseRobots(baseUrl);
    const { 
        crawlDelay, // Crawl delay in milliseconds
        disallowedPaths, // List of disallowed paths
        allowedPaths, // List of allowed paths
        hasExplicitCrawlDelay // Whether there is an explicit crawl delay
    } = robotsRules;

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
    
    // STEP 2: Extract product URLs from pagination pages
    try {
        apiLogger.info(`[Rocket Seeds] Extracting product URLs from: ${scrapingSourceUrl}`);
        
        // 🧪 TEST MODE: Only crawl 2 pagination pages for faster testing
        const maxPagesToTest = isTestMode ? 2 : undefined;
        
        //IMPORTANT: Call extractProductUrls to crawl all pagination pages and get product URLs
        productUrls = await extractProductUrls(sourceContext, maxPagesToTest, robotsRules, headers, baseUrl);
        
        apiLogger.info(`[Rocket Seeds] Extracted ${productUrls.length} product URLs from pagination pages`);

        // ✅ Filter URLs against robots.txt
        urlsToProcess = filterUrlsByRobotsTxt(productUrls, disallowedPaths);
        
        apiLogger.info(`[Rocket Seeds] Robots.txt filtering results:`, { 
            total: productUrls.length, 
            allowed: urlsToProcess.length, 
            blocked: productUrls.length - urlsToProcess.length
        });

        // ✅ TEST MODE: Limit number of products for testing
        if (isTestMode && startPage !== null && endPage !== null) {
            const limitCount = endPage - startPage + 1;
            urlsToProcess = urlsToProcess.slice(0, limitCount);
            
            apiLogger.info(`[Rocket Seeds] TEST MODE: Limited to ${limitCount} products (startPage: ${startPage}, endPage: ${endPage})`);
        }

        // Add filtered product URLs to queue
        for (const productUrl of urlsToProcess) {
            await requestQueue.addRequest({
                url: productUrl,
                userData: { type: 'product' }
            });
        }

        apiLogger.info(`[Rocket Seeds] Added ${urlsToProcess.length} product URLs to crawl queue`);

    } catch (error) {
        apiLogger.logError('[Rocket Seeds] Failed to extract product URLs:', error as Error, {
            scrapingSourceUrl
        });
        throw new Error(`Failed to extract product URLs: ${error}`);
    }

    // STEP 3: Request handler - Process each product detail page
    async function rocketSeedsRequestHandler(context: CheerioCrawlingContext): Promise<void> {
        const { $, request, log } = context;

        log.info(`[Rocket Seeds] Processing product: ${request.url}`);
        
        // 🐛 DEBUG: Log HTML length to diagnose extraction failures
        const htmlLength = $.html().length;
        log.info(`[Rocket Seeds] HTML length: ${htmlLength} characters`);
        
        // 🐛 DEBUG: Check if product name selector works
        const productNameElement = $(siteConfig.selectors.productName);
        log.info(`[Rocket Seeds] Product name selector found: ${productNameElement.length} elements`);
        if (productNameElement.length > 0) {
            const productNameText = productNameElement.first().text().trim();
            log.info(`[Rocket Seeds] Product name text: "${productNameText}"`);
        }
        
        const product = extractProductFromDetailHTML($, siteConfig, request.url);
        
        if (product) {
            // Save product to dataset
            await dataset.pushData({
                product,
                url: request.url,
                extractedAt: new Date().toISOString()
            });
            
            actualPages++;
            log.info(`[Rocket Seeds] ✅ Extracted: ${product.name} (${actualPages}/${urlsToProcess.length})`);
        } else {
            log.error(`[Rocket Seeds] ⚠️ Failed to extract: ${request.url} - Check debug logs above for details`);
        }

        // Apply crawl delay
        await new Promise(resolve => setTimeout(resolve, crawlDelay));
    }

    // STEP 4: Error handling
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

    // ✅ STEP 5: Calculate dynamic rate limiting based on robots.txt
    const calculatedMaxRate = hasExplicitCrawlDelay 
        ? Math.floor(60000 / crawlDelay)
        : 15; // Default 15 req/min if no explicit delay
    
    apiLogger.info(`[Rocket Seeds] Dynamic rate limiting:`, {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        maxRequestsPerMinute: calculatedMaxRate
    });

    // STEP 6: Create and run crawler with optimized configuration
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

    // STEP 7: Run main crawler
    apiLogger.info(`[Rocket Seeds] Starting main crawler to process ${urlsToProcess.length} products...`);
    await crawler.run();

    // STEP 8: Extract products and log summary
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