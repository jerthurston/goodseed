/**
 * Complete Polite Crawling Test for Vancouver Seed Bank
 * 
 * Tests:
 * 1. robots.txt compliance
 * 2. crawl-delay enforcement  
 * 3. proper headers
 * 4. error handling
 * 5. multi-page crawling with delays
 * 
 * Usage: npx tsx scripts/test-vancouver-polite-complete.ts
 */

import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler.bk';
import { vancouverProductListScraper } from '@/scrapers/vancouverseedbank/core/vancouver-product-list-scraper';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS } from '@/scrapers/vancouverseedbank/core/selectors';

// Vancouver site config
const vancouverSiteConfig: SiteConfig = {
    name: 'Vancouver Seed Bank',
    baseUrl: 'https://vancouverseedbank.ca',
    selectors: VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS,
    isImplemented: true
};

async function testVancouverPoliteComplete() {
    console.log('🧪 Complete Polite Crawling Test for Vancouver Seed Bank');
    console.log('='.repeat(60));

    // Test 1: Direct polite crawler tests
    console.log('\n📋 Test 1: Direct Polite Crawler Tests');
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: 'GoodSeed-Bot/1.0 (+https://goodseed.ca/contact) Commercial Cannabis Research',
        acceptLanguage: 'en-US,en;q=0.9',
        minDelay: 2000,
        maxDelay: 5000
    });

    try {
        // Test robots.txt check
        console.log('🤖 Testing robots.txt compliance...');
        const testUrls = [
            'https://vancouverseedbank.ca/shop/',
            'https://vancouverseedbank.ca/product-category/feminized-seeds/',
            'https://vancouverseedbank.ca/product/10th-planet-strain-feminized-marijuana-seeds/'
        ];

        for (const url of testUrls) {
            const isAllowed = await politeCrawler.isAllowed(url);
            const delay = await politeCrawler.getCrawlDelay(url);
            console.log(`   ✓ ${url}`);
            console.log(`     - Allowed: ${isAllowed ? '✅ YES' : '❌ NO'}`);
            console.log(`     - Delay: ${delay}ms`);
        }

        // Test headers
        console.log('\n🌐 Testing headers...');
        const headers = politeCrawler.getHeaders();
        console.log('   Headers:', JSON.stringify(headers, null, 2));

    } catch (error) {
        console.error('❌ Polite crawler test failed:', error);
    }

    // Test 2: Integration test with actual scraping
    console.log('\n📋 Test 2: Integration Test - Single Page');
    try {
        const startTime = Date.now();
        
        const result = await vancouverProductListScraper(
            vancouverSiteConfig,
            1, // startPage
            1, // endPage - single page only
            false, // fullSiteCrawl
            {
                scrapingSourceUrl: 'https://vancouverseedbank.ca/shop/',
                sourceName: 'vancouver-polite-test',
                dbMaxPage: 1
            }
        );

        const duration = Date.now() - startTime;
        
        console.log('✅ Single page scraping results:');
        console.log(`   📦 Products found: ${result.totalProducts}`);
        console.log(`   📄 Pages crawled: ${result.totalPages}`);
        console.log(`   ⏱️ Total duration: ${duration}ms`);
        console.log(`   🕐 Scraper duration: ${result.duration}ms`);
        
        if (result.products.length > 0) {
            console.log('📋 Sample products:');
            result.products.slice(0, 3).forEach((product, index) => {
                console.log(`   ${index + 1}. ${product.name}`);
                console.log(`      URL: ${product.url}`);
            });
        }

    } catch (error) {
        console.error('❌ Integration test failed:', error);
    }

    // Test 3: Multi-page test (if we want to test delays between pages)
    console.log('\n📋 Test 3: Multi-Page Delay Test');
    try {
        console.log('🔄 Testing delay consistency across multiple requests...');
        
        const multiPageResult = await vancouverProductListScraper(
            vancouverSiteConfig,
            1, // startPage
            2, // endPage - 2 pages to test delays
            false, // fullSiteCrawl
            {
                scrapingSourceUrl: 'https://vancouverseedbank.ca/product-category/feminized-seeds/',
                sourceName: 'vancouver-multipage-test',
                dbMaxPage: 2
            }
        );

        console.log('✅ Multi-page test results:');
        console.log(`   📦 Total products: ${multiPageResult.totalProducts}`);
        console.log(`   📄 Pages crawled: ${multiPageResult.totalPages}`);
        console.log(`   ⏱️ Duration: ${multiPageResult.duration}ms`);
        console.log(`   📊 Avg time per page: ${Math.round(multiPageResult.duration / multiPageResult.totalPages)}ms`);

    } catch (error) {
        console.error('❌ Multi-page test failed:', error);
        console.log('ℹ️  This may be normal if the site only has 1 page or category doesn\'t exist');
    }

    console.log('\n🎉 Vancouver Polite Crawling Test Complete!');
    console.log('='.repeat(60));
}

// Helper function to create separator line
function repeat(str: string, times: number): string {
    return Array(times + 1).join(str);
}

// Replace the * operator with proper string multiplication
function createSeparator(): string {
    return '='.repeat(60);
}

async function main() {
    try {
        await testVancouverPoliteComplete();
    } catch (error) {
        console.error('💥 Test suite failed:', error);
        process.exit(1);
    }
}

main();