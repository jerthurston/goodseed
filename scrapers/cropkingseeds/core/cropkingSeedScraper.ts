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
import { ProductsDataResultFromCrawling } from '@/types/crawl.type';
import { CheerioAPI, CheerioCrawlingContext, Log } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { CommonCrawler, CommonScrapingContext, SiteSpecificRequestHandler } from '@/scrapers/(common)/CommonCrawler';

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
    
    if (!sourceContext) {
        throw new Error('[Crop King Seeds Scraper] sourceContext is required');
    }

    // Convert sourceContext to CommonScrapingContext
    const commonContext: CommonScrapingContext = {
        scrapingSourceUrl: sourceContext.scrapingSourceUrl,
        sourceName: sourceContext.sourceName,
        dbMaxPage: sourceContext.dbMaxPage
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
            log.info(`[Crop King Seeds] Detected ${result.maxPages} total pages from WooCommerce pagination`);
        }
        
        // Add products to shared collection
        sharedData.allProducts.push(...result.products);
        sharedData.totalProducts.value += result.products.length;
        sharedData.actualPages.value++;

        log.info(`[Crop King Seeds] Page ${pageNumber}: Found ${result.products.length} products`);

        // Save page data to dataset
        await sharedData.dataset.pushData({
            pageNumber,
            url: request.url,
            products: result.products,
            extractedAt: new Date().toISOString()
        });

        // Determine if we should crawl more pages (Crop King Seeds pagination logic)
        let shouldContinue = false;

        if (sharedData.startPage !== null && sharedData.startPage !== undefined && 
            sharedData.endPage !== null && sharedData.endPage !== undefined) {
            // Test mode: crawl specific range
            shouldContinue = pageNumber < sharedData.endPage;
            log.info(`[Crop King Seeds] Test mode: Page ${pageNumber}/${sharedData.endPage}`);
        } else if (sharedData.maxPages.value && sharedData.maxPages.value > 0) {
            // Auto/Manual mode: crawl to detected max pages
            shouldContinue = pageNumber < sharedData.maxPages.value;
            log.info(`[Crop King Seeds] Auto mode: Page ${pageNumber}/${sharedData.maxPages.value}`);
        } else {
            // Fallback: stop after first page if no pagination detected
            shouldContinue = false;
            log.info(`[Crop King Seeds] No pagination detected, stopping after page ${pageNumber}`);
        }

        // Add next page to queue if needed
        if (shouldContinue) {
            const nextPageNumber = pageNumber + 1;
            const nextPageUrl = sharedData.getScrapingUrl(sharedData.sourceContext.scrapingSourceUrl, nextPageNumber);
            
            await sharedData.requestQueue.addRequest({
                url: nextPageUrl,
                userData: { pageNumber: nextPageNumber }
            });
            
            log.info(`[Crop King Seeds] Added next page to queue: ${nextPageNumber}`);
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
