/**
 * Canuk Seeds Category Link Extractor
 * Simple extractor to get all links from header navigation
 */

import { SiteConfig } from '@/lib/factories/scraper-factory';
import { RobotsRules } from '@/lib/utils/polite-crawler';
import { checkUrlAgainstRobots } from '@/scrapers/(common)/utils/checkUrlAgainstRobots';
import { CheerioAPI, CheerioCrawler } from 'crawlee';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Extract all category links from Canuk Seeds header HTML
 * @param $ - CheerioAPI instance
 * @returns Array of URLs
 */
export function extractCategoryLinksFromHeader(
    $: CheerioAPI, 
    baseUrl: string = "https://www.canukseeds.com",
    robotsRules: RobotsRules
): string[] {
    const links: string[] = [];
    
    const scrapingUrl = `${baseUrl}/buy-canuk-seeds/`;
    // check scrapingUrl with robots.txt
    const isScrapingUrlAllowed = checkUrlAgainstRobots(scrapingUrl, robotsRules);
    if (!isScrapingUrlAllowed) {
        console.log(`🚫 Scraping URL bị chặn: ${scrapingUrl}`);
        return [];
    }

    // Extract all links from li elements
    // Tìm tất cả các thẻ <li> chứa thẻ <a> có thuộc tính href
    $('li a[href]').each((_, element) => {
        // Lấy giá trị href từ thẻ <a>
        const href = $(element).attr('href');
        
        // Kiểm tra href có tồn tại và chứa đường dẫn "/buy-canuk-seeds/"
        if (href && href.includes('/buy-canuk-seeds/')) {
            // Tạo URL đầy đủ: nếu href đã có http thì giữ nguyên, 
            // ngược lại thêm domain "https://www.canukseeds.com" vào trước
            const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
            
            // Kiểm tra link chưa tồn tại trong mảng để tránh trùng lặp
            if (!links.includes(fullUrl)) {
                // Thêm link vào mảng kết quả
                links.push(fullUrl);
            }
        }
    });
    
    return links;
}

/**
 * Extract category links from live homepage using Crawlee with robots.txt compliance
 * Fetch trực tiếp từ trang chủ để luôn có dữ liệu mới nhất với tuân thủ robots.txt
 * @param url - Homepage URL (default: Canuk Seeds homepage)
 * @param robotsRules - Robots.txt rules từ SimplePoliteCrawler
 * @returns Promise<Array of URLs>
 */
export async function extractCategoryLinksFromHomepage(
    siteConfig: SiteConfig,
    robotsRules: RobotsRules
): Promise<string[]> {
    return new Promise(async (resolve) => {
        console.log(`🌐 Fetching homepage: ${siteConfig.baseUrl}`);
    
        
        // Tạo crawler để fetch homepage với robots.txt compliance
        const crawler = new CheerioCrawler({
            requestHandler: async ({ $ }) => {
                console.log(`✅ Successfully loaded homepage, extracting links...`);
                
                // Gọi function chính để extract links từ CheerioAPI instance
                const links = extractCategoryLinksFromHeader($, siteConfig.baseUrl, robotsRules);
                
                // Filter links theo robots.txt rules
                if (robotsRules) {
                    const allowedLinks = links.filter(link => {
                        const linkPath = new URL(link).pathname;
                        
                        // Kiểm tra link có bị disallow không
                        const isDisallowed = robotsRules.disallowedPaths.some(disallowedPath => {
                            return linkPath === disallowedPath || linkPath.startsWith(disallowedPath);
                        });
                        
                        if (isDisallowed) {
                            console.log(`🚫 Link bị chặn: ${link}`);
                            return false;
                        }
                        
                        return true;
                    });
                    
                    console.log(`📋 Filtered links: ${allowedLinks.length}/${links.length} allowed by robots.txt`);
                    resolve(allowedLinks);
                } else {
                    resolve(links);
                }
            },
            failedRequestHandler: async ({ request, error }) => {
                console.error('Failed to extract links from homepage:', error);
            },
            // Set proper headers for requests với robots.txt user-agent
            requestHandlerTimeoutSecs: 30,
            maxRequestRetries: 3
        });
        
        // Add homepage URL as request với robots.txt compliant headers
        crawler.addRequests([{ 
            url: siteConfig.baseUrl,
            headers: {
                'User-Agent': robotsRules?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        }]);
        
        // Apply robots.txt crawl delay trước khi run
        if (robotsRules?.crawlDelay) {
            console.log(`⏱️ Applying robots.txt crawl delay: ${robotsRules.crawlDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, robotsRules.crawlDelay));
        }
        
        // Run crawler
        crawler.run().catch(async (error) => {
            console.error('Crawler failed:', error);
        });
    });
}
