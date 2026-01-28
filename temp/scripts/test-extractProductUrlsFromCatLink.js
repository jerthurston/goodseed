"use strict";
/**
 * 🔍 TRUE NORTH SEED BANK - extractProductUrlsFromCatLink FOCUSED TEST
 *
 * This test specifically focuses on the extractProductUrlsFromCatLink function
 * which is failing in the scraper logs (finding 0 products)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const polite_crawler_1 = require("@/lib/utils/polite-crawler");
const constants_1 = require("@/scrapers/(common)/constants");
const crawlee_1 = require("crawlee");
const extractProductUrlsFromCatLink_1 = require("../utils/extractProductUrlsFromCatLink");
const scraper_factory_1 = require("@/lib/factories/scraper-factory");
const client_1 = require("@prisma/client");
async function testExtractProductUrlsFromCatLink() {
    console.log('🔍 ========================================');
    console.log('🔍 TRUE NORTH - extractProductUrlsFromCatLink TEST');
    console.log('🔍 ========================================\n');
    // Initialize
    const prisma = new client_1.PrismaClient();
    const scraperFactory = new scraper_factory_1.ScraperFactory(prisma);
    const siteConfig = scraperFactory.getSiteInfo('truenorthseedbank');
    const politeCrawler = new polite_crawler_1.SimplePoliteCrawler({
        userAgent: constants_1.USERAGENT,
        acceptLanguage: constants_1.ACCEPTLANGUAGE,
        minDelay: 1000,
        maxDelay: 2000
    });
    const robotsRules = await politeCrawler.parseRobots(siteConfig.baseUrl);
    // Test URLs from the actual logs
    const testUrls = [
        "https://www.truenorthseedbank.com/cannabis-seeds/regular-seeds",
        "https://www.truenorthseedbank.com/cannabis-seeds/feminized-seeds",
        "https://www.truenorthseedbank.com/cannabis-seeds/autoflowering-seeds"
    ];
    for (const testUrl of testUrls) {
        console.log(`\n🌐 Testing category: ${testUrl}`);
        console.log('='.repeat(60));
        try {
            // Test our function
            console.log('🧪 Running extractProductUrlsFromCatLink...');
            const productUrls = await (0, extractProductUrlsFromCatLink_1.extractProductUrlsFromCatLink)(testUrl, 1, robotsRules);
            console.log(`📊 Result: Found ${productUrls.length} product URLs`);
            if (productUrls.length > 0) {
                console.log('✅ SUCCESS! Product URLs found:');
                productUrls.slice(0, 5).forEach((url, i) => {
                    console.log(`   ${i + 1}. ${url}`);
                });
                if (productUrls.length > 5) {
                    console.log(`   ... and ${productUrls.length - 5} more`);
                }
            }
            else {
                console.log('❌ PROBLEM: No product URLs found!');
                console.log('🔍 Let me analyze the page structure...\n');
                // Debug the page structure
                await analyzePageStructure(testUrl);
            }
        }
        catch (error) {
            console.error(`❌ Error testing ${testUrl}:`, error);
        }
    }
    await prisma.$disconnect();
}
async function analyzePageStructure(url) {
    console.log(`🕵️ ANALYZING PAGE STRUCTURE: ${url}`);
    console.log('-'.repeat(50));
    const crawler = new crawlee_1.CheerioCrawler({
        requestHandlerTimeoutSecs: 30,
        maxRequestRetries: 1,
        requestHandler: async ({ $, request }) => {
            console.log(`📄 Page loaded: ${request.url}`);
            // Basic page info
            const title = $('title').text();
            console.log(`📝 Page title: "${title}"`);
            const h1Elements = $('h1');
            console.log(`📝 H1 elements: ${h1Elements.length}`);
            h1Elements.each((i, el) => {
                console.log(`   H1 ${i + 1}: "${$(el).text().trim()}"`);
            });
            // Count all links
            const allLinks = $('a[href]');
            console.log(`🔗 Total links: ${allLinks.length}`);
            // Test the selectors our function uses
            const selectors = [
                { name: 'a[href*="/product/"]', selector: 'a[href*="/product/"]' },
                { name: '.product-item a', selector: '.product-item a' },
                { name: '.woocommerce-loop-product__link', selector: '.woocommerce-loop-product__link' },
                { name: '.product a[href]', selector: '.product a[href]' },
                { name: '.products .product a', selector: '.products .product a' },
                { name: 'h2.woocommerce-loop-product__title a', selector: 'h2.woocommerce-loop-product__title a' },
                { name: '.product-title a', selector: '.product-title a' }
            ];
            console.log('\n🎯 TESTING OUR CURRENT SELECTORS:');
            selectors.forEach(({ name, selector }) => {
                const matches = $(selector);
                console.log(`   ${name}: ${matches.length} matches`);
                if (matches.length > 0 && matches.length <= 3) {
                    matches.each((i, el) => {
                        const href = $(el).attr('href');
                        const text = $(el).text().trim().substring(0, 30);
                        console.log(`     → "${text}" → ${href}`);
                    });
                }
            });
            // Look for other potential selectors
            console.log('\n🔍 LOOKING FOR OTHER PATTERNS:');
            const otherSelectors = [
                { name: 'Any link with "product"', selector: 'a[href*="product"]' },
                { name: 'Any link with "seeds"', selector: 'a[href*="seeds"]' },
                { name: 'Links in .product class', selector: '.product a' },
                { name: 'Links in .item class', selector: '.item a' },
                { name: 'Links in .card class', selector: '.card a' },
                { name: 'Links with product images', selector: 'a img[alt*="seed"]' }
            ];
            otherSelectors.forEach(({ name, selector }) => {
                const matches = $(selector);
                console.log(`   ${name}: ${matches.length} matches`);
                if (matches.length > 0 && matches.length <= 5) {
                    matches.slice(0, 3).each((i, el) => {
                        const href = $(el).attr('href');
                        const text = $(el).text().trim().substring(0, 30);
                        console.log(`     → "${text}" → ${href}`);
                    });
                }
            });
            // Look for class patterns that might indicate products
            console.log('\n🏷️ ANALYZING CSS CLASSES:');
            const elements = $('[class*="product"], [class*="item"], [class*="card"], [class*="seed"]');
            console.log(`   Elements with product/item/card/seed classes: ${elements.length}`);
            if (elements.length > 0 && elements.length <= 10) {
                elements.slice(0, 5).each((i, el) => {
                    const classes = $(el).attr('class');
                    const tag = el.tagName.toLowerCase();
                    console.log(`     <${tag} class="${classes}">`);
                });
            }
            // Sample random links for analysis
            console.log('\n📋 SAMPLE LINKS (first 10 for analysis):');
            allLinks.slice(0, 10).each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim().substring(0, 40);
                const classes = $(el).attr('class') || '';
                console.log(`   ${i + 1}. [${classes}] "${text}" → ${href}`);
            });
        }
    });
    await crawler.run([url]);
}
// Execute if run directly
if (require.main === module) {
    testExtractProductUrlsFromCatLink().catch(console.error);
}
exports.default = testExtractProductUrlsFromCatLink;
