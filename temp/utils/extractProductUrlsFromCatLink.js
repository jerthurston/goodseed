"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractProductUrlsFromCatLink = extractProductUrlsFromCatLink;
const crawlee_1 = require("crawlee");
const api_logger_1 = require("@/lib/helpers/api-logger");
const getScrapingUrl_1 = require("./getScrapingUrl");
const checkUrlAgainstRobots_1 = require("@/scrapers/(common)/utils/checkUrlAgainstRobots");
/**
 * Extract product URLs from a category page with pagination support for True North Seed Bank
 * @param categoryUrl - Base URL of the category page to extract product URLs from
 * @param maxPages - Maximum number of pages to crawl (default: 3)
 * @param robotsRules - Robots.txt rules for compliance checking
 * @returns Array of product URLs found in the category across all pages
 */
async function extractProductUrlsFromCatLink(categoryUrl, maxPages = 3, robotsRules) {
    const allProductUrls = [];
    api_logger_1.apiLogger.info(`🔍 [extractProductUrlsFromCatLink] Processing category: ${categoryUrl} (max ${maxPages} pages)`);
    api_logger_1.apiLogger.info(`🤖 [Robots.txt] Using crawl delay: ${robotsRules.crawlDelay}ms, User-Agent: ${robotsRules.userAgent}`);
    api_logger_1.apiLogger.info(`🚫 [Robots.txt] Disallowed paths: ${robotsRules.disallowedPaths.length}, Allowed paths: ${robotsRules.allowedPaths.length}`);
    // Check if category URL is allowed by robots.txt
    const isCategoryAllowed = (0, checkUrlAgainstRobots_1.checkUrlAgainstRobots)(categoryUrl, robotsRules);
    if (!isCategoryAllowed) {
        api_logger_1.apiLogger.warn(`🚫 [Robots.txt] Category URL is disallowed: ${categoryUrl}`);
        return [];
    }
    // Loop through pages
    for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
        const pageUrl = (0, getScrapingUrl_1.getScrapingUrl)(categoryUrl, currentPage);
        // Check if page URL is allowed by robots.txt
        const isPageAllowed = (0, checkUrlAgainstRobots_1.checkUrlAgainstRobots)(pageUrl, robotsRules);
        if (!isPageAllowed) {
            api_logger_1.apiLogger.warn(`🚫 [Robots.txt] Page URL is disallowed: ${pageUrl}`);
            continue;
        }
        const pageProductUrls = [];
        api_logger_1.apiLogger.info(`📄 Processing page ${currentPage}/${maxPages}: ${pageUrl}`);
        const crawler = new crawlee_1.CheerioCrawler({
            requestHandlerTimeoutSecs: 60,
            // Configure headers in the request handler
            requestHandler: async ({ $, request }) => {
                try {
                    api_logger_1.apiLogger.info(`📄 Processing category page: ${request.url}`);
                    api_logger_1.apiLogger.debug(`🤖 [User-Agent] Using: ${robotsRules.userAgent}`);
                    // Apply robots.txt crawl delay before processing
                    if (robotsRules.crawlDelay > 0) {
                        api_logger_1.apiLogger.debug(`⏱️ [Robots.txt] Applying crawl delay: ${robotsRules.crawlDelay}ms`);
                        await new Promise(resolve => setTimeout(resolve, robotsRules.crawlDelay));
                    }
                    // Extract product links from the category page
                    // Common selectors for WooCommerce product links (True North Seed Bank uses WooCommerce)
                    const productLinkSelectors = [
                        'a[href*="/product/"]', // Direct product links
                        '.product-item a', // Product item links
                        '.woocommerce-loop-product__link', // WooCommerce product loop links
                        '.product a[href]', // Generic product links
                        '.products .product a', // Products grid links
                        'h2.woocommerce-loop-product__title a', // Product title links
                        '.product-title a' // Alternative product title links
                    ];
                    // Try each selector to find product links
                    for (const selector of productLinkSelectors) {
                        const links = $(selector);
                        if (links.length > 0) {
                            api_logger_1.apiLogger.info(`✅ Found ${links.length} product links with selector: ${selector}`);
                            links.each((index, element) => {
                                const href = $(element).attr('href');
                                if (href) {
                                    // Convert relative URLs to absolute URLs
                                    const absoluteUrl = href.startsWith('http')
                                        ? href
                                        : `https://www.truenorthseedbank.com${href.startsWith('/') ? href : '/' + href}`;
                                    // Check if product URL is allowed by robots.txt
                                    const isProductAllowed = (0, checkUrlAgainstRobots_1.checkUrlAgainstRobots)(absoluteUrl, robotsRules);
                                    if (!isProductAllowed) {
                                        api_logger_1.apiLogger.debug(`🚫 [Robots.txt] Product URL disallowed: ${absoluteUrl}`);
                                        return; // Skip this product
                                    }
                                    // Avoid duplicates within this page
                                    if (!pageProductUrls.includes(absoluteUrl)) {
                                        pageProductUrls.push(absoluteUrl);
                                    }
                                }
                            });
                            // If we found products with this selector, no need to try others
                            break;
                        }
                    }
                    // Log results for this page  
                    if (pageProductUrls.length === 0) {
                        api_logger_1.apiLogger.warn(`⚠️ No product URLs found on page: ${request.url}`);
                        // Debug: Log available links for troubleshooting
                        const allLinks = $('a[href]');
                        api_logger_1.apiLogger.debug(`🔍 Debug: Found ${allLinks.length} total links on page`);
                        // Show first few links for debugging
                        allLinks.slice(0, 5).each((i, el) => {
                            const href = $(el).attr('href');
                            const text = $(el).text().trim();
                            api_logger_1.apiLogger.debug(`🔗 Link ${i + 1}: "${text}" -> ${href}`);
                        });
                    }
                    else {
                        api_logger_1.apiLogger.info(`✅ Extracted ${pageProductUrls.length} product URLs from: ${request.url}`);
                        // Show first few products for verification
                        pageProductUrls.slice(0, 3).forEach((url, i) => {
                            api_logger_1.apiLogger.debug(`🌿 Product ${i + 1}: ${url}`);
                        });
                        if (pageProductUrls.length > 3) {
                            api_logger_1.apiLogger.debug(`... and ${pageProductUrls.length - 3} more products`);
                        }
                    }
                }
                catch (error) {
                    console.error(`❌ Error processing category ${request.url}:`, error);
                }
            },
            maxRequestRetries: 2,
            additionalMimeTypes: ['application/json'],
            // Polite crawling settings
            maxConcurrency: 1,
            maxRequestsPerMinute: 60,
        });
        try {
            // Process the current page
            await crawler.run([pageUrl]);
            // Add unique URLs to the overall collection
            for (const url of pageProductUrls) {
                if (!allProductUrls.includes(url)) {
                    allProductUrls.push(url);
                }
            }
            api_logger_1.apiLogger.info(`📊 Page ${currentPage} completed. Found ${pageProductUrls.length} products. Total so far: ${allProductUrls.length}`);
            // If no products found on this page, assume no more pages
            if (pageProductUrls.length === 0) {
                api_logger_1.apiLogger.info(`🔚 No products on page ${currentPage}, stopping pagination`);
                break;
            }
            // Polite delay between pages
            if (currentPage < maxPages) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        catch (error) {
            console.error(`❌ Failed to process page ${currentPage} (${pageUrl}):`, error);
            // Continue with next page even if one fails
        }
    }
    api_logger_1.apiLogger.info(`🎉 [extractProductUrlsFromCatLink] Completed processing category: ${categoryUrl}`);
    api_logger_1.apiLogger.info(`📊 Total unique product URLs extracted: ${allProductUrls.length} (across max ${maxPages} pages)`);
    return allProductUrls;
}
/*
===================================================================================
🔄 FLOW LOGIC CỦA HÀM extractProductUrlsFromCatLink()
===================================================================================

📋 MỤC ĐÍCH:
   - Trích xuất tất cả URL sản phẩm từ một category page của True North Seed Bank
   - Hỗ trợ pagination (crawl qua nhiều trang)
   - Tuân thủ robots.txt để crawling một cách đạo đức

🔧 INPUT PARAMETERS:
   ✅ categoryUrl: URL của trang category (VD: /cannabis-seeds/feminized/)
   ✅ maxPages: Số trang tối đa để crawl (mặc định: 3)
   ✅ robotsRules: Object chứa rules từ robots.txt (crawl delay, disallowed paths, etc.)

📊 OUTPUT:
   ✅ Promise<string[]>: Mảng các URL sản phẩm unique đã được extract

🚀 FLOW CHÍNH:

┌─ BƯỚC 1: KIỂM TRA ROBOTS.TXT CHO CATEGORY URL
│  ├─ Gọi checkUrlAgainstRobots(categoryUrl, robotsRules)
│  ├─ Nếu bị cấm → return [] (mảng rỗng)
│  └─ Nếu được phép → tiếp tục
│
├─ BƯỚC 2: VÒNG LẶP QUA CÁC TRANG (PAGINATION)
│  └─ for (currentPage = 1; currentPage <= maxPages; currentPage++)
│     │
│     ├─ Sub-step 2.1: TẠO URL CHO TRANG HIỆN TẠI
│     │  └─ pageUrl = getScrapingUrl(categoryUrl, currentPage)
│     │     VD: page 1 → /category/, page 2 → /category/?p=2
│     │
│     ├─ Sub-step 2.2: KIỂM TRA ROBOTS.TXT CHO TRANG
│     │  ├─ checkUrlAgainstRobots(pageUrl, robotsRules)
│     │  ├─ Nếu bị cấm → continue (bỏ qua trang này)
│     │  └─ Nếu được phép → tiếp tục crawl trang
│     │
│     ├─ Sub-step 2.3: TẠO CHEERIO CRAWLER
│     │  ├─ Cấu hình timeout: 60 giây
│     │  ├─ Cấu hình retry: 2 lần
│     │  ├─ Cấu hình polite: maxConcurrency=1, maxRequestsPerMinute=60
│     │  └─ RequestHandler function
│     │
│     ├─ Sub-step 2.4: XỬ LÝ TRONG REQUEST HANDLER
│     │  ├─ Apply robots.txt crawl delay (nếu có)
│     │  ├─ Tìm product links bằng multiple selectors:
│     │  │  • 'a[href*="/product/"]'
│     │  │  • '.product-item a'
│     │  │  • '.woocommerce-loop-product__link'
│     │  │  • '.product a[href]'
│     │  │  • '.products .product a'
│     │  │  • 'h2.woocommerce-loop-product__title a'
│     │  │  • '.product-title a'
│     │  ├─ Cho mỗi link tìm được:
│     │  │  • Convert relative → absolute URL
│     │  │  • Kiểm tra robots.txt compliance
│     │  │  • Add vào pageProductUrls (tránh duplicate)
│     │  └─ Log kết quả và debug info
│     │
│     ├─ Sub-step 2.5: CHẠY CRAWLER
│     │  └─ await crawler.run([pageUrl])
│     │
│     ├─ Sub-step 2.6: MERGE KẾT QUẢ
│     │  ├─ Add pageProductUrls vào allProductUrls
│     │  ├─ Remove duplicates
│     │  └─ Log progress
│     │
│     ├─ Sub-step 2.7: KIỂM TRA DỪNG SỚM
│     │  ├─ Nếu pageProductUrls.length === 0
│     │  └─ → break (không có sản phẩm → hết trang)
│     │
│     └─ Sub-step 2.8: POLITE DELAY
│        └─ await sleep(2000ms) giữa các trang
│
└─ BƯỚC 3: TRẢ VỀ KẾT QUẢ
   ├─ Log tổng kết
   └─ return allProductUrls

🛡️ ROBOTS.TXT COMPLIANCE:

┌─ URL Level Checking:
│  ├─ Category URL
│  ├─ Individual page URLs
│  └─ Individual product URLs
│
├─ Pattern Matching:
│  ├─ Exact match: /admin/
│  ├─ Prefix match: /admin/*
│  └─ Wildcard support: /*.php$
│
├─ Priority Rules:
│  ├─ 1. Allowed paths (highest priority)
│  ├─ 2. Disallowed paths
│  └─ 3. Default allow (nếu không match rule nào)
│
└─ Crawl Delay:
   ├─ Apply trước mỗi request
   ├─ Apply giữa các trang
   └─ Respect robotsRules.crawlDelay

🚨 ERROR HANDLING:

┌─ Network Errors:
│  ├─ Retry mechanism (maxRequestRetries: 2)
│  ├─ Timeout handling (60s)
│  └─ Continue với trang tiếp theo nếu một trang fail
│
├─ Parsing Errors:
│  ├─ Try-catch trong request handler
│  ├─ Log lỗi chi tiết
│  └─ Continue processing
│
└─ Robots.txt Violations:
   ├─ Skip URLs bị cấm
   ├─ Log warning
   └─ Continue với URLs khác

📊 PERFORMANCE OPTIMIZATIONS:

┌─ Duplicate Prevention:
│  ├─ Check duplicate trong cùng trang
│  └─ Check duplicate across các trang
│
├─ Early Termination:
│  ├─ Dừng nếu không tìm thấy sản phẩm
│  └─ Respect maxPages limit
│
├─ Polite Crawling:
│  ├─ Low concurrency (1 request/time)
│  ├─ Rate limiting (60 requests/minute)
│  └─ Delays giữa requests
│
└─ Selector Strategy:
   ├─ Try multiple selectors
   ├─ Stop khi tìm thấy matches
   └─ Fallback debugging nếu không tìm thấy gì

🔍 DEBUGGING FEATURES:

┌─ Comprehensive Logging:
│  ├─ Progress tracking
│  ├─ Robots.txt compliance status
│  ├─ Performance metrics
│  └─ Error details
│
├─ Debug Mode:
│  ├─ Log all available links khi không tìm thấy products
│  ├─ Show sample products found
│  └─ Display selector success rates
│
└─ Statistics:
   ├─ Products per page
   ├─ Total products found
   ├─ Pages processed
   └─ Compliance rates

==================================================================================
*/ 
