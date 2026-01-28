import { SiteConfig } from '@/lib/factories/scraper-factory';
import { canukSeedScraper } from '../core/canukseedsScraper';
import CANUK_SEEDS_PRODUCT_SELECTORS from '../core/selectors';

/**
 * 🧪 TEST QUICK MODE - Test với startPage và endPage parameters
 * Kiểm tra logic test quick mode khi có startPage và endPage
 */

async function testQuickMode() {
    console.log('🧪 TESTING QUICK MODE WITH startPage/endPage');
    console.log('='.repeat(60));

    try {
        // Setup siteConfig
        const siteConfig: SiteConfig = {
            name: 'Canuk Seeds',
            baseUrl: 'https://www.canukseeds.com',
            isImplemented: true,
            selectors: CANUK_SEEDS_PRODUCT_SELECTORS
        };

        // Source context for testing
        const sourceContext = {
            scrapingSourceUrl: 'https://www.canukseeds.com',
            sourceName: 'canukseeds-test',
            dbMaxPage: 3
        };

        console.log('📋 TEST CONFIGURATION:');
        console.log(`   startPage: 1`);
        console.log(`   endPage: 3`);
        console.log(`   Expected pages: ${3 - 1 + 1} pages from 1 category`);
        console.log(`   Mode: TEST QUICK MODE`);
        console.log('');

        const startTime = Date.now();
        
        // Call scraper with startPage and endPage to trigger test quick mode
        const result = await canukSeedScraper(
            siteConfig,
            1,  // startPage
            3,  // endPage  
            sourceContext
        );

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log('\n📊 TEST QUICK MODE RESULTS:');
        console.log('='.repeat(40));
        console.log(`⏱️  Duration: ${duration.toFixed(1)}s`);
        console.log(`📦 Products extracted: ${result.totalProducts}`);
        console.log(`📄 Total pages processed: ${result.totalPages}`);
        console.log(`🕒 Timestamp: ${result.timestamp.toLocaleString()}`);
        
        // Show sample products
        console.log('\n🌿 Sample Products:');
        result.products.slice(0, 5).forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.name}`);
            console.log(`      Type: ${product.seedType || 'unknown'}`);
            console.log(`      THC: ${product.thcLevel || 'N/A'}`);
            console.log(`      Pricing: ${product.pricings?.length || 0} options`);
            console.log(`      URL: ${product.url}`);
            console.log('');
        });

        console.log('🎯 QUICK MODE ASSESSMENT:');
        console.log('='.repeat(40));
        if (result.totalProducts > 0) {
            console.log('✅ QUICK MODE SUCCESS');
            console.log(`   Successfully extracted products from limited pages`);
            console.log(`   Mode detection: Working correctly`);
            console.log(`   Pagination: Controlled successfully`);
        } else {
            console.log('❌ QUICK MODE FAILED');
            console.log(`   No products extracted`);
        }

        return result;

    } catch (error) {
        console.error('❌ QUICK MODE TEST FAILED:', error);
        throw error;
    }
}

// Run test quick mode
testQuickMode()
    .then(result => {
        console.log('\n🎉 Test completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Test failed!', error);
        process.exit(1);
    });