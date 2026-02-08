import { SiteConfig } from "@/lib/factories/scraper-factory";
import { apiLogger } from "@/lib/helpers/api-logger"
;
import { SimplePoliteCrawler } from "@/lib/utils/polite-crawler";
import { ACCEPTLANGUAGE, USERAGENT } from "@/scrapers/(common)/constants";
import { ProductsDataResultFromCrawling, ProductCardDataFromCrawling } from "@/types/crawl.type";
import { log, RequestQueue, CheerioCrawler } from "crawlee";
import { extractCategoryLinksFromHomepage } from "../utils/extractCatLinkFromHeader";
import { extractProductUrlsFromCatLink } from "../utils/extractProductUrlsFromCatLink";
import { extractProductFromDetailHTML } from "../utils/extractProductFromDetailHTML";

export async function canukSeedScraper(
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
        `[CanukSeedsScraper] starting to scrape with siteConfig`,{
            name:siteConfig.name,
            baseUrl,
            isImplemented:siteConfig.isImplemented,
            scrapingSourceUrl:sourceContext?.scrapingSourceUrl
        }
    );

    const runId = Date.now();
    
    // ✅ Initialize products array to store scraped data
    const products: ProductCardDataFromCrawling[] = [];
    
    // Initialize request queue (keep for deduplication & retry logic)
    const queueName = `${sourceContext?.sourceName}-queue-${runId}`;
    const requestQueue = await RequestQueue.open(queueName);
    
    // Initialize polited policy
    const politeCrawler = new SimplePoliteCrawler({
        userAgent:USERAGENT,
        acceptLanguage:ACCEPTLANGUAGE,
    });

    const robotsRules = await politeCrawler.parseRobots(baseUrl);
    const { crawlDelay, disallowedPaths, allowedPaths, userAgent, hasExplicitCrawlDelay } = robotsRules;

    // Log robots.txt rules for debugging
    apiLogger.info(`[CanukSeedsScraper] Robots.txt rules loaded:`, {
        crawlDelay: `${crawlDelay}ms`,
        hasExplicitCrawlDelay,
        disallowedCount: disallowedPaths.length,
        allowedCount: allowedPaths.length,
        userAgent
    });

    // Initialize constants
    let actualPages = 0;
    let productUrls: string[] = [];
    let urlsToProcess: string[] = [];

    // Check if this is test quick mode (startPage & endPage provided)
    const isTestQuickMode = startPage !== null && startPage !== undefined && 
                           endPage !== null && endPage !== undefined;

    // Step 1: Add product URLs to request queue
    try {
        // 1.1 Lấy được array product url từ việc extract các category link ở header
        const catLinkArr = await extractCategoryLinksFromHomepage(siteConfig , robotsRules);
        apiLogger.info(`[CanukSeedsScraper] extracted ${catLinkArr.length} category links`);
        
        // Determine how many categories to crawl
        // Test mode: Only first category with limited pages
        // Auto/Manual mode: All categories
        const categoriesToCrawl = isTestQuickMode ? [catLinkArr[0]] : catLinkArr;
        const maxPagesPerCategory = isTestQuickMode 
            ? (endPage! - startPage! + 1)  // Test: Use startPage/endPage range
            : sourceContext?.dbMaxPage;     // Auto/Manual: Use dbMaxPage from config
        
        apiLogger.info(`[CanukSeedsScraper] Crawling mode: ${isTestQuickMode ? '🧪 TEST' : '🚀 AUTO/MANUAL'}`, {
            totalCategories: catLinkArr.length,
            categoriesToCrawl: categoriesToCrawl.length,
            maxPagesPerCategory,
            pageRange: isTestQuickMode ? `${startPage}-${endPage}` : 'all'
        });
        
        // Process categories
        for (let i = 0; i < categoriesToCrawl.length; i++) {
            const catLink = categoriesToCrawl[i];
            apiLogger.debug(`📂 Processing category ${i + 1}/${categoriesToCrawl.length}: ${catLink}`);
            
            try {
                const productUrls = await extractProductUrlsFromCatLink(
                    catLink, 
                    maxPagesPerCategory, 
                    robotsRules
                );

                // Add unique URLs to processing list
                const newUrls = productUrls.filter(url => !urlsToProcess.includes(url));
                urlsToProcess.push(...newUrls);
                
                apiLogger.info(`✅ Category ${i + 1} completed. Found ${productUrls.length} products (${newUrls.length} new). Total: ${urlsToProcess.length}`);
                
                // Polite delay between categories (skip for last category)
                if (i < categoriesToCrawl.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
            } catch (categoryError) {
                apiLogger.warn(`⚠️ Failed to process category ${catLink}:`, { 
                    error: categoryError instanceof Error ? categoryError.message : String(categoryError) 
                });
                // Continue with next category
            }
        }
        
        apiLogger.info(`🎉 [CanukSeedsScraper] URL extraction completed! Total unique product URLs: ${urlsToProcess.length}`);
        
        if (urlsToProcess.length === 0) {
            throw new Error('No product URLs were extracted from any category');
        }

    } catch (error) {
        console.error(`❌ [CanukSeedsScraper] Failed to extract product URLs:`, error);
        throw error;
    }

    // Step 2: Add product URLs to request queue
    try {
        apiLogger.info(`📋 [CanukSeedsScraper] Adding ${urlsToProcess.length} product URLs to request queue`);
        
        for (const url of urlsToProcess) {
            await requestQueue.addRequest({ url });
        }
        
        apiLogger.info(`✅ [CanukSeedsScraper] All product URLs added to request queue`);
        
    } catch (error) {
        console.error(`❌ [CanukSeedsScraper] Failed to add URLs to request queue:`, error);
        throw error;
    }

    // Step 3: Process product pages and extract data
    let successCount = 0;
    let errorCount = 0;
    
    try {
        apiLogger.info(`🔄 [CanukSeedsScraper] Starting product data extraction from ${urlsToProcess.length} URLs`);
        
        // Calculate optimal maxRequestsPerMinute based on robots.txt crawlDelay
        // Priority: robots.txt Crawl-delay > intelligent defaults
        // If robots.txt has explicit Crawl-delay, we MUST respect it (polite crawling)
        // If no explicit delay, we can be more aggressive while staying polite
        
        // Calculate rate limit based on crawl delay
        // Formula: maxRate = 60000ms / crawlDelay (convert to requests per minute)
        // Example: crawlDelay=1000ms → maxRate=60 req/min
        const calculatedMaxRate = hasExplicitCrawlDelay 
            ? Math.floor(60000 / crawlDelay)  // ✅ PRIORITY: Respect robots.txt
            : 40;                               // Intelligent default when no explicit limit
        
        const maxConcurrency = 2; // 2 concurrent requests for better throughput (same for all modes)
        
        apiLogger.info(`[CanukSeedsScraper] Crawler settings (respecting robots.txt):`, {
            crawlDelayMs: crawlDelay,
            hasExplicitCrawlDelay,
            maxRequestsPerMinute: calculatedMaxRate,
            maxConcurrency,
            mode: isTestQuickMode ? 'test' : 'auto',
            strategy: hasExplicitCrawlDelay ? '🤖 robots.txt enforced' : '🧠 intelligent default'
        });
        
        // Create crawler for product data extraction with optimized settings
        const productCrawler = new CheerioCrawler({
            requestHandlerTimeoutSecs: 90,
            maxRequestRetries: 2,
            maxConcurrency: maxConcurrency, // ✅ Use calculated value
            maxRequestsPerMinute: calculatedMaxRate, // ✅ Use calculated rate from robots.txt
            
            requestHandler: async ({ $, request }) => {
                try {
                    apiLogger.debug(`🌐 Processing product: ${request.url}`);
                    
                    // ✅ ALWAYS use crawlDelay from robots.txt parsing
                    // If robots.txt has Crawl-delay → crawlDelay = explicit value
                    // If no Crawl-delay → crawlDelay = random delay (2000-5000ms from getRandomDelay())
                    const delaySource = hasExplicitCrawlDelay ? 'robots.txt Crawl-delay' : `intelligent default (${crawlDelay}ms random)`;
                    apiLogger.debug(`⏱️ Applying polite delay: ${crawlDelay}ms (from ${delaySource})`);
                    await new Promise(resolve => setTimeout(resolve, crawlDelay));
                    
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
                    apiLogger.logError(`❌ Error extracting product from ${request.url}:`, extractionError as Error);
                }
            },
            
            failedRequestHandler: async ({ request, error }) => {
                errorCount++;
                apiLogger.logError(`❌ Failed to load page: ${request.url}`, error as Error);
            },
        });
        
        // Add all product URLs to crawler
        const urlsToRequest = urlsToProcess.map(url => ({ url }));
        
        try {
            await productCrawler.run(urlsToRequest);
        } finally {
            // ✅ Cleanup: Drop request queue to free up memory/storage
            try {
                await requestQueue.drop();
                apiLogger.debug(`[Canuk Seeds] Cleaned up request queue: ${queueName}`);
            } catch (cleanupError) {
                apiLogger.logError('[Canuk Seeds] Failed to cleanup request queue:', cleanupError as Error, {
                    queueName
                });
            }
        }
        
        apiLogger.info(`🎉 [CanukSeedsScraper] Product extraction completed!`);
        apiLogger.info(`📊 Success: ${successCount}, Errors: ${errorCount}, Total: ${urlsToProcess.length}`);
        
    } catch (error) {
        apiLogger.logError(`❌ [CanukSeedsScraper] Failed to process product pages:`, error as Error);
        throw error;
    }

    // Step 4: Return results
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    return {
        products,
        totalProducts: products.length,
        totalPages: Math.ceil(urlsToProcess.length / 20), // Assuming ~20 products per page
        timestamp: new Date(),
        duration: processingTime
    };
}