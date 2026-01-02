/**
 * Beaver Seed Product List Scraper (Refactored with CommonCrawler)
 * 
 * KIẾN TRÚC TỔNG QUAN:
 * - Uses CommonCrawler infrastructure for reusability
 * - Focuses only on Beaver Seed-specific extraction logic
 * - Uses jet-smart-filters pagination handling
 * - All common functionality delegated to CommonCrawler
 * 
 * DIFFERENCES FROM VANCOUVER SEED BANK:
 * - Uses jet-smart-filters pagination instead of WooCommerce standard
 * - Same WooCommerce product structure, different pagination handling
 */

import { extractProductFromDetailHTML, extractProductUrlsFromSitemap } from '@/scrapers/mjseedscanada/utils/index';
import { getScrapingUrl } from '@/scrapers/beaverseed/utils/getScrapingUrl';
import { ProductCardDataFromCrawling, ProductsDataResultFromCrawling } from '@/types/crawl.type';
import { CheerioAPI, CheerioCrawler, CheerioCrawlingContext, CheerioErrorHandler, Dataset, Dictionary, ErrorHandler, Log, RequestQueue } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { CommonCrawler, CommonScrapingContext, SiteSpecificRequestHandler } from '@/scrapers/(common)/CommonCrawler';
import { apiLogger } from '@/lib/helpers/api-logger';
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { BeaverseedScraper } from '@/scrapers/beaverseed/core/beaverseed-scraper';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';
import { timeStamp } from 'console';

/**
 * BeaverSeedProductListScraper - Site-specific implementation using CommonCrawler
 * 
 * NHIỆM VỤ:
 * 1. 🕷️ Extract sản phẩm từ Beaver Seed (product listing pages)  
 * 2. 📄 Hỗ trợ jet-smart-filters pagination
 * 3. 📋 Extract cannabis-specific data với WooCommerce structure
 * 4. ⚡ Sử dụng CommonCrawler infrastructure
 */

export async function MJSeedCanadaScraper(
    siteConfig: SiteConfig,
    startPage?: number | null,
    endPage?: number | null,
    // fullSiteCrawl?: boolean | null,
    sourceContext?: {
        scrapingSourceUrl: string;
        sourceName: string;
        dbMaxPage: number;
    }
): Promise<ProductsDataResultFromCrawling> {

   
    const startTime = Date.now();
    const { baseUrl } = siteConfig;

    //Debug log
    apiLogger.debug('[MJ Seed Canada Scraper] Starting with siteConfig', {
        name: siteConfig.name,
        baseUrl,
        isImplemented: siteConfig.isImplemented,
        scrapingSourceUrl: sourceContext?.scrapingSourceUrl
    });

    if (!sourceContext?.scrapingSourceUrl) {
        throw new Error('[MJ Seed Canada Scraper]  scrapingSourceUrl is required in sourceContext');
    }

    // initialize request queue
    const runId = Date.now();
    const requestQueue = await RequestQueue.open(`mj-seed-canada-queue-${runId}`)
    //initialize dataset
    const datasetName = `mjseedcanada-${runId}`;
    const dataset = await Dataset.open(datasetName);
    //initialize polited crawler policy
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: USERAGENT,
        acceptLanguage: ACCEPTLANGUAGE,
        minDelay: 2000,
        maxDelay: 5000
    });

    let actualPages = 0;
    let productUrls: string[] = [];
    let urlsToProcess: string[] = [];
    // Step 1: Add product URLs to request queue
    try {
        productUrls = await extractProductUrlsFromSitemap(sourceContext.scrapingSourceUrl);
        // sourceContext.scrapingSourceUrl: link sitemap được lấy từ database ở scrapingSource[0]

        apiLogger.info(`[MJ Seed Canada Scraper] extracted ${productUrls.length} product URLs form sitemap`);

        // Calculate number of products to process based on startPage and endPage
         // Chỉ áp dụng cho mode = test. Chỉ test 5 productUrl (startPage = 1, và endPage =6. số lượng 5 url)
        endPage = 6
        urlsToProcess = productUrls;
        if (startPage !== null && startPage !== undefined && endPage !== null && endPage !== undefined) {
            const pageRange = endPage - startPage;
            const limitedCount = Math.max(1, pageRange); // Ensure at least 1 product
            urlsToProcess = productUrls.slice(0, limitedCount);
            
            apiLogger.info(`[MJ Seed Canada Scraper] Limited processing to ${limitedCount} products (startPage: ${startPage}, endPage: ${endPage}, range: ${pageRange})`);
        }
        //==== Code này dành cho Quick testing scraper.

        // Add product URLs to queue for crawling. Nếu không truyền vào startPage hoặc endPage tức là manual hoặc auto mode sẽ lần lượt for qua tất cả url thay vì 5 url như trên
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

    // Step 2: Request handler
    async function mjSeedCanadaRequestHandler(context: CheerioCrawlingContext): Promise<void> {
        const {
            $,
            request,
            log }: {
                $: CheerioAPI;
                request: CheerioCrawlingContext['request'];
                log: Log;
            } = context;

        log.info(`[MJ Seed Canada Scraper] Processing product page: ${request.url}`)


        // 2.1 crawling check robots.txt with polite crawler
        const isAllowed = await politeCrawler.isAllowed(request.url);
        if (!isAllowed) {
            log.error(`[MJ Seed Canada Scraper] BLOCKED by robots.txt: ${request.url}`);
            throw new Error(`robots.txt blocked access to ${request.url}`);
        }

        //2.2 Extract product data from detail product page
        if (request.userData?.type === 'product') {
            const product = extractProductFromDetailHTML($, siteConfig, request.url);
            if (product) {
                /**
                 *  const product: ProductCardDataFromCrawling = {
            name,
            url: productUrl,
            slug,
            imageUrl: finalImageUrl,
            seedType,
            cannabisType,
            badge,
            rating: undefined,
            reviewCount: undefined,
            thcLevel,
            thcMin,
            thcMax,
            cbdLevel,
            cbdMin,
            cbdMax,
            floweringTime,
            growingLevel: undefined,
            pricings,
        };
                 */
                log.info(`[MJ Seed Canada Scraper] Successfully extracted product: ${product.name}`);
                log.info(`[MJ Seed Canada Scraper] Successfully extracted product url: ${product.url}`);
                log.info(`[MJ Seed Canada Scraper] Successfully extracted product image: ${product.imageUrl}`);
                log.info(`[MJ Seed Canada Scraper] Successfully extracted product price: ${product.pricings}`);
                log.info(`[MJ Seed Canada Scraper] Successfully extracted product thcLevel: ${product.thcLevel}`);
                log.info(`[MJ Seed Canada Scraper] Successfully extracted product thcMin: ${product.thcMin}`);
                log.info(`[MJ Seed Canada Scraper] Successfully extracted product thcMax: ${product.thcMax}`);
                log.info(`[MJ Seed Canada Scraper] Successfully extracted product cbdLevel: ${product.cbdLevel}`);
                log.info(`[MJ Seed Canada Scraper] Successfully extracted product cbdMin: ${product.cbdMin}`);
                log.info(`[MJ Seed Canada Scraper] Successfully extracted product cbdMax: ${product.cbdMax}`);
                log.info(`[MJ Seed Canada Scraper] Successfully extracted product floweringTime: ${product.floweringTime}`);
                log.info(`[MJ Seed Canada Scraper] Successfully extracted product growingLevel: ${product.growingLevel}`);

                // Save product to dataset
                await dataset.pushData({
                    product,
                    url: request.url,
                    extractedAt: new Date().toISOString()
                });
                // Increment actual pages count
                actualPages++;
            } else {
                log.info(`[MJ Seed Canada Scraper] Failed to extract product from: ${request.url}`);
            }
        }

        //2.3 Delay to follow Polite crawling guidelines. params nhận vào là url và hàm getCrawlDelay sẽ phân tích và lấy delayMs từ robots.txt
        const delayMs = await politeCrawler.getCrawlDelay(request.url);
        log.info(`[MJ Seed Canada Scraper] Using polite crawl delay: ${delayMs}ms for ${request.url}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Step 3: Error handling
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

    // Step 4: Create and run CommonCrawler with MJ Seed Canada-specific logic
    const crawler = new CheerioCrawler(
        {
            requestQueue,
            requestHandler: mjSeedCanadaRequestHandler,
            errorHandler: mjSeedCanadaErrorHandler,
            maxConcurrency: 1, // Sequential requests. request đơn lập
            maxRequestsPerMinute: 15,
            maxRequestRetries: 3,
            preNavigationHooks: [
                async (requestAsBrowserOptions) => {
                    const headers = politeCrawler.getHeaders();
                    Object.assign(requestAsBrowserOptions.headers || {}, headers)
                }
            ]
        }
    );

    // Step 5: Run main crawler
    apiLogger.info(`[MJ Seed Canada Scraper] Starting main crawler`);
    await crawler.run();

    //STEP 7: Extract products form dataset
    apiLogger.info(`[MJ Seed Canada Scraper] Getting data from dataset`);
    // --> 7.1 Get data form dataset
    const data = await dataset.getData();
    //--> 7.2 Extract products from dataset
    const products: ProductCardDataFromCrawling[] = [];
    data.items.forEach((item: Dictionary) => {
        if (item.product) {
            products.push(item.product);
        }
    });
    apiLogger.info(`[MJ Seed Canada Scraper] Extracted ${products.length} products from dataset`);

    //STEP 8: Return Result for factory scraper
    const duration = Date.now() - startTime;

    apiLogger.info(`[MJ Seed Canada Scraper] Finished in ${duration}ms`);
    apiLogger.debug(`[MJ Seed Canada Scraper] Crawling completed:`, {
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
    }
}

export default MJSeedCanadaScraper; 
