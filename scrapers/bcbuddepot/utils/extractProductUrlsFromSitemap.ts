/**
 * 🗺️ BC BUD DEPOT SITEMAP CRAWLER (Crawlee Optimized)
 * 
 * Extracts product URLs from BC Bud Depot sitemap XML using Crawlee Sitemap utility
 */

import { Sitemap } from 'crawlee';
import { apiLogger } from '../../../lib/helpers/api-logger';

export async function extractProductUrlsFromSitemap(
    sitemapUrl: string
): Promise<string[]> {
    try {
        apiLogger.info(`[BC Bud Depot Sitemap] Loading sitemap from ${sitemapUrl}`);
        
        // Use Crawlee's optimized Sitemap utility
        const { urls } = await Sitemap.load(sitemapUrl);
        
        // Filter for BC Bud Depot product URLs
        const productUrls = urls.filter(url => {            
            // Filter for product URLs (BC Bud Depot product URLs contain '/marijuana-seeds/'). Mục đích để filter các url sản phẩm, không phải url danh mục và page trong danh sách sitemap.
            return url.includes('/marijuana-seeds/') && 
                   url.includes('bcbuddepot.com') &&
                   !url.includes('/page/') && // Exclude pagination URLs
                   !url.includes('/category/') && // Exclude category URLs
                   url.match(/\/marijuana-seeds\/[^\/]+\/[^\/]+\/?$/); // Match product detail pattern
        });
       
        
        apiLogger.info(`[BC Bud Depot Sitemap] Extracted ${productUrls.length} product URLs from ${sitemapUrl}`);
        
        return productUrls;
        
    } catch (error) {
        apiLogger.logError('[BC Bud Depot Sitemap] Error extracting URLs:', { 
            error, 
            sitemapUrl 
        });
        return [];
    }
}

/**
 * 📋 BC BUD DEPOT SITEMAP EXTRACTION NOTES (Crawlee Optimized):
 * 
 * ✅ CRAWLEE SITEMAP UTILITY BENEFITS:
 * - Uses Sitemap.load() for optimized XML parsing
 * - Better error handling and performance
 * - Follows Crawlee best practices
 * - Async operation for better resource management
 * 
 * ✅ PRODUCT URL PATTERN:
 * - https://bcbuddepot.com/marijuana-seeds/[breeder]/[product-slug]/
 * - Example: https://bcbuddepot.com/marijuana-seeds/dna-genetics/24k-gold/
 * - Example: https://bcbuddepot.com/marijuana-seeds/bc-bud-depot/bc-kush/
 * 
 * ❌ EXCLUDE:
 * - Category pages: /marijuana-seeds/[category]/
 * - Pagination: /marijuana-seeds/page/[number]/
 * - Non-product URLs
 * 
 * 🎯 EXTRACTION STRATEGY:
 * 1. Load sitemap using Crawlee's Sitemap utility
 * 2. Filter for product-specific URL patterns
 * 3. Return clean array of product detail URLs for crawling
 */