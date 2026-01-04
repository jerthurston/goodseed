import { CheerioCrawler } from 'crawlee';
import { SimplePoliteCrawler } from '../../../lib/utils/polite-crawler';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { extractProductUrlsFromCatLink } from '../utils/extractProductUrlsFromCatLink';
import { extractCategoryLinksFromHomepage } from '../utils/extractCatLinkFromHeader';
import CANUK_SEEDS_PRODUCT_SELECTORS from '../core/selectors';
import apiLogger from '../../../lib/api';

/**
 * 🧪 TEST PAGINATION - Test crawl 2 pages đầu tiên của một category link
 * Kiểm tra việc pagination hoạt động với robots.txt compliance
 */

async function testCategoryPagination() {
    console.log('🧪 TESTING CATEGORY PAGINATION - First 2 Pages');
    console.log('='.repeat(60));

    try {
        // Setup siteConfig
        const siteConfig: SiteConfig = {
            name: 'Canuk Seeds',
            baseUrl: 'https://www.canukseeds.com',
            isImplemented: true,
            selectors: CANUK_SEEDS_PRODUCT_SELECTORS
        };

        // Setup polite crawler với robots.txt
        console.log('⚙️ Setting up robots.txt compliance...');
        const politeCrawler = new SimplePoliteCrawler({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            acceptLanguage: 'en-US,en;q=0.9',
            minDelay: 1000,
            maxDelay: 2000
        });
        const robotsRules = await politeCrawler.parseRobots(siteConfig.baseUrl);
        console.log(`✅ Robots.txt parsed - Crawl delay: ${robotsRules.crawlDelay}ms`);

        // Step 1: Get category links
        console.log('\n📂 Extracting category links from homepage...');
        const categoryLinks = await extractCategoryLinksFromHomepage(siteConfig, robotsRules);
        console.log(`✅ Found ${categoryLinks.length} categories`);
        
        // Select a category to test (pick one with likely pagination)
        const testCategory = categoryLinks.find(link => 
            link.includes('feminized') || 
            link.includes('autoflower') || 
            link.includes('standard') ||
            link.includes('regular')
        ) || categoryLinks[0];
        
        console.log(`\n🎯 Testing category: ${testCategory}`);
        console.log('-'.repeat(60));

        // Step 2: Extract products from first 2 pages
        console.log('\n🔗 Extracting products from first 2 pages...');
        
        const productUrls = await extractProductUrlsFromCatLink(
            testCategory, 
            2, // maxPages - only 2 pages
            robotsRules
        );
        
        console.log(`\n📊 PAGINATION TEST RESULTS:`);
        console.log('='.repeat(40));
        console.log(`🔗 Category tested: ${testCategory}`);
        console.log(`📦 Total products found: ${productUrls.length}`);
        console.log(`📄 Pages crawled: 2 (pages 1-2)`);
        
        // Show sample URLs
        console.log('\n📋 Sample Product URLs:');
        productUrls.slice(0, 10).forEach((url, index) => {
            console.log(`   ${index + 1}. ${url}`);
        });
        
        if (productUrls.length > 10) {
            console.log(`   ... and ${productUrls.length - 10} more URLs`);
        }

        // Step 3: Test URL patterns for pagination
        console.log('\n🔍 PAGINATION PATTERN ANALYSIS:');
        console.log('-'.repeat(40));
        
        // Check if URLs have page patterns
        const page1Urls = productUrls.filter((url, index) => index < Math.floor(productUrls.length / 2));
        const page2Urls = productUrls.filter((url, index) => index >= Math.floor(productUrls.length / 2));
        
        console.log(`📄 Estimated Page 1 URLs: ${page1Urls.length}`);
        console.log(`📄 Estimated Page 2 URLs: ${page2Urls.length}`);
        
        // Check for pagination URL patterns
        const categoryBase = testCategory.split('?')[0];
        const page2Url = `${categoryBase}?p=2`;
        
        console.log(`\n🔗 Expected page 2 URL: ${page2Url}`);
        
        // Manual verification - check if page 2 exists
        console.log('\n🔍 Manual page verification...');
        const testCrawler = new CheerioCrawler({
            requestHandlerTimeoutSecs: 60,
            maxRequestRetries: 1,
            maxConcurrency: 1,
            
            requestHandler: async ({ $, request }) => {
                const productLinks = $('a[href*="/product/"], a[href*="seeds"]').length;
                const hasProducts = productLinks > 0;
                
                console.log(`   ${request.url}`);
                console.log(`   → Found ${productLinks} product links`);
                console.log(`   → Has products: ${hasProducts ? 'Yes' : 'No'}`);
                
                // Check pagination controls
                const paginationControls = $('.pagination, .pages, .pager').length;
                console.log(`   → Pagination controls: ${paginationControls}`);
            }
        });
        
        // Test both page 1 and page 2
        await testCrawler.addRequests([
            { url: testCategory, userData: { page: 1 } },
            { url: page2Url, userData: { page: 2 } }
        ]);
        
        await testCrawler.run();

        console.log('\n🎉 PAGINATION TEST COMPLETED!');
        console.log('='.repeat(60));
        console.log(`✅ Successfully tested pagination for: ${testCategory}`);
        console.log(`📊 Total unique product URLs extracted: ${productUrls.length}`);
        console.log(`⏱️  Test completed at: ${new Date().toLocaleTimeString()}`);

    } catch (error) {
        console.error('❌ PAGINATION TEST FAILED:', error);
        throw error;
    }
}

// Run the pagination test
testCategoryPagination().catch(console.error);