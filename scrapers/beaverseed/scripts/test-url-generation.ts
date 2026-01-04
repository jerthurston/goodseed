import { getScrapingUrl } from '../utils/getScrapingUrl';

function testGetScrapingUrl() {
    console.log('🧪 Testing Beaver Seed URL generation...\n');
    
    const testCases = [
        { baseUrl: 'https://beaverseed.com/feminized-cannabis/', page: 1 },
        { baseUrl: 'https://beaverseed.com/feminized-cannabis/', page: 2 },
        { baseUrl: 'https://beaverseed.com/feminized-cannabis/', page: 3 },
        { baseUrl: 'https://beaverseed.com/regular/', page: 1 },
        { baseUrl: 'https://beaverseed.com/regular/', page: 2 },
        { baseUrl: 'https://beaverseed.com/autoflowering-cannabis/', page: 10 },
    ];
    
    testCases.forEach((testCase, index) => {
        const result = getScrapingUrl(testCase.baseUrl, testCase.page);
        console.log(`${index + 1}. Base: ${testCase.baseUrl}`);
        console.log(`   Page: ${testCase.page}`);
        console.log(`   Result: ${result}`);
        console.log('');
    });
    
    // Expected results should be:
    console.log('✅ Expected results:');
    console.log('Page 1: https://beaverseed.com/feminized-cannabis/');
    console.log('Page 2: https://beaverseed.com/feminized-cannabis/?products&page=2');
    console.log('Page 3: https://beaverseed.com/feminized-cannabis/?products&page=3');
}

testGetScrapingUrl();