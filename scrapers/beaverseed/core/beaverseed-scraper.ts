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

import { extractProductsFromHTML } from '@/scrapers/beaverseed/utils/extractProductsFromHTML';
import { getScrapingUrl } from '@/scrapers/beaverseed/utils/getScrapingUrl';
import { ProductsDataResultFromCrawling } from '@/types/crawl.type';
import { CheerioAPI, CheerioCrawlingContext } from 'crawlee';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { CommonCrawler, CommonScrapingContext, SiteSpecificRequestHandler } from '@/scrapers/(common)/CommonCrawler';

/**
 * BeaverSeedProductListScraper - Site-specific implementation using CommonCrawler
 * 
 * NHIỆM VỤ:
 * 1. 🕷️ Extract sản phẩm từ Beaver Seed (product listing pages)  
 * 2. 📄 Hỗ trợ jet-smart-filters pagination
 * 3. 📋 Extract cannabis-specific data với WooCommerce structure
 * 4. ⚡ Sử dụng CommonCrawler infrastructure
 */

export async function BeaverseedScraper(
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
        throw new Error('[Beaver Seed Scraper] sourceContext is required');
    }

    // Convert sourceContext to CommonScrapingContext
    const commonContext: CommonScrapingContext = {
        scrapingSourceUrl: sourceContext.scrapingSourceUrl,
        sourceName: sourceContext.sourceName,
        dbMaxPage: sourceContext.dbMaxPage
    };

    // Define Beaver Seed-specific request handler
    const beaverSeedRequestHandler: SiteSpecificRequestHandler = async (context, sharedData) => {
        const { $, request, log }: { 
            $: CheerioAPI; 
            request: CheerioCrawlingContext['request']; 
            log: any 
        } = context;
        
        const pageNumber = request.userData?.pageNumber || 1;

        // Extract products and pagination info from current page using Beaver Seed-specific logic
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
            log.info(`[Beaver Seed] Detected ${result.maxPages} total pages from jet-smart-filters pagination`);
        }

        // Add products to shared collection
        sharedData.allProducts.push(...result.products);
        sharedData.totalProducts.value += result.products.length;
        sharedData.actualPages.value++;

        log.info(`[Beaver Seed] Page ${pageNumber}: Found ${result.products.length} products`);

        // ✅ No need to save to dataset - products are collected in sharedData.allProducts array

        // Determine if we should crawl more pages (Beaver Seed pagination logic)
        let shouldContinue = false;

        if (sharedData.startPage !== null && sharedData.startPage !== undefined && 
            sharedData.endPage !== null && sharedData.endPage !== undefined) {
            // Test mode: crawl specific range
            shouldContinue = pageNumber < sharedData.endPage;
            log.info(`[Beaver Seed] Test mode: Page ${pageNumber}/${sharedData.endPage}`);
        } else if (sharedData.maxPages.value && sharedData.maxPages.value > 0) {
            // Auto/Manual mode: crawl to detected max pages
            shouldContinue = pageNumber < sharedData.maxPages.value;
            log.info(`[Beaver Seed] Auto mode: Page ${pageNumber}/${sharedData.maxPages.value}`);
        } else {
            // Fallback: stop after first page if no pagination detected
            shouldContinue = false;
            log.info(`[Beaver Seed] No pagination detected, stopping after page ${pageNumber}`);
        }

        // Add next page to queue if needed
        if (shouldContinue) {
            const nextPageNumber = pageNumber + 1;
            const nextPageUrl = sharedData.getScrapingUrl(sharedData.sourceContext.scrapingSourceUrl, nextPageNumber);
            
            await sharedData.requestQueue.addRequest({
                url: nextPageUrl,
                userData: { pageNumber: nextPageNumber }
            });
            
            log.info(`[Beaver Seed] Added next page to queue: ${nextPageNumber}`);
        }
    };

    // Create and run CommonCrawler with Beaver Seed-specific logic
    const crawler = new CommonCrawler(
        siteConfig,
        commonContext,
        beaverSeedRequestHandler,
        getScrapingUrl,
        startPage,
        endPage,
        fullSiteCrawl
    );

    return await crawler.crawl();
}

// Export the scraper function
export default BeaverseedScraper;