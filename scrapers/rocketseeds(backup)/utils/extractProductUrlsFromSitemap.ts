/**
 * ROCKET SEEDS SITEMAP CRAWLER (Crawlee Optimized)
 * 
 * Extracts product URLs from Rocket Seeds sitemap XML using Crawlee Sitemap utility
 */
/**
 * Sitemap URLs:
 * https://rocketseeds.com/product-sitemap.xml	
 * https://rocketseeds.com/product-sitemap2.xml	
 * https://rocketseeds.com/product-sitemap3.xml	
 * https://rocketseeds.com/product-sitemap4.xml
 */

import { log, Sitemap } from 'crawlee';
import { apiLogger } from '../../../lib/helpers/api-logger';

export async function extractProductUrlsFromSitemap(
    sitemapUrl: string
): Promise<string[]> {
    try {
        apiLogger.info(`[Rocket Seeds Sitemap] Loading sitemap from ${sitemapUrl}`);
        
        const { urls } = await Sitemap.load(sitemapUrl);
        log.info(`[Rocket Seeds Sitemap] Loaded ${urls.length} URLs from ${sitemapUrl}`);
        // Từ kinh nghiệm để phỏng đoán các slug chứa sản phẩm và các slug loại trừ
        // Kết quả của việc filter sẽ lọc ra được danh sách product url chứa sản phẩm, không phải trang shop, cart, checkout hoặc page...
        const productUrls = urls.filter(url => {
            return (url.includes('rocketseeds.com')) && 
                   (url.includes('/product/') || url.includes('/marijuana-seeds/') || url.includes('-seeds/')) &&
                   !url.includes('/page/') &&
                   !url.includes('/category/') &&
                   !url.includes('/shop/') &&
                   !url.includes('/tag/') &&
                   !url.includes('/cart/') &&
                   !url.includes('/checkout/') &&
                   !url.includes('/my-account/') &&
                   url.match(/\/[^\/]+\/?$/);
        });

        apiLogger.info(`[Rocket Seeds Sitemap] Extracted ${productUrls.length} product URLs from ${sitemapUrl}`);
        return productUrls;
        
    } catch (error) {
        apiLogger.logError('[Rocket Seeds Sitemap] Error extracting URLs:', {
            error,
            sitemapUrl 
        });
        return [];
    }
}