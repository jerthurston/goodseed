/**
 * Test script for /api/seed endpoint
 * Run: npx tsx scripts/test/test-seed-api.ts
 */

const API_BASE_URL = 'http://localhost:3000';

interface TestCase {
    name: string;
    endpoint: string;
    expectedFields: string[];
}

const testCases: TestCase[] = [
    {
        name: '1. Basic fetch - No filters',
        endpoint: '/api/seed?page=1&limit=5',
        expectedFields: ['seeds', 'pagination'],
    },
    {
        name: '2. Search by keyword',
        endpoint: '/api/seed?search=og&page=1&limit=5',
        expectedFields: ['seeds', 'pagination'],
    },
    {
        name: '3. Filter by cannabis type (INDICA)',
        endpoint: '/api/seed?cannabisTypes=INDICA&page=1&limit=5',
        expectedFields: ['seeds', 'pagination'],
    },
    {
        name: '4. Filter by seed type (FEMINIZED)',
        endpoint: '/api/seed?seedTypes=FEMINIZED&page=1&limit=5',
        expectedFields: ['seeds', 'pagination'],
    },
    {
        name: '5. Filter by price range',
        endpoint: '/api/seed?minPrice=5&maxPrice=15&page=1&limit=5',
        expectedFields: ['seeds', 'pagination'],
    },
    {
        name: '6. Filter by THC range',
        endpoint: '/api/seed?minTHC=15&maxTHC=25&page=1&limit=5',
        expectedFields: ['seeds', 'pagination'],
    },
    {
        name: '7. Multiple filters combined',
        endpoint: '/api/seed?cannabisTypes=HYBRID&seedTypes=FEMINIZED&minPrice=5&maxPrice=20&page=1&limit=5',
        expectedFields: ['seeds', 'pagination'],
    },
    {
        name: '8. Sort by price ascending',
        endpoint: '/api/seed?sortBy=price&sortOrder=asc&page=1&limit=5',
        expectedFields: ['seeds', 'pagination'],
    },
    {
        name: '9. Sort by name descending',
        endpoint: '/api/seed?sortBy=name&sortOrder=desc&page=1&limit=5',
        expectedFields: ['seeds', 'pagination'],
    },
    {
        name: '10. Pagination - Page 2',
        endpoint: '/api/seed?page=2&limit=10',
        expectedFields: ['seeds', 'pagination'],
    },
];

async function testEndpoint(testCase: TestCase): Promise<void> {
    const url = `${API_BASE_URL}${testCase.endpoint}`;

    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`📍 URL: ${url}`);

    try {
        const startTime = Date.now();
        const response = await fetch(url);
        const duration = Date.now() - startTime;

        if (!response.ok) {
            console.error(`❌ FAILED: HTTP ${response.status} ${response.statusText}`);
            const errorData = await response.json().catch(() => ({}));
            console.error('Error details:', errorData);
            return;
        }

        const data = await response.json();

        // Check expected fields
        const missingFields = testCase.expectedFields.filter(
            field => !(field in data)
        );

        if (missingFields.length > 0) {
            console.error(`❌ FAILED: Missing fields: ${missingFields.join(', ')}`);
            return;
        }

        // Validate structure
        if (!Array.isArray(data.seeds)) {
            console.error('❌ FAILED: seeds is not an array');
            return;
        }

        if (!data.pagination || typeof data.pagination !== 'object') {
            console.error('❌ FAILED: pagination is not an object');
            return;
        }

        // Log results
        console.log(`✅ PASSED (${duration}ms)`);
        console.log(`   └─ Seeds returned: ${data.seeds.length}`);
        console.log(`   └─ Total records: ${data.pagination.total}`);
        console.log(`   └─ Page: ${data.pagination.page}/${data.pagination.totalPages}`);

        // Show first seed if available
        if (data.seeds.length > 0) {
            const firstSeed = data.seeds[0];
            console.log(`   └─ First seed: ${firstSeed.name}`);
            console.log(`      └─ Type: ${firstSeed.seedType || 'N/A'}`);
            console.log(`      └─ Category: ${firstSeed.category?.cannabisType || 'N/A'}`);
            console.log(`      └─ Vendor: ${firstSeed.category?.seller?.name || 'N/A'}`);
            console.log(`      └─ Pricings: ${firstSeed.pricings?.length || 0} packs`);
            console.log(`      └─ Images: ${firstSeed.productImages?.length || 0} images`);
        }

    } catch (error) {
        console.error(`❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(error);
    }
}

async function runAllTests(): Promise<void> {
    console.log('🚀 Starting API Tests for /api/seed');
    console.log('='.repeat(60));

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        try {
            await testEndpoint(testCase);
            passed++;
        } catch (error) {
            failed++;
            console.error(`Test "${testCase.name}" threw an error:`, error);
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log(`   ✅ Passed: ${passed}/${testCases.length}`);
    console.log(`   ❌ Failed: ${failed}/${testCases.length}`);
    console.log('='.repeat(60));
}

// Run tests
runAllTests().catch(console.error);
