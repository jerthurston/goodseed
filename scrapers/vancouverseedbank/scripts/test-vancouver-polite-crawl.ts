/**
 * Test script cho Vancouver Polite Crawling
 * Chạy: npx tsx scripts/test-vancouver-polite-crawl.ts
 */

import { vancouverProductListScraper } from '@/scrapers/vancouverseedbank/core/vancouver-product-list-scraper';
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS } from '@/scrapers/vancouverseedbank/core/selectors';

// Create Vancouver site config
const vancouverSiteConfig: SiteConfig = {
    name: 'Vancouver Seed Bank',
    baseUrl: 'https://vancouverseedbank.ca',
    selectors: VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS,
    isImplemented: true
};

async function testVancouverPoliteCrawl() {
    console.log('🧪 Testing Vancouver Polite Crawling...');
    
    const siteConfig = vancouverSiteConfig;
    
    if (!siteConfig || !siteConfig.isImplemented) {
        throw new Error('Vancouver Seed Bank site config not found or not implemented');
    }

    try {
        const result = await vancouverProductListScraper(
            siteConfig,
            1, // startPage
            1, // endPage - chỉ test 1 trang
            false, // fullSiteCrawl
            {
                scrapingSourceUrl: 'https://vancouverseedbank.ca/shop/',
                sourceName: 'vancouver-test',
                dbMaxPage: 1
            }
        );

        console.log('✅ Test Results:');
        console.log(`   📦 Total products: ${result.totalProducts}`);
        console.log(`   📄 Total pages: ${result.totalPages}`);
        console.log(`   ⏱️ Duration: ${result.duration}ms`);
        console.log(`   🕒 Timestamp: ${result.timestamp}`);

        if (result.products.length > 0) {
            console.log('📋 Sample product:');
            console.log('   Name:', result.products[0].name);
            console.log('   URL:', result.products[0].url);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

testVancouverPoliteCrawl().catch(console.error);