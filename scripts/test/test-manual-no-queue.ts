/**
 * Test cron API manual trigger without Redis dependency
 */

async function testCronManualNoQueue() {
    try {
        console.log('=== Testing Manual Trigger (No Queue) ===');
        
        const cronSecret = 'your-secure-random-secret-here-change-in-production';
        const baseUrl = 'http://localhost:3000';
        
        console.log('Making request to /api/cron/scraper...');
        
        const response = await fetch(`${baseUrl}/api/cron/scraper`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${cronSecret}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Response status: ${response.status}`);
        console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ API Response Success!');
            console.log('📊 Result:', JSON.stringify(result, null, 2));
            
            // Analyze the result
            if (result.success) {
                console.log(`\n🎯 Summary:`);
                console.log(`- Total sellers found: ${result.data.totalSellers}`);
                console.log(`- Jobs queued: ${result.data.jobsQueued}`);
                console.log(`- Timestamp: ${result.data.timestamp}`);
                
                if (result.data.sellers && result.data.sellers.length > 0) {
                    console.log(`\n📋 Sellers processed:`);
                    result.data.sellers.forEach((seller, index) => {
                        console.log(`${index + 1}. ${seller.sellerName} (ID: ${seller.sellerId})`);
                        console.log(`   Job ID: ${seller.jobId}`);
                    });
                }
            }
        } else {
            const errorText = await response.text();
            console.log('❌ Error response:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Request failed:', error);
    }
}

testCronManualNoQueue();