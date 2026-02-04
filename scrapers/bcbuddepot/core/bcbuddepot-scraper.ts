import { apiLogger } from "@/lib/helpers/api-logger";
import { SimplePoliteCrawler } from "@/lib/utils/polite-crawler";
import { CheerioAPI, CheerioCrawler, CheerioCrawlingContext, Dataset, ErrorHandler, Log, RequestQueue } from "crawlee";
import { SiteConfig } from "@/lib/factories/scraper-factory";
import { ProductsDataResultFromCrawling, ProductCardDataFromCrawling } from "@/types/crawl.type";
import { extractProductFromDetailHTML,extractProductUrlsFromSitemap } from "../utils/index";
import { ACCEPTLANGUAGE, USERAGENT } from "@/scrapers/(common)/constants";


export async function BcbuddepotScraper(
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
    apiLogger.info('[BC Bud Depot Scraper] Starting with siteConfig', {
        name: siteConfig.name,
        baseUrl: siteConfig.baseUrl,
        isImplemented: siteConfig.isImplemented,
        scrapingSourceUrl: sourceContext?.scrapingSourceUrl
    });

    // Validate sourceContext
    if (!sourceContext?.scrapingSourceUrl) {
        throw new Error('[BC Bud Depot Scraper] scrapingSourceUrl is required in sourceContext');
    }

    // Initialize dataset and request queue
    const runId = Date.now();
    const datasetName = `bcbuddepot-${runId}`;
    const dataset = await Dataset.open(datasetName);
    const requestQueue = await RequestQueue.open(`bcbuddepot-queue-${runId}`);

    // Initialize polite crawler and parse robots.txt FIRST
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: USERAGENT,
        acceptLanguage: ACCEPTLANGUAGE,
    });

    // ✅ STEP 0: Parse robots.txt BEFORE crawling
    const robotsRules = await politeCrawler.parseRobots(baseUrl);
    const { crawlDelay, disallowedPaths, allowedPaths, userAgent, hasExplicitCrawlDelay } = robotsRules;

    // Log robots.txt rules for debugging
    apiLogger.info(`[BC Bud Depot Scraper] Robots.txt rules loaded:`, {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        disallowedCount: disallowedPaths.length,
        allowedCount: allowedPaths.length,
        userAgent
    });

    let actualPages = 0;
    let productUrls: string[] = [];
    let urlsToProcess: string[] = [];

    // Step 1: Extract product URLs from sitemap using Crawlee utility
    apiLogger.info('[BC Bud Depot Scraper] Step 1: Loading sitemap to extract product URLs...');
    
    try {
        productUrls = await extractProductUrlsFromSitemap(sourceContext.scrapingSourceUrl);
        apiLogger.info(`[BC Bud Depot Scraper] Extracted ${productUrls.length} product URLs from sitemap`);
        
        // ✅ Filter URLs against robots.txt BEFORE adding to queue
        const allowedUrls: string[] = [];
        const blockedUrls: string[] = [];
        
        for (const url of productUrls) {
            const urlPath = new URL(url).pathname;
            
            // Check if URL is allowed by robots.txt
            let isAllowed = true;
            
            // Check disallowed paths first (higher priority)
            for (const disallowedPath of disallowedPaths) {
                if (urlPath.startsWith(disallowedPath)) {
                    isAllowed = false;
                    break;
                }
            }
            
            // If not explicitly disallowed, check allowed paths
            if (isAllowed && allowedPaths.length > 0 && !allowedPaths.includes('*')) {
                isAllowed = false;
                for (const allowedPath of allowedPaths) {
                    if (urlPath.startsWith(allowedPath)) {
                        isAllowed = true;
                        break;
                    }
                }
            }
            
            if (isAllowed) {
                allowedUrls.push(url);
            } else {
                blockedUrls.push(url);
            }
        }
        
        apiLogger.info(`[BC Bud Depot Scraper] Robots.txt filtering results:`, {
            total: productUrls.length,
            allowed: allowedUrls.length,
            blocked: blockedUrls.length
        });
        
        if (blockedUrls.length > 0) {
            apiLogger.debug(`[BC Bud Depot Scraper] Sample blocked URLs:`, { 
                blockedSample: blockedUrls.slice(0, 5) 
            });
        }

        // Calculate number of products to process based on startPage and endPage
        // Chỉ áp dụng cho mode = test. Chỉ test 5 productUrl (startPage = 1, và endPage =6. số lượng 5 url)
        urlsToProcess = allowedUrls; // Use filtered URLs instead of all URLs
        if (startPage !== null && startPage !== undefined && endPage !== null && endPage !== undefined) {
            const pageRange = endPage - startPage;
            const limitedCount = Math.max(1, pageRange); // Ensure at least 1 product
            urlsToProcess = allowedUrls.slice(0, limitedCount);
            
            apiLogger.info(`[BC Bud Depot Scraper] Limited processing to ${limitedCount} products (startPage: ${startPage}, endPage: ${endPage}, range: ${pageRange})`);
        }
        //==== Code này dành cho Quick testing scraper.
        /**
         * Add product URLs to queue for crawling. Nếu không truyền vào startPage hoặc endPage tức là manual hoặc auto mode sẽ lần lượt for qua tất cả url thay vì 5 url như trên
         */
        for (const productUrl of urlsToProcess) {
            await requestQueue.addRequest({
                url: productUrl,
                userData: { type: 'product' }
            });
        }
        
    } catch (error) {
        apiLogger.logError('[BC Bud Depot Scraper] Failed to load sitemap:', { 
            error, 
            sitemapUrl: sourceContext.scrapingSourceUrl 
        });
        throw new Error(`Failed to load sitemap: ${error}`);
    }

    // Step 2: Request handler for product pages
    async function requestHandler(context: CheerioCrawlingContext): Promise<void> {
        const { $, request, log }: { 
            $: CheerioAPI; 
            request: CheerioCrawlingContext['request']; 
            log: Log 
        } = context;
        
        log.info(`[BC Bud Depot Scraper] Processing product: ${request.url}`);

        // ✅ URLs already filtered by robots.txt, no need to check again here
        // (URLs were filtered BEFORE being added to queue)

        // Extract product data from product detail page
        if (request.userData?.type === 'product') {
            const product = extractProductFromDetailHTML($, siteConfig, request.url,);
            
            if (product) {
                log.info(`[BC Bud Depot Scraper] Successfully extracted product: ${product.name}`);
                
                // Save product to dataset
                await dataset.pushData({
                    product,
                    url: request.url,
                    extractedAt: new Date().toISOString()
                });
                
                actualPages++;
            } else {
                log.info(`[BC Bud Depot Scraper] Failed to extract product from: ${request.url}`);
            }
        }

        // ✅ POLITE CRAWLING: Apply delay from robots.txt (already parsed)
        log.debug(`[BC Bud Depot Scraper] Applying polite crawl delay: ${crawlDelay}ms (from ${hasExplicitCrawlDelay ? 'robots.txt Crawl-delay' : 'intelligent default'})`);
        await new Promise(resolve => setTimeout(resolve, crawlDelay));
    }

    // Error handler
    const errorHandler: ErrorHandler<CheerioCrawlingContext> = async (context: CheerioCrawlingContext, error: Error): Promise<void> => {
        const { request, log }: {
            request: CheerioCrawlingContext['request'];
            log: Log;
        } = context;
        
        // POLITE CRAWLING: Handle HTTP status codes properly
        const httpError = error as any;
        if (httpError?.response?.status) {
            const statusCode: number = httpError.response.status;
            const shouldRetry: boolean = politeCrawler.shouldRetryOnStatus(statusCode);

            if (shouldRetry) {
                const backoffDelay: number = await politeCrawler.handleHttpStatus(statusCode, request.url);
                log.info(`[BC Bud Depot Scraper] HTTP ${statusCode} for ${request.url}, backing off for ${backoffDelay}ms`);
                await new Promise<void>(resolve => setTimeout(resolve, backoffDelay));
                throw error; // Re-throw to trigger retry
            } else {
                log.error(`[BC Bud Depot Scraper] Non-retryable HTTP ${statusCode} for ${request.url}`);
                throw error;
            }
        } else {
            log.error(`[BC Bud Depot Scraper] Non-HTTP error for ${request.url}:`, error);
            throw error;
        }
    };

    // ✅ Calculate optimal maxRequestsPerMinute based on robots.txt crawlDelay
    // Priority: robots.txt Crawl-delay > intelligent defaults
    const calculatedMaxRate = hasExplicitCrawlDelay 
        ? Math.floor(60000 / crawlDelay)  // ✅ PRIORITY: Respect robots.txt
        : 15;                              // Intelligent default when no explicit limit
    
    const maxConcurrency = 1; // Sequential for sitemap-based scraping
    
    apiLogger.info(`[BC Bud Depot Scraper] Crawler settings (respecting robots.txt):`, {
        crawlDelayMs: crawlDelay,
        hasExplicitCrawlDelay,
        maxRequestsPerMinute: calculatedMaxRate,
        maxConcurrency,
        strategy: hasExplicitCrawlDelay ? '🤖 robots.txt enforced' : '🧠 intelligent default'
    });

    // Initialize crawler
    const crawler = new CheerioCrawler({
        requestQueue,
        requestHandler,
        errorHandler,
        maxRequestsPerMinute: calculatedMaxRate, // ✅ Use calculated rate from robots.txt
        maxConcurrency: maxConcurrency, // ✅ Use calculated value
        maxRequestRetries: 3,
        preNavigationHooks: [
            async (crawlingContext, requestAsBrowserOptions) => {
                // Add polite crawler headers
                const headers = politeCrawler.getHeaders();
                Object.assign(requestAsBrowserOptions.headers || {}, headers);
            }
        ],
    });

    // Step 3: Run crawler
    apiLogger.info('[BC Bud Depot Scraper] Starting crawler...');
    await crawler.run();

    // Step 4: Get data from dataset
    apiLogger.info('[BC Bud Depot Scraper] Collecting results from dataset...');
    const allData = await dataset.getData();
    
    // Extract products from dataset items
    const allProducts: ProductCardDataFromCrawling[] = [];
    
    allData.items.forEach((item: any) => {
        if (item.product) {
            allProducts.push(item.product);
        }
    });

    // Step 5: Return results
    const duration = Date.now() - startTime;
    
    apiLogger.info('[BC Bud Depot Scraper] Crawling completed', {
        totalProducts: allProducts.length,
        totalPages: actualPages,
        duration: `${duration}ms`,
        sitemapUrl: sourceContext.scrapingSourceUrl,
        productUrlsFound: productUrls.length
    });

    return {
        totalProducts: allProducts.length,
        totalPages: actualPages,
        products: allProducts,
        timestamp: new Date(),
        duration,
    };
}

// Export the scraper function
export default BcbuddepotScraper;