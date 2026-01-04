import { canukSeedScraper } from '../core/canukseedsScraper';
import CANUK_SEEDS_PRODUCT_SELECTORS from '../core/selectors';
import { extractProductUrlsFromCatLink } from '../utils/extractProductUrlsFromCatLink';

/**
 * Test script với input data giới hạn để kiểm tra full pipeline
 */
async function testCanukSeedsWithLimitedInput() {
    console.log('🧪 Testing Canuk Seeds Scraper with Limited Input...\n');
    
    const startTime = Date.now();
    
    try {
        console.log('📊 INPUT CONFIGURATION:');
        console.log('- Test categories: 2 categories only');
        console.log('- Max product URLs per category: 10 URLs');
        console.log('- Total expected: ~20 product URLs max\n');
        
        // Test categories (limited to 2)
        const testCategories = [
            'https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds',
            'https://www.canukseeds.com/buy-canuk-seeds/auto-feminized-seeds'
        ];
        
        console.log('🚀 Step 1: Extract Product URLs from Test Categories');
        console.log('=' .repeat(60));
        
        const allProductUrls: string[] = [];
        
        for (let i = 0; i < testCategories.length; i++) {
            const categoryUrl = testCategories[i];
            console.log(`📂 Processing category ${i + 1}/${testCategories.length}: ${categoryUrl}`);
            
            const productUrls = await extractProductUrlsFromCatLink(categoryUrl);
            
            // Limit to 10 URLs per category for testing
            const limitedUrls = productUrls
                .filter(url => url !== 'https://www.canukseeds.com/#') // Remove invalid URLs
                .slice(0, 10);
            
            allProductUrls.push(...limitedUrls);
            
            console.log(`✅ Found ${productUrls.length} URLs, using ${limitedUrls.length} for testing`);
        }
        
        console.log(`\n📊 TOTAL PRODUCT URLs FOR TESTING: ${allProductUrls.length}`);
        console.log('\n📝 Sample URLs:');
        allProductUrls.slice(0, 5).forEach((url, i) => {
            console.log(`  ${i + 1}. ${url}`);
        });
        
        if (allProductUrls.length > 5) {
            console.log(`  ... and ${allProductUrls.length - 5} more URLs`);
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('🎯 READY FOR PRODUCT DATA EXTRACTION');
        console.log('Input data prepared successfully!');
        console.log(`Total URLs to process: ${allProductUrls.length}`);
        console.log('Next step: Implement product data extraction logic');
        
        const endTime = Date.now();
        console.log(`⏱️  URL Collection Time: ${endTime - startTime}ms`);
        
        return {
            categories: testCategories.length,
            productUrls: allProductUrls,
            totalUrls: allProductUrls.length,
            sampleUrls: allProductUrls.slice(0, 5)
        };
        
    } catch (error) {
        console.error('\n❌ Test failed with error:');
        console.error(error);
        throw error;
    }
}

// Run the test
testCanukSeedsWithLimitedInput()
    .then(result => {
        console.log('\n✅ INPUT DATA PREPARATION SUCCESSFUL!');
        console.log('📋 Summary:', result);
    })
    .catch(error => {
        console.error('❌ Failed:', error);
        process.exit(1);
    });