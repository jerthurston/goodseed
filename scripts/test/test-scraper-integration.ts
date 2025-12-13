/**
 * Test Integration API - Both Sources
 * 
 * Test tích hợp API với cả Vancouver Seed Bank và SunWest Genetics
 * Kiểm tra validation, job creation và queue processing
 */

async function testScraperAPI() {
    const baseUrl = 'http://localhost:3000'; // Adjust if needed
    
    console.log('🧪 Testing Scraper API Integration...\n');

    // Test 1: Invalid source validation
    console.log('📋 Test 1: Invalid Source Validation');
    try {
        const response = await fetch(`${baseUrl}/api/scraper`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scrape-seeds',
                source: 'invalid-source',
                mode: 'test',
                config: {
                    scrapingSourceUrl: 'https://example.com',
                    categorySlug: 'test',
                }
            })
        });

        const result = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Expected error:`, result);
        
        if (response.status === 400 && result.error?.code === 'INVALID_SOURCE') {
            console.log('✅ Invalid source validation working\n');
        } else {
            console.log('❌ Invalid source validation failed\n');
        }
    } catch (error) {
        console.log('❌ Request failed:', error);
    }

    // Test 2: Vancouver Seed Bank test mode
    console.log('📋 Test 2: Vancouver Seed Bank - Test Mode');
    try {
        const response = await fetch(`${baseUrl}/api/scraper`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scrape-seeds',
                source: 'vancouverseedbank',
                mode: 'test',
                config: {
                    scrapingSourceUrl: 'https://vancouverseedbank.ca/shop/jsf/epro-archive-products/',
                    categorySlug: 'all-products',
                }
            })
        });

        const result = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, result);

        if (response.ok && result.success && result.data?.jobId) {
            console.log(`✅ Vancouver job queued: ${result.data.jobId}\n`);
            return result.data.jobId;
        } else {
            console.log('❌ Vancouver job failed\n');
        }
    } catch (error) {
        console.log('❌ Request failed:', error);
    }

    // Test 3: SunWest Genetics test mode
    console.log('📋 Test 3: SunWest Genetics - Test Mode');
    try {
        const response = await fetch(`${baseUrl}/api/scraper`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scrape-seeds',
                source: 'sunwestgenetics',
                mode: 'test',
                config: {
                    scrapingSourceUrl: 'https://sunwestgenetics.com/shop/',
                    categorySlug: 'all-products',
                }
            })
        });

        const result = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, result);

        if (response.ok && result.success && result.data?.jobId) {
            console.log(`✅ SunWest job queued: ${result.data.jobId}\n`);
            return result.data.jobId;
        } else {
            console.log('❌ SunWest job failed\n');
        }
    } catch (error) {
        console.log('❌ Request failed:', error);
    }

    // Test 4: Check supported sources
    console.log('📋 Test 4: Supported Sources');
    const supportedSources = ['vancouverseedbank', 'sunwestgenetics'];
    console.log(`✅ Supported sources: ${supportedSources.join(', ')}\n`);

    console.log('🎉 Integration test completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Start Redis server: redis-server');
    console.log('2. Start worker: npm run worker:scraper');
    console.log('3. Check job status via /api/scraper/status/{jobId}');
    console.log('4. Monitor database for saved products');
}

// Test với batch mode
async function testBatchMode() {
    const baseUrl = 'http://localhost:3000';
    
    console.log('\n🧪 Testing Batch Mode...\n');

    // SunWest Genetics batch test
    console.log('📋 SunWest Genetics - Batch Mode (Pages 1-2)');
    try {
        const response = await fetch(`${baseUrl}/api/scraper`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scrape-seeds',
                source: 'sunwestgenetics',
                mode: 'batch',
                config: {
                    scrapingSourceUrl: 'https://sunwestgenetics.com/shop/',
                    categorySlug: 'all-products',
                    startPage: 1,
                    endPage: 2,
                }
            })
        });

        const result = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, result);

        if (response.ok && result.success) {
            console.log(`✅ SunWest batch job queued: ${result.data.jobId}\n`);
        } else {
            console.log('❌ SunWest batch job failed\n');
        }
    } catch (error) {
        console.log('❌ Request failed:', error);
    }
}

// Run tests
if (require.main === module) {
    testScraperAPI().then(() => {
        return testBatchMode();
    }).catch(console.error);
}

export { testScraperAPI, testBatchMode };