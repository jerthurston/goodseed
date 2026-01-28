import CANUK_SEEDS_PRODUCT_SELECTORS from '../core/selectors';
import { extractProductFromDetailHTML } from '../utils/extractProductFromDetailHTML';
import { CheerioCrawler } from 'crawlee';
import { ProductCardDataFromCrawling } from '@/types/crawl.type';

/**
 * Test Step 3 với 2 URLs để verify product data extraction
 */
async function testStep3WithLimitedUrls() {
    console.log('🧪 Testing Step 3: Product Data Extraction (2 URLs only)...\n');
    
    // Test URLs (from previous test)
    const testUrls = [
        'https://www.canukseeds.com/2046-fast-version-feminized-seeds-canuk-seeds',
        'https://www.canukseeds.com/24k-gold-feminized-seeds-canuk-seeds'
    ];
    
    // Mock siteConfig
    const mockSiteConfig = {
        name: 'Canuk Seeds',
        baseUrl: 'https://www.canukseeds.com',
        isImplemented: true,
        selectors: CANUK_SEEDS_PRODUCT_SELECTORS
    };
    
    console.log('📋 INPUT:');
    console.log(`- URLs: ${testUrls.length}`);
    testUrls.forEach((url, i) => {
        console.log(`  ${i + 1}. ${url}`);
    });
    
    const products: ProductCardDataFromCrawling[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    console.log('\n🔄 Processing URLs...\n');
    
    const startTime = Date.now();
    
    const crawler = new CheerioCrawler({
        requestHandlerTimeoutSecs: 60,
        maxRequestRetries: 2,
        maxConcurrency: 1,
        
        requestHandler: async ({ $, request }) => {
            try {
                console.log(`🌐 Processing: ${request.url}`);
                
                // Fix: Pass the entire siteConfig, not just URL
                const productData = extractProductFromDetailHTML($, mockSiteConfig, request.url);
                
                if (productData) {
                    products.push(productData);
                    successCount++;
                    console.log(`✅ Success: ${productData.name}`);
                    console.log(`   - Seed Type: ${productData.seedType}`);
                    console.log(`   - Cannabis Type: ${productData.cannabisType}`);
                    console.log(`   - THC: ${productData.thcLevel}`);
                    console.log(`   - CBD: ${productData.cbdLevel}`);
                    console.log(`   - Pricings: ${productData.pricings?.length || 0} variants`);
                } else {
                    errorCount++;
                    console.log(`⚠️  Failed to extract data`);
                }
                
                console.log(''); // Empty line for readability
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Error processing ${request.url}:`, error);
            }
        },
        
        failedRequestHandler: async ({ request, error }) => {
            errorCount++;
            console.error(`❌ Failed to load: ${request.url}`, error);
        }
    });
    
    try {
        await crawler.run(testUrls);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('=' .repeat(80));
        console.log('📊 FINAL RESULTS:');
        console.log('=' .repeat(80));
        console.log(`✅ Success: ${successCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log(`📦 Total Products: ${products.length}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`📈 Success Rate: ${((successCount / testUrls.length) * 100).toFixed(1)}%`);
        
        if (products.length > 0) {
            console.log('\n📝 Extracted Products:');
            products.forEach((product, i) => {
                console.log(`${i + 1}. ${product.name}`);
                console.log(`   Image: ${product.imageUrl ? '✅' : '❌'}`);
                console.log(`   Price variants: ${product.pricings?.length || 0}`);
            });
        }
        
        console.log('\n🎉 Step 3 Test Completed!');
        
        return {
            products,
            successCount,
            errorCount,
            duration,
            successRate: ((successCount / testUrls.length) * 100)
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

// Run the test
testStep3WithLimitedUrls();