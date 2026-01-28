import { canukSeedScraper } from '../core/canukseedsScraper';
import CANUK_SEEDS_PRODUCT_SELECTORS from '../core/selectors';

/**
 * Test script với chỉ 2 product URLs để test nhanh
 */
async function testCanukSeedsLimited() {
    console.log('🧪 Testing Canuk Seeds with 2 URLs only...\n');
    
    // Mock input data - chỉ 2 URLs để test
    const testProductUrls = [
        'https://www.canukseeds.com/2046-fast-version-feminized-seeds-canuk-seeds',
        'https://www.canukseeds.com/24k-gold-feminized-seeds-canuk-seeds'
    ];
    
    console.log('📋 INPUT DATA:');
    console.log(`- Total URLs: ${testProductUrls.length}`);
    testProductUrls.forEach((url, i) => {
        console.log(`  ${i + 1}. ${url}`);
    });
    
    console.log('\n🎯 Expected Output:');
    console.log('- Array of 2 ProductCardDataFromCrawling objects');
    console.log('- Each with: name, seedType, cannabisType, thcLevel, cbdLevel, pricings, image');
    
    console.log('\n📝 Note: Cần implement Step 3 trong canukseedsScraper.ts');
    console.log('- Input URLs: testProductUrls');
    console.log('- Process with CheerioCrawler');
    console.log('- Use extractProductFromDetailHTML function');
    console.log('- Return ProductsDataResultFromCrawling');
    
    return {
        inputUrls: testProductUrls,
        expectedOutputFormat: 'ProductsDataResultFromCrawling',
        nextStep: 'Implement Step 3 in canukseedsScraper.ts'
    };
}

// Run the test
testCanukSeedsLimited()
    .then(result => {
        console.log('\n✅ Test Input Ready!');
        console.log('📊 Result:', result);
        console.log('\n🚀 Ready to implement product data extraction logic!');
    });