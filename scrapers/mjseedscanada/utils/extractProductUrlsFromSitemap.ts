/**
 * MJ SEEDS CANADA SITEMAP CRAWLER (Crawlee Optimized)
 * 
 * Extracts product URLs from MJ Seeds Canada sitemap XML using Crawlee Sitemap utility
 */

import { log, Sitemap } from 'crawlee';
import { apiLogger } from '../../../lib/helpers/api-logger';

export async function extractProductUrlsFromSitemap(
    sitemapUrl: string
): Promise<string[]> {
    try {
        apiLogger.info(`[MJ Seeds Canada Sitemap] Loading sitemap from ${sitemapUrl}`);
        
        const { urls } = await Sitemap.load(sitemapUrl);
        log.info(`[MJ Seeds Canada Sitemap] Loaded ${urls.length} URLs from ${sitemapUrl}`);
        // Từ kinh nghiệm để phỏng đoán các slug chứa sản phẩm và các slug loại trừ
        // Kết quả của việc filter sẽ lọc ra được danh sách product url chứa sản phẩm, không phải trang shop, cart, checkout hoặc page...
        const productUrls = urls.filter(url => {
            return (url.includes('mjseedscanada.ca')) && 
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
        
        apiLogger.info(`[MJ Seeds Canada Sitemap] Extracted ${productUrls.length} product URLs from ${sitemapUrl}`);
        return productUrls;
        
    } catch (error) {
        apiLogger.logError('[MJ Seeds Canada Sitemap] Error extracting URLs:', { 
            error, 
            sitemapUrl 
        });
        return [];
    }
}