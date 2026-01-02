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
    fullSiteCrawl?: boolean | null,
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

    // Initialize polite crawler
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: USERAGENT,
        acceptLanguage: ACCEPTLANGUAGE,
        minDelay: 2000,
        maxDelay: 5000
    });

    let actualPages = 0;
    let productUrls: string[] = [];

    // Step 1: Extract product URLs from sitemap using Crawlee utility
    apiLogger.info('[BC Bud Depot Scraper] Step 1: Loading sitemap to extract product URLs...');
    
    try {
        productUrls = await extractProductUrlsFromSitemap(sourceContext.scrapingSourceUrl);
        apiLogger.info(`[BC Bud Depot Scraper] Extracted ${productUrls.length} product URLs from sitemap`);
        
        // Add all product URLs to queue for crawling
        for (const productUrl of productUrls) {
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

        // POLITE CRAWLING: Check robots.txt compliance
        const isAllowed = await politeCrawler.isAllowed(request.url);
        if (!isAllowed) {
            log.error(`[BC Bud Depot Scraper] BLOCKED by robots.txt: ${request.url}`);
            throw new Error(`robots.txt blocked access to ${request.url}`);
        }

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

        // POLITE CRAWLING: Apply delay
        const delayMs = await politeCrawler.getCrawlDelay(request.url);
        log.info(`[BC Bud Depot Scraper] Using polite crawl delay: ${delayMs}ms for ${request.url}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
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

    // Initialize crawler
    const crawler = new CheerioCrawler({
        requestQueue,
        requestHandler,
        errorHandler,
        maxRequestsPerMinute: 15, // Polite crawling
        maxConcurrency: 1, // Sequential requests
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