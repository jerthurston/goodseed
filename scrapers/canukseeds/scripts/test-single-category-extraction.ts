import { extractProductUrlsFromCatLink } from '../utils/extractProductUrlsFromCatLink';

/**
 * Test script để kiểm tra đầu vào và đầu ra của extractProductUrlsFromCatLink
 */
async function testProductUrlExtraction() {
    console.log('🧪 Testing extractProductUrlsFromCatLink function...\n');
    
    // Test với 1 category cụ thể để xem output
    const testCategoryUrl = 'https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds';
    
    console.log(`🔍 Testing category: ${testCategoryUrl}`);
    console.log('Expected output: Array of product URLs from this category page\n');
    
    try {
        const productUrls = await extractProductUrlsFromCatLink(testCategoryUrl);
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 EXTRACTION RESULTS:');
        console.log('='.repeat(80));
        console.log(`🌟 Total product URLs found: ${productUrls.length}`);
        
        if (productUrls.length > 0) {
            console.log('\n📝 First 5 product URLs:');
            productUrls.slice(0, 5).forEach((url, index) => {
                console.log(`  ${index + 1}. ${url}`);
            });
            
            if (productUrls.length > 5) {
                console.log(`  ... and ${productUrls.length - 5} more URLs`);
            }
        } else {
            console.log('\n⚠️  No product URLs found!');
            console.log('This might indicate:');
            console.log('   - Wrong selectors in extractProductUrlsFromCatLink.ts');
            console.log('   - Category page has different structure');
            console.log('   - JavaScript loading issue');
        }
        
        console.log('\n' + '='.repeat(80));
        
        return productUrls;
        
    } catch (error) {
        console.error('❌ Error testing product URL extraction:', error);
        throw error;
    }
}

// Run the test
testProductUrlExtraction();