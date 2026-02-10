/**
 * Crop King Seeds Product List Scraper (Refactored with CommonCrawler)
 * 
 * KIẾN TRÚC TỔNG QUAN:
 * - Uses CommonCrawler infrastructure for reusability
 * - Focuses only on Crop King Seeds-specific extraction logic
 * - Uses WordPress standard pagination handling (/page/N/)
 * - All common functionality delegated to CommonCrawler
 * 
 * DIFFERENCES FROM OTHER SCRAPERS:
 * - Uses product listing pages instead of sitemaps
 * - WooCommerce product structure with radio button pricing
 * - WordPress standard pagination (/page/N/)
 * - Cannabis-specific data extraction (THC/CBD, seed types)
 */

import { extractProductsFromHTML } from '@/scrapers/cropkingseeds/utils/extractProductFromHTML';
import { getScrapingUrl } from '@/scrapers/cropkingseeds/utils/getScrapingUrl';
import { validateSourceContext, validateScrapingMode, logScraperInitialization } from '@/scrapers/cropkingseeds/utils/validation';
import { ProductsDataResultFromCrawling } from '@/types/crawl.type';
import { CheerioAPI, CheerioCrawlingContext, Log } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { CommonCrawler, CommonScrapingContext, SiteSpecificRequestHandler } from '@/scrapers/(common)/CommonCrawler';
import { apiLogger } from '@/lib/helpers/api-logger';


/**
 * CropKingSeedsScraper - Site-specific implementation using CommonCrawler
 * 
 * NHIỆM VỤ:
 * 1. 🕷️ Extract sản phẩm từ Crop King Seeds (product listing pages)  
 * 2. 📄 Hỗ trợ WordPress standard pagination (/page/N/)
 * 3. 📋 Extract cannabis-specific data với WooCommerce structure
 * 4. ⚡ Sử dụng CommonCrawler infrastructure
 */

export async function CropKingSeedsScraper(
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
    
    // ===========================
    // 🛡️ VALIDATION PHASE
    // ===========================
    const validationResult = validateSourceContext(sourceContext, siteConfig);
    
    if (!validationResult.isValid) {
        throw new Error(validationResult.error || '[Crop King Seeds Scraper] sourceContext validation failed');
    }

    // Use validated context
    const validatedContext = validationResult.validatedContext!;

    // Validate scraping mode
    const mode = validateScrapingMode(startPage, endPage, fullSiteCrawl);

    // Calculate expected pages for logging
    const expectedPages = mode.isTestMode 
        ? (mode.effectiveEndPage || 1) 
        : validatedContext.dbMaxPage;

    // Log scraper initialization
    logScraperInitialization(siteConfig, validatedContext, {
        isTestMode: mode.isTestMode,
        startPage,
        endPage,
        fullSiteCrawl,
        expectedPages
    });

    // Convert sourceContext to CommonScrapingContext
    const commonContext: CommonScrapingContext = {
        scrapingSourceUrl: validatedContext.scrapingSourceUrl,
        sourceName: validatedContext.sourceName,
        dbMaxPage: validatedContext.dbMaxPage
    };

    // Define Crop King Seeds-specific request handler
    const cropKingSeedsRequestHandler: SiteSpecificRequestHandler = async (context, sharedData) => {
        const { $, request, log }: { 
            $: CheerioAPI; 
            request: CheerioCrawlingContext['request']; 
            log: Log 
        } = context;
        
        const pageNumber = request.userData?.pageNumber || 1;

        // Extract products and pagination info from current page using Crop King Seeds-specific logic
        const result = extractProductsFromHTML(
            $, 
            sharedData.siteConfig,
            sharedData.sourceContext.dbMaxPage,
            sharedData.startPage,
            sharedData.endPage,
            sharedData.fullSiteCrawl
        );

        // Update maxPages from first page
        if (pageNumber === 1 && result.maxPages) {
            sharedData.maxPages.value = result.maxPages;
            apiLogger.info(`[Crop King Seeds] Detected ${result.maxPages} total pages from WooCommerce pagination`);
        }
        
        // Add products to shared collection
        sharedData.allProducts.push(...result.products);
        sharedData.totalProducts.value += result.products.length;
        sharedData.actualPages.value++;

        apiLogger.logPageProgress({
            page: pageNumber,
            totalPages: sharedData.maxPages.value || sharedData.endPage || 1,
            productsFound: result.products.length,
            totalProductsSoFar: sharedData.totalProducts.value,
            url: request.url
        });

        // ✅ No need to save to dataset - products are collected in sharedData.allProducts array

        // Determine if we should crawl more pages (Crop King Seeds pagination logic)
        let shouldContinue = false;

        if (sharedData.startPage !== null && sharedData.startPage !== undefined && 
            sharedData.endPage !== null && sharedData.endPage !== undefined) {
            // Test mode: crawl specific range
            shouldContinue = pageNumber < sharedData.endPage;
            apiLogger.debug(`[Crop King Seeds] Test mode: Page ${pageNumber}/${sharedData.endPage}`);
        } else if (sharedData.maxPages.value && sharedData.maxPages.value > 0) {
            // Auto/Manual mode: crawl to detected max pages
            shouldContinue = pageNumber < sharedData.maxPages.value;
            apiLogger.debug(`[Crop King Seeds] Auto mode: Page ${pageNumber}/${sharedData.maxPages.value}`);
        } else {
            // Fallback: stop after first page if no pagination detected
            shouldContinue = false;
            apiLogger.debug(`[Crop King Seeds] No pagination detected, stopping after page ${pageNumber}`);
        }

        // Add next page to queue if needed
        if (shouldContinue) {
            const nextPageNumber = pageNumber + 1;
            const nextPageUrl = sharedData.getScrapingUrl(sharedData.sourceContext.scrapingSourceUrl, nextPageNumber);
            
            await sharedData.requestQueue.addRequest({
                url: nextPageUrl,
                userData: { pageNumber: nextPageNumber }
            });
            
            apiLogger.debug(`[Crop King Seeds] Added next page to queue: ${nextPageNumber}`);
        }
    };

    // Create and run CommonCrawler with Crop King Seeds-specific logic
    const crawler = new CommonCrawler(
        siteConfig,
        commonContext,
        cropKingSeedsRequestHandler,
        getScrapingUrl,
        startPage,
        endPage,
        fullSiteCrawl
    );

    return await crawler.crawl();
}

// Export the scraper function
export default CropKingSeedsScraper;
