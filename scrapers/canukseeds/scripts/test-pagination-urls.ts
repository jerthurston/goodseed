import { 
    getScrapingUrl, 
    getPageNumberFromUrl, 
    isPaginationUrl, 
    getScrapingUrlRange,
    getBaseUrl 
} from '../utils/getScrapingUrl';

/**
 * Test Canuk Seeds pagination URL functions
 */
function testCanukSeedsPagination() {
    console.log('🧪 Testing Canuk Seeds Pagination URL Functions...\n');
    
    const testBaseUrl = 'https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds';
    
    console.log('📋 Test Cases:');
    console.log('='.repeat(60));
    
    // Test 1: getScrapingUrl
    console.log('\n1️⃣ Testing getScrapingUrl():');
    const testCases = [
        { base: testBaseUrl, page: 1, expected: testBaseUrl },
        { base: testBaseUrl, page: 2, expected: `${testBaseUrl}?p=2` },
        { base: testBaseUrl, page: 5, expected: `${testBaseUrl}?p=5` },
        { base: `${testBaseUrl}?filter=indica`, page: 2, expected: `${testBaseUrl}?filter=indica&p=2` }
    ];
    
    testCases.forEach((test, i) => {
        const result = getScrapingUrl(test.base, test.page);
        const status = result === test.expected ? '✅' : '❌';
        console.log(`   ${i + 1}. Page ${test.page}: ${status}`);
        console.log(`      Expected: ${test.expected}`);
        console.log(`      Got:      ${result}`);
        if (result !== test.expected) {
            console.log('      ❌ MISMATCH!');
        }
    });
    
    // Test 2: getPageNumberFromUrl
    console.log('\n2️⃣ Testing getPageNumberFromUrl():');
    const urlTests = [
        { url: testBaseUrl, expected: 1 },
        { url: `${testBaseUrl}?p=2`, expected: 2 },
        { url: `${testBaseUrl}?p=5`, expected: 5 },
        { url: `${testBaseUrl}?filter=indica&p=3`, expected: 3 },
        { url: `${testBaseUrl}?p=10&sort=price`, expected: 10 }
    ];
    
    urlTests.forEach((test, i) => {
        const result = getPageNumberFromUrl(test.url);
        const status = result === test.expected ? '✅' : '❌';
        console.log(`   ${i + 1}. ${status} "${test.url}" -> Page ${result} (expected ${test.expected})`);
    });
    
    // Test 3: isPaginationUrl
    console.log('\n3️⃣ Testing isPaginationUrl():');
    const paginationTests = [
        { url: testBaseUrl, expected: false },
        { url: `${testBaseUrl}?p=2`, expected: true },
        { url: `${testBaseUrl}?filter=indica`, expected: false },
        { url: `${testBaseUrl}?filter=indica&p=3`, expected: true }
    ];
    
    paginationTests.forEach((test, i) => {
        const result = isPaginationUrl(test.url);
        const status = result === test.expected ? '✅' : '❌';
        console.log(`   ${i + 1}. ${status} "${test.url}" -> ${result} (expected ${test.expected})`);
    });
    
    // Test 4: getScrapingUrlRange
    console.log('\n4️⃣ Testing getScrapingUrlRange():');
    const rangeResult = getScrapingUrlRange(testBaseUrl, 1, 3);
    const expectedRange = [
        testBaseUrl,
        `${testBaseUrl}?p=2`,
        `${testBaseUrl}?p=3`
    ];
    
    console.log(`   Range 1-3:`);
    rangeResult.forEach((url, i) => {
        const expected = expectedRange[i];
        const status = url === expected ? '✅' : '❌';
        console.log(`     ${i + 1}. ${status} ${url}`);
    });
    
    // Test 5: getBaseUrl
    console.log('\n5️⃣ Testing getBaseUrl():');
    const baseUrlTests = [
        { 
            url: `${testBaseUrl}?p=3`, 
            expected: testBaseUrl 
        },
        { 
            url: `${testBaseUrl}?filter=indica&p=2`, 
            expected: `${testBaseUrl}?filter=indica` 
        },
        { 
            url: `${testBaseUrl}?p=5&sort=price`, 
            expected: `${testBaseUrl}?sort=price` 
        },
        {
            url: testBaseUrl,
            expected: testBaseUrl
        }
    ];
    
    baseUrlTests.forEach((test, i) => {
        const result = getBaseUrl(test.url);
        const status = result === test.expected ? '✅' : '❌';
        console.log(`   ${i + 1}. ${status}`);
        console.log(`      Input:    ${test.url}`);
        console.log(`      Expected: ${test.expected}`);
        console.log(`      Got:      ${result}`);
    });
    
    console.log('\n🎉 Pagination URL testing completed!');
}

// Run the test
testCanukSeedsPagination();