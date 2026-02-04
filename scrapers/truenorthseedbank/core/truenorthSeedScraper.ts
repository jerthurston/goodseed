import { SiteConfig } from "@/lib/factories/scraper-factory";
import { apiLogger } from "@/lib/helpers/api-logger"
;
import { SimplePoliteCrawler } from "@/lib/utils/polite-crawler";
import { ACCEPTLANGUAGE, USERAGENT } from "@/scrapers/(common)/constants";
import { ProductsDataResultFromCrawling, ProductCardDataFromCrawling } from "@/types/crawl.type";
import { Dataset, log, RequestQueue, CheerioCrawler } from "crawlee";
import { extractCategoryLinksFromHomepage } from "../utils/extractCatLinkFromHeader";
import { extractProductUrlsFromCatLink } from "../utils/extractProductUrlsFromCatLink";
import { extractProductFromDetailHTML } from "../utils/extractProductFromDetailHTML";

export async function truenorthSeedScraper(
    siteConfig: SiteConfig,
    startPage?: number | null,
    endPage?: number | null,
    sourceContext?: {
        scrapingSourceUrl: string;
        sourceName: string;
        dbMaxPage: number;
    },
): Promise<ProductsDataResultFromCrawling> {
    const startTime = Date.now();
    const {selectors,baseUrl} = siteConfig;

    // DEBUGLOG: 
    apiLogger.debug(
        `[TrueNorthSeedScraper] starting to scrape with siteConfig`,{
            name:siteConfig.name,
            baseUrl,
            isImplemented:siteConfig.isImplemented,
            scrapingSourceUrl:sourceContext?.scrapingSourceUrl
        }
    );

    const runId = Date.now();
    // Initialize request queue
    const requestQueue = await RequestQueue.open(`${sourceContext?.sourceName}-queue-${runId}`);
    // Initialize dataset
    const datasetName = `${sourceContext?.sourceName}-dataset-${runId}`;
    const dataset = await Dataset.open(datasetName);
    // Initialize polited policy
    const politeCrawler = new SimplePoliteCrawler({
        userAgent:USERAGENT,
        acceptLanguage:ACCEPTLANGUAGE,
        minDelay:2000,
        maxDelay:5000
    });

    const robotsRules = await politeCrawler.parseRobots(baseUrl);
    const { crawlDelay, disallowedPaths, allowedPaths, hasExplicitCrawlDelay, userAgent } = robotsRules;

    // Check if this is test quick mode (startPage & endPage provided)
    const isTestQuickMode = startPage !== null && startPage !== undefined && 
                           endPage !== null && endPage !== undefined;

    // ✅ Log robots.txt compliance
    apiLogger.info('[True North] 🤖 Robots.txt compliance', {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        disallowedPaths: disallowedPaths.length,
        allowedPaths: allowedPaths.length,
        strategy: hasExplicitCrawlDelay ? 'robots.txt enforced' : 'intelligent default'
    });

    // ✅ Calculate dynamic rate limiting based on robots.txt
    const calculatedMaxRate = hasExplicitCrawlDelay 
        ? Math.floor(60000 / crawlDelay)  // Respect robots.txt
        : 15;                              // Intelligent default

    const maxConcurrency = 1; // Sequential for same site

    apiLogger.info('[True North] ⚙️ Crawler configuration', {
        crawlDelayMs: crawlDelay,
        maxRequestsPerMinute: calculatedMaxRate,
        maxConcurrency,
        hasExplicitCrawlDelay,
        mode: isTestQuickMode ? 'TEST' : 'AUTO'
    });

    // Initialize constants
    let actualPages = 0;
    let productUrls: string[] = [];
    let urlsToProcess: string[] = [];

    // Step 1: Add product URLs to request queue
    try {
        // 1.1 Lấy được array product url từ việc extract các category link ở header
        const catLinkArr = await extractCategoryLinksFromHomepage(siteConfig , robotsRules);
        log.info(`[TrueNorthSeedScraper] extracted category links: ${JSON.stringify(catLinkArr)}`);
        
        if (isTestQuickMode) {
            // Test Quick Mode: Only crawl specific pages of ONE category
            const pagesToCrawl = endPage! - startPage! + 1;
            const testCategory = catLinkArr[0]; // Use first category for testing
            
            apiLogger.info(`🧪 [TEST QUICK MODE] Crawling ${pagesToCrawl} pages (${startPage}-${endPage}) of category: ${testCategory}`);
            
            // Use the pagination-aware function with page limits
            const productUrls = await extractProductUrlsFromCatLink(
                testCategory, 
                pagesToCrawl, // maxPages = number of pages to crawl
                robotsRules
            );
            
            urlsToProcess.push(...productUrls);
            apiLogger.info(`✅ [TEST QUICK MODE] Found ${productUrls.length} products from ${pagesToCrawl} pages`);
            
        } else {
            // Auto, Manual Mode: Crawl all categories with default page limits
            apiLogger.info(`🚀 [NORMAL MODE] Starting to extract product URLs from ${catLinkArr.length} categories`);
            
            for (let i = 0; i < catLinkArr.length; i++) {
                const catLink = catLinkArr[i];
                apiLogger.debug(`📂 Processing category ${i + 1}/${catLinkArr.length}: ${catLink}`);
                
                try {
                    const productUrls = await extractProductUrlsFromCatLink(catLink, sourceContext?.dbMaxPage, robotsRules);

                    // Add unique URLs to processing list
                    const newUrls = productUrls.filter(url => !urlsToProcess.includes(url));
                    urlsToProcess.push(...newUrls);
                    
                    apiLogger.info(`✅ Category ${i + 1} completed. Found ${productUrls.length} products (${newUrls.length} new). Total: ${urlsToProcess.length}`);
                    
                    // Polite delay between categories
                    if (i < catLinkArr.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                } catch (categoryError) {
                    console.warn(`⚠️ Failed to process category ${catLink}:`, categoryError);
                    // Continue with next category
                }
            }
        }
        
        apiLogger.info(`🎉 [TrueNorthSeedScraper] URL extraction completed! Total unique product URLs: ${urlsToProcess.length}`);
        
        if (urlsToProcess.length === 0) {
            throw new Error('No product URLs were extracted from any category');
        }

    } catch (error) {
        console.error(`❌ [TrueNorthSeedScraper] Failed to extract product URLs:`, error);
        throw error;
    }

    // Step 2: Add product URLs to request queue
    try {
        apiLogger.info(`📋 [TrueNorthSeedScraper] Adding ${urlsToProcess.length} product URLs to request queue`);
        
        for (const url of urlsToProcess) {
            await requestQueue.addRequest({ url });
        }
        
        apiLogger.info(`✅ [TrueNorthSeedScraper] All product URLs added to request queue`);
        
    } catch (error) {
        console.error(`❌ [TrueNorthSeedScraper] Failed to add URLs to request queue:`, error);
        throw error;
    }

    // Step 3: Process product pages and extract data
    const products: ProductCardDataFromCrawling[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    try {
        apiLogger.info(`🔄 [TrueNorthSeedScraper] Starting product data extraction from ${urlsToProcess.length} URLs`);
        
        // Create crawler for product data extraction with optimized settings
        const productCrawler = new CheerioCrawler({
            requestHandlerTimeoutSecs: 90, // Reduced from 120s based on logs showing ~4.2s average
            maxRequestRetries: 2, // Reduced retries since success rate is 100%
            maxConcurrency: maxConcurrency, // ✅ Use calculated value
            maxRequestsPerMinute: calculatedMaxRate, // ✅ Dynamic from robots.txt
            
            requestHandler: async ({ $, request }) => {
                try {
                    apiLogger.debug(`🌐 Processing product: ${request.url}`);
                    
                    // Reduced wait time since most content loads within 2s
                    if (!isTestQuickMode) {
                        apiLogger.debug(`⏱️ Waiting 2s for dynamic content to load...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else {
                        // Minimal wait for test mode
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                    // Extract product data using our existing function
                    const productData = extractProductFromDetailHTML($, siteConfig, request.url);
                    
                    if (productData) {
                        products.push(productData);
                        successCount++;
                        apiLogger.debug(`✅ Successfully extracted product: ${productData.name}`);
                    } else {
                        errorCount++;
                        apiLogger.warn(`⚠️ Failed to extract product data from: ${request.url}`);
                    }
                    
                } catch (extractionError) {
                    errorCount++;
                    console.error(`❌ Error extracting product from ${request.url}:`, extractionError);
                }
            },
            
            failedRequestHandler: async ({ request, error }) => {
                errorCount++;
                console.error(`❌ Failed to load page: ${request.url}`, error);
            },
        });
        
        // Add all product URLs to crawler
        const urlsToRequest = urlsToProcess.map(url => ({ url }));
        await productCrawler.run(urlsToRequest);
        
        apiLogger.info(`🎉 [TrueNorthSeedScraper] Product extraction completed!`);
        apiLogger.info(`📊 Success: ${successCount}, Errors: ${errorCount}, Total: ${urlsToProcess.length}`);
        
    } catch (error) {
        console.error(`❌ [TrueNorthSeedScraper] Failed to process product pages:`, error);
        throw error;
    }

    // Step 4: Return results
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // ✅ Aggregated completion logging
    apiLogger.info('[True North] ✅ Crawling completed', {
        '📊 Products': products.length,
        '📄 URLs Processed': urlsToProcess.length,
        '✅ Success': successCount,
        '❌ Errors': errorCount,
        '⏱️ Duration': `${(processingTime / 1000).toFixed(2)}s`,
        '🤖 Robots.txt': hasExplicitCrawlDelay ? 'enforced' : 'default',
        '🚀 Rate': `${calculatedMaxRate} req/min`
    });
    
    return {
        products,
        totalProducts: products.length,
        totalPages: Math.ceil(urlsToProcess.length / 20), // Assuming ~20 products per page
        timestamp: new Date(),
        duration: processingTime
    };
}
