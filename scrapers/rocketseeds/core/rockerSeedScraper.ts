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
        acceptLanguage: ACCEPTLANGUAGE,
        // Using default MIN_DELAY_DEFAULT (1000ms) and MAX_DELAY_DEFAULT (2500ms) from constants
        // Override here if Rocket Seeds needs specific delays
    });

    let actualPages = 0;
    let productUrls: string[] = [];
    let urlsToProcess: string[] = [];
    
    // Step 1: Add product URLs to request queue
    try {
        productUrls = await extractProductUrlsFromSitemap(sourceContext.scrapingSourceUrl);
        // sourceContext.scrapingSourceUrl: link sitemap được lấy từ database ở scrapingSource[0]

        apiLogger.info(`[Rocket Seeds Scraper] extracted ${productUrls.length} product URLs from sitemap`);

        // Calculate number of products to process based on startPage and endPage
        // Chỉ áp dụng cho mode = test. Chỉ test 5 productUrl (startPage = 1, và endPage = 6. số lượng 5 url)
        endPage = 6;
        urlsToProcess = productUrls;
        if (startPage !== null && startPage !== undefined && endPage !== null && endPage !== undefined) {
            const pageRange = endPage - startPage;
            const limitedCount = Math.max(1, pageRange); // Ensure at least 1 product
            urlsToProcess = productUrls.slice(0, limitedCount);
            
            apiLogger.info(`[Rocket Seeds Scraper] Limited processing to ${limitedCount} products (startPage: ${startPage}, endPage: ${endPage}, range: ${pageRange})`);
        }
        // ==== Code này dành cho Quick testing scraper.

        // Add product URLs to queue for crawling. Nếu không truyền vào startPage hoặc endPage tức là manual hoặc auto mode sẽ lần lượt for qua tất cả url thay vì 5 url như trên
        for (const productUrl of urlsToProcess) {
            await requestQueue.addRequest({
                url: productUrl,
                userData: { type: 'product' }
            });
        }

    } catch (error) {
        apiLogger.logError('[Rocket Seeds Scraper] Failed to load sitemap:', {
            error,
            sitemapUrl: sourceContext.scrapingSourceUrl
        });
        throw new Error(`Failed to load sitemap: ${error}`);
    }

    // Step 2: Request handler
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

        log.info(`[Rocket Seeds Scraper] Processing product page: ${request.url}`);

        // 2.1 Crawling check robots.txt with polite crawler
        const isAllowed = await politeCrawler.isAllowed(request.url);
        if (!isAllowed) {
            log.error(`[Rocket Seeds Scraper] BLOCKED by robots.txt: ${request.url}`);
            throw new Error(`robots.txt blocked access to ${request.url}`);
        }

        // 2.2 Extract product data from detail product page
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
                log.info(`[Rocket Seeds Scraper] Successfully extracted product: ${product.name}`);
                log.info(`[Rocket Seeds Scraper] Successfully extracted product url: ${product.url}`);
                log.info(`[Rocket Seeds Scraper] Successfully extracted product image: ${product.imageUrl}`);
                log.info(`[Rocket Seeds Scraper] Successfully extracted product price: ${product.pricings}`);
                log.info(`[Rocket Seeds Scraper] Successfully extracted product thcLevel: ${product.thcLevel}`);
                log.info(`[Rocket Seeds Scraper] Successfully extracted product thcMin: ${product.thcMin}`);
                log.info(`[Rocket Seeds Scraper] Successfully extracted product thcMax: ${product.thcMax}`);
                log.info(`[Rocket Seeds Scraper] Successfully extracted product cbdLevel: ${product.cbdLevel}`);
                log.info(`[Rocket Seeds Scraper] Successfully extracted product cbdMin: ${product.cbdMin}`);
                log.info(`[Rocket Seeds Scraper] Successfully extracted product cbdMax: ${product.cbdMax}`);
                log.info(`[Rocket Seeds Scraper] Successfully extracted product floweringTime: ${product.floweringTime}`);
                log.info(`[Rocket Seeds Scraper] Successfully extracted product growingLevel: ${product.growingLevel}`);

                // Save product to dataset
                await dataset.pushData({
                    product,
                    url: request.url,
                    extractedAt: new Date().toISOString()
                });
                // Increment actual pages count
                actualPages++;
            } else {
                log.info(`[Rocket Seeds Scraper] Failed to extract product from: ${request.url}`);
            }
        }

        // 2.3 Delay to follow Polite crawling guidelines. params nhận vào là url và hàm getCrawlDelay sẽ phân tích và lấy delayMs từ robots.txt
        const delayMs = await politeCrawler.getCrawlDelay(request.url);
        log.info(`[Rocket Seeds Scraper] Using polite crawl delay: ${delayMs}ms for ${request.url}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
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

    // Step 4: Create and run CommonCrawler with Rocket Seeds-specific logic
    const crawler = new CheerioCrawler({
        requestQueue,
        requestHandler: rocketSeedsRequestHandler,
        errorHandler: rocketSeedsErrorHandler,
        maxConcurrency: 1, // Sequential requests. request đơn lập
        maxRequestsPerMinute: 15,
        maxRequestRetries: 3,
        preNavigationHooks: [
            async (requestAsBrowserOptions) => {
                const headers = politeCrawler.getHeaders();
                Object.assign(requestAsBrowserOptions.headers || {}, headers);
            }
        ]
    });

    // Step 5: Run main crawler
    apiLogger.info(`[Rocket Seeds Scraper] Starting main crawler`);
    await crawler.run();

    // STEP 7: Extract products from dataset
    apiLogger.info(`[Rocket Seeds Scraper] Getting data from dataset`);
    // --> 7.1 Get data from dataset
    const data = await dataset.getData();
    // --> 7.2 Extract products from dataset
    const products: ProductCardDataFromCrawling[] = [];
    data.items.forEach((item: Dictionary) => {
        if (item.product) {
            products.push(item.product);
        }
    });
    apiLogger.info(`[Rocket Seeds Scraper] Extracted ${products.length} products from dataset`);

    // STEP 8: Return Result for factory scraper
    const duration = Date.now() - startTime;

    apiLogger.info(`[Rocket Seeds Scraper] Finished in ${duration}ms`);
    apiLogger.debug(`[Rocket Seeds Scraper] Crawling completed:`, {
        totalProducts: products.length,
        totalPages: actualPages,
        duration: `${duration}ms`,
        sitemapUrl: sourceContext.scrapingSourceUrl,
        productUrlsFound: productUrls.length,
        productUrlsProcessed: urlsToProcess.length
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