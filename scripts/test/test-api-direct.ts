/**
 * Test cron API endpoint trực tiếp
 */

async function testCronAPI() {
    try {
        console.log('=== Testing Cron API Endpoint Directly ===');
        
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
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Success! Response:', JSON.stringify(result, null, 2));
        } else {
            const errorText = await response.text();
            console.log('❌ Error response:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Request failed:', error);
    }
}

testCronAPI();