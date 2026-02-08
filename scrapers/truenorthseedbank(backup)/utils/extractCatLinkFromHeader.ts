/**
 * 🎯 TRUE NORTH SEED BANK CATEGORY LINK EXTRACTOR
 * 
 * Extracts category links from True North Seed Bank homepage header navigation
 * with comprehensive robots.txt compliance checking
 */

import { SiteConfig } from '@/lib/factories/scraper-factory';
import { RobotsRules } from '@/lib/utils/polite-crawler';
import { checkUrlAgainstRobots } from '@/scrapers/(common)/utils/checkUrlAgainstRobots';
import { CheerioAPI, CheerioCrawler } from 'crawlee';

/**
 * Extract category links from True North Seed Bank header navigation
 * @param $ - CheerioAPI instance
 * @param baseUrl - Base URL for True North Seed Bank
 * @param robotsRules - Robots.txt rules for compliance checking
 * @returns Array of category URLs
 */
export function extractCategoryLinksFromHeader(
    $: CheerioAPI, 
    baseUrl: string = "https://www.truenorthseedbank.com",
    robotsRules: RobotsRules
): string[] {
    const links: string[] = [];
    
    console.log(`🔍 [True North Seed Bank] Extracting category links from header navigation`);
    
    // Check main scraping path is allowed
    const scrapingUrl = `${baseUrl}/cannabis-seeds/`;
    const isScrapingUrlAllowed = checkUrlAgainstRobots(scrapingUrl, robotsRules);
    if (!isScrapingUrlAllowed) {
        console.log(`🚫 Scraping URL blocked: ${scrapingUrl}`);
        return [];
    }

    // Extract all links from navigation elements
    // True North Seed Bank uses similar structure to Canuk Seeds
    $('li a[href], nav a[href], .navigation a[href]').each((_, element) => {
        const href = $(element).attr('href');
        const linkText = $(element).text().trim();
        
        // Filter for cannabis-related category links
        if (href && (
            href.includes('/cannabis-seeds/') || 
            href.includes('/seeds/') ||
            href.includes('/category/')
        )) {
            // Create full URL
            const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
            
            // Check robots.txt compliance
            const isAllowed = checkUrlAgainstRobots(fullUrl, robotsRules);
            if (!isAllowed) {
                console.log(`🚫 [Robots.txt] Blocked: ${fullUrl}`);
                return;
            }
            
            // Add unique links only
            if (!links.includes(fullUrl)) {
                links.push(fullUrl);
                console.log(`✅ [Category Link] Found: ${linkText} → ${fullUrl}`);
            }
        }
    });
    
    console.log(`📊 [True North Seed Bank] Found ${links.length} category links`);
    return links;
}

/**
 * Extract category links from live homepage using Crawlee with robots.txt compliance
 * Fetch trực tiếp từ trang chủ để luôn có dữ liệu mới nhất với tuân thủ robots.txt
 * @param url - Homepage URL (default: True North Seed Bank homepage)
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
        
        // Apply robots.txt crawl delay BEFORE adding request
        if (robotsRules?.crawlDelay) {
            console.log(`⏱️ Applying robots.txt crawl delay: ${robotsRules.crawlDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, robotsRules.crawlDelay));
        }
        
        // Add homepage URL as request với robots.txt compliant headers
        console.log(`📥 Adding homepage request: ${siteConfig.baseUrl}`);
        await crawler.addRequests([{ 
            url: siteConfig.baseUrl,
            headers: {
                'User-Agent': robotsRules?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        }]);
        console.log(`✅ Homepage request added successfully`);
        
        // Run crawler and AWAIT completion
        console.log(`🚀 Starting crawler...`);
        await crawler.run().catch(async (error) => {
            console.error('❌ Crawler failed:', error);
            resolve([]); // Resolve with empty array on error
        });
        console.log(`✅ Crawler completed`);
    });
}
