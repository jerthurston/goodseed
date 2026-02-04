/**
 * MJ Seeds Canada Scraper (Refactored with BC Bud Depot Pattern)
 * 
 * KIẾN TRÚC TỔNG QUAN:
 * - Sitemap-based scraper following polite crawler best practices
 * - Parse robots.txt BEFORE crawling
 * - Filter URLs against robots.txt BEFORE adding to queue
 * - Dynamic rate limiting based on robots.txt
 * - Consistent delays from robots.txt
 * 
 * PATTERN: Same as BC Bud Depot
 * - Step 0: Parse robots.txt
 * - Step 1: Extract URLs from sitemap
 * - Step 2: Filter URLs against robots.txt
 * - Step 3: Add filtered URLs to queue
 * - Step 4: Crawl with dynamic rate limiting
 */

import { extractProductFromDetailHTML, extractProductUrlsFromSitemap } from '@/scrapers/mjseedscanada/utils/index';
import { ProductCardDataFromCrawling, ProductsDataResultFromCrawling } from '@/types/crawl.type';
import { CheerioAPI, CheerioCrawler, CheerioCrawlingContext, Dataset, Dictionary, ErrorHandler, Log, RequestQueue } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';

/**
 * MJ Seeds Canada Scraper - Sitemap-based with polite crawler compliance
 * 
 * NHIỆM VỤ:
 * 1. 🕷️ Extract products from MJ Seeds Canada (via sitemap)
 * 2. 🤖 Parse robots.txt BEFORE crawling
 * 3. 📋 Filter URLs against robots.txt rules
 * 4. ⚡ Apply dynamic rate limiting
 */

export async function MJSeedCanadaScraper(
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
    apiLogger.info('[MJ Seeds Canada] Starting with siteConfig', {
        name: siteConfig.name,
        baseUrl,
        isImplemented: siteConfig.isImplemented,
        scrapingSourceUrl: sourceContext?.scrapingSourceUrl
    });

    if (!sourceContext?.scrapingSourceUrl) {
        throw new Error('[MJ Seeds Canada] scrapingSourceUrl is required in sourceContext');
    }

    // Initialize dataset and request queue
    const runId = Date.now();
    const datasetName = `mjseedscanada-${runId}`;
    const dataset = await Dataset.open(datasetName);
    const requestQueue = await RequestQueue.open(`mj-seed-canada-queue-${runId}`);

    // ✅ STEP 0: Initialize polite crawler and parse robots.txt FIRST
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: USERAGENT,
        acceptLanguage: ACCEPTLANGUAGE,
    });

    const robotsRules = await politeCrawler.parseRobots(baseUrl);
    const { crawlDelay, disallowedPaths, allowedPaths, userAgent, hasExplicitCrawlDelay } = robotsRules;

    // Log robots.txt rules for debugging
    apiLogger.info(`[MJ Seeds Canada] Robots.txt rules loaded:`, {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        disallowedCount: disallowedPaths.length,
        allowedCount: allowedPaths.length,
        userAgent
    });

    let actualPages = 0;
    let productUrls: string[] = [];
    let urlsToProcess: string[] = [];

    // ✅ STEP 1: Extract product URLs from sitemap
    apiLogger.info('[MJ Seeds Canada] Step 1: Loading sitemap to extract product URLs...');
    
    try {
        productUrls = await extractProductUrlsFromSitemap(sourceContext.scrapingSourceUrl);
        apiLogger.info(`[MJ Seeds Canada] Extracted ${productUrls.length} product URLs from sitemap`);
        
        // ✅ STEP 2: Filter URLs against robots.txt BEFORE adding to queue
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
        
        apiLogger.info(`[MJ Seeds Canada] Robots.txt filtering results:`, { 
            total: productUrls.length, 
            allowed: allowedUrls.length, 
            blocked: blockedUrls.length 
        });
        
        // Use filtered URLs
        urlsToProcess = allowedUrls;
        
        // ✅ STEP 3: Apply test mode limits (if applicable)
        if (startPage !== null && startPage !== undefined && endPage !== null && endPage !== undefined) {
            const pageRange = endPage - startPage;
            const limitedCount = Math.max(1, pageRange);
            urlsToProcess = allowedUrls.slice(0, limitedCount);
            
            apiLogger.info(`[MJ Seeds Canada] Limited processing to ${limitedCount} products (startPage: ${startPage}, endPage: ${endPage}, range: ${pageRange})`);
        }
        
        // Add filtered URLs to queue
        for (const productUrl of urlsToProcess) {
            await requestQueue.addRequest({
                url: productUrl,
                userData: { type: 'product' }
            });
        }

    } catch (error) {
        apiLogger.logError('[MJ Seeds Canada] Failed to load sitemap:', {
            error,
            sitemapUrl: sourceContext.scrapingSourceUrl
        });
        throw new Error(`Failed to load sitemap: ${error}`);
    }

    // ✅ STEP 4: Request handler (URLs already filtered, no redundant checks needed)
    async function mjSeedCanadaRequestHandler(context: CheerioCrawlingContext): Promise<void> {
        const {
            $,
            request,
            log }: {
                $: CheerioAPI;
                request: CheerioCrawlingContext['request'];
                log: Log;
            } = context;

        // URLs are already filtered by robots.txt, no need for isAllowed() check
        // Extract product data from detail product page
        if (request.userData?.type === 'product') {
            const product = extractProductFromDetailHTML($, siteConfig, request.url);
            if (product) {
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

    // ✅ STEP 5: Error handling
    const mjSeedCanadaErrorHandler: ErrorHandler<CheerioCrawlingContext> = async (context: CheerioCrawlingContext, error: Error): Promise<void> => {
        const { request, log }: {
            request: CheerioCrawlingContext['request'];
            log: Log;
        } = context;

        //POLITE CRAWLING: Handle HTTP status codes properly
        const httpsError = error as any;
        if (httpsError?.response?.status) {
            const statusCode: number = httpsError.response.status;
            const shouldRetry: boolean = politeCrawler.shouldRetryOnStatus(statusCode);

            if (shouldRetry) {
                const backoffDelay: number = await politeCrawler.handleHttpStatus(statusCode, request.url);
                log.info(`[MJ Seed Canada Scraper] HTTP ${statusCode} for ${request.url}, backing off for ${backoffDelay}ms`);

                await new Promise<void>(resolve => setTimeout(resolve, backoffDelay));
                throw error;
            } else {
                log.error(`[MJ Seed Canada Scraper] HTTP ${statusCode} for ${request.url}, not retrying`);
                throw error;
            }
        }
    }

    // ✅ STEP 6: Calculate dynamic rate limiting based on robots.txt
    const calculatedMaxRate = hasExplicitCrawlDelay 
        ? Math.floor(60000 / crawlDelay)
        : 15; // Default 15 req/min if no explicit delay
    
    apiLogger.info(`[MJ Seeds Canada] Dynamic rate limiting:`, {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        maxRequestsPerMinute: calculatedMaxRate
    });

    // ✅ STEP 7: Create and run crawler with optimized configuration
    const crawler = new CheerioCrawler(
        {
            requestQueue,
            requestHandler: mjSeedCanadaRequestHandler,
            errorHandler: mjSeedCanadaErrorHandler,
            maxConcurrency: 1, // Sequential requests for polite crawling
            maxRequestsPerMinute: calculatedMaxRate, // Dynamic rate based on robots.txt
            maxRequestRetries: 3,
            preNavigationHooks: [
                async (requestAsBrowserOptions) => {
                    const headers = politeCrawler.getHeaders();
                    Object.assign(requestAsBrowserOptions.headers || {}, headers)
                }
            ]
        }
    );

    // ✅ STEP 8: Run main crawler
    apiLogger.info(`[MJ Seeds Canada] Starting main crawler...`);
    await crawler.run();

    // ✅ STEP 9: Collect results and log summary
    const products = (await dataset.getData()).items.map(item => item.product);
    const endTime = Date.now();
    const duration = endTime - startTime;

    apiLogger.info(`[MJ Seeds Canada] ✅ Scraping completed successfully:`, {
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
    }
}

export default MJSeedCanadaScraper; 
