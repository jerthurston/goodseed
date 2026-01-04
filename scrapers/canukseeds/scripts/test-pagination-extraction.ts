import { extractProductUrlsFromCatLink } from '../utils/extractProductUrlsFromCatLink';

/**
 * Test pagination với 2 pages từ 1 category
 */
async function testPaginationExtraction() {
    console.log('🧪 Testing pagination extraction (2 pages)...\n');
    
    const testCategoryUrl = 'https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds';
    const maxPages = 2;
    
    console.log('📋 INPUT:');
    console.log(`- Category: ${testCategoryUrl}`);
    console.log(`- Max pages: ${maxPages}`);
    console.log(`- Expected: Products from page 1 + page 2\n`);
    
    try {
        const startTime = Date.now();
        
        const productUrls = await extractProductUrlsFromCatLink(testCategoryUrl, maxPages);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 PAGINATION EXTRACTION RESULTS:');
        console.log('='.repeat(80));
        console.log(`🌟 Total product URLs found: ${productUrls.length}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        
        if (productUrls.length > 0) {
            console.log('\n📝 Sample URLs (first 10):');
            productUrls.slice(0, 10).forEach((url, index) => {
                console.log(`  ${index + 1}. ${url}`);
            });
            
            if (productUrls.length > 10) {
                console.log(`  ... and ${productUrls.length - 10} more URLs`);
            }
        } else {
            console.log('\n⚠️  No product URLs found!');
        }
        
        console.log('\n🎯 Expected vs Actual:');
        console.log(`- Previous single page test: 36 URLs`);
        console.log(`- Current 2-page test: ${productUrls.length} URLs`);
        console.log(`- Ratio: ${(productUrls.length / 36).toFixed(1)}x`);
        
        console.log('\n🎉 Pagination test completed successfully!');
        
        return {
            totalUrls: productUrls.length,
            duration,
            urls: productUrls
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

testPaginationExtraction();