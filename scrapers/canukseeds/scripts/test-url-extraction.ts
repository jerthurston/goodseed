import { canukSeedScraper } from '../core/canukseedsScraper';
import CANUK_SEEDS_PRODUCT_SELECTORS from '../core/selectors';

/**
 * Test script để kiểm tra logic URL extraction của Canuk Seeds scraper
 */
async function testCanukSeedsUrlExtraction() {
    console.log('🧪 Testing Canuk Seeds URL extraction logic...\n');
    
    const startTime = Date.now();
    
    try {
        // Mock siteConfig như scraper factory sẽ pass
        const mockSiteConfig = {
            name: 'Canuk Seeds',
            baseUrl: 'https://www.canukseeds.com',
            isImplemented: true,
            selectors: CANUK_SEEDS_PRODUCT_SELECTORS
        };
        
        // Prepare test configuration
        const sourceContext = {
            scrapingSourceUrl: 'https://www.canukseeds.com',
            sourceName: 'canuk-seeds-test',
            dbMaxPage: 5
        };
        
        console.log('🚀 Starting URL extraction test...');
        console.log(`📊 Test Configuration:`, {
            siteConfig: mockSiteConfig.name,
            baseUrl: mockSiteConfig.baseUrl,
            sourceContext
        });
        console.log('\n' + '='.repeat(80) + '\n');
        
        // Run the scraper (currently only URL extraction phase)
        const result = await canukSeedScraper(
            mockSiteConfig,
            sourceContext
        );
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('\n' + '='.repeat(80));
        console.log('🎉 Test Results:');
        console.log('================');
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`📊 Result:`, result);
        
        // Since we're only testing URL extraction phase, the products array will be empty
        // But we should see logs about category extraction and URL processing
        
        console.log('\n✅ URL extraction test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed with error:');
        console.error(error);
        process.exit(1);
    }
}

// Run the test
testCanukSeedsUrlExtraction();