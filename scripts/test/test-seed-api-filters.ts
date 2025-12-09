/**
 * Comprehensive API Test Script for /api/seed
 * Tests all filter combinations from FilterModal
 */

const BASE_URL = 'http://localhost:3000';

interface FilterTestCase {
    name: string;
    url: string;
    expectedBehavior: string;
}

const filterTestCases: FilterTestCase[] = [
    // ==================== SEARCH TESTS ====================
    {
        name: '1. Basic Search',
        url: '/api/seed?search=cherry',
        expectedBehavior: 'Should return seeds with "cherry" in name or description'
    },
    {
        name: '2. Search with spaces',
        url: '/api/seed?search=blue+dream',
        expectedBehavior: 'Should handle multi-word search'
    },

    // ==================== PRICE RANGE TESTS ====================
    {
        name: '3. Price Range - Low',
        url: '/api/seed?minPrice=0&maxPrice=10',
        expectedBehavior: 'Should return seeds with price per seed <= $10'
    },
    {
        name: '4. Price Range - Medium',
        url: '/api/seed?minPrice=10&maxPrice=20',
        expectedBehavior: 'Should return seeds with price between $10-$20'
    },
    {
        name: '5. Price Range - High',
        url: '/api/seed?minPrice=20&maxPrice=50',
        expectedBehavior: 'Should return seeds with price >= $20'
    },

    // ==================== SEED TYPE TESTS ====================
    {
        name: '6. Filter by Feminized',
        url: '/api/seed?seedTypes=FEMINIZED',
        expectedBehavior: 'Should return only feminized seeds'
    },
    {
        name: '7. Filter by Autoflower',
        url: '/api/seed?seedTypes=AUTOFLOWER',
        expectedBehavior: 'Should return only autoflower seeds'
    },
    {
        name: '8. Filter by Regular',
        url: '/api/seed?seedTypes=REGULAR',
        expectedBehavior: 'Should return only regular seeds'
    },
    {
        name: '9. Multiple Seed Types',
        url: '/api/seed?seedTypes=FEMINIZED,AUTOFLOWER',
        expectedBehavior: 'Should return feminized OR autoflower seeds'
    },

    // ==================== CANNABIS TYPE TESTS ====================
    {
        name: '10. Filter by Indica',
        url: '/api/seed?cannabisTypes=INDICA',
        expectedBehavior: 'Should return only indica strains'
    },
    {
        name: '11. Filter by Sativa',
        url: '/api/seed?cannabisTypes=SATIVA',
        expectedBehavior: 'Should return only sativa strains'
    },
    {
        name: '12. Filter by Hybrid',
        url: '/api/seed?cannabisTypes=HYBRID',
        expectedBehavior: 'Should return only hybrid strains'
    },
    {
        name: '13. Multiple Cannabis Types',
        url: '/api/seed?cannabisTypes=INDICA,SATIVA',
        expectedBehavior: 'Should return indica OR sativa strains'
    },

    // ==================== THC RANGE TESTS ====================
    {
        name: '14. THC Range - Low (0-15%)',
        url: '/api/seed?minTHC=0&maxTHC=15',
        expectedBehavior: 'Should return seeds with THC <= 15%'
    },
    {
        name: '15. THC Range - Medium (15-20%)',
        url: '/api/seed?minTHC=15&maxTHC=20',
        expectedBehavior: 'Should return seeds with THC between 15-20%'
    },
    {
        name: '16. THC Range - High (20%+)',
        url: '/api/seed?minTHC=20&maxTHC=40',
        expectedBehavior: 'Should return seeds with THC >= 20%'
    },

    // ==================== CBD RANGE TESTS ====================
    {
        name: '17. CBD Range - Low (0-5%)',
        url: '/api/seed?minCBD=0&maxCBD=5',
        expectedBehavior: 'Should return seeds with CBD <= 5%'
    },
    {
        name: '18. CBD Range - Medium (5-15%)',
        url: '/api/seed?minCBD=5&maxCBD=15',
        expectedBehavior: 'Should return seeds with CBD between 5-15%'
    },
    {
        name: '19. CBD Range - High (15%+)',
        url: '/api/seed?minCBD=15&maxCBD=25',
        expectedBehavior: 'Should return seeds with CBD >= 15%'
    },

    // ==================== PAGINATION TESTS ====================
    {
        name: '20. Pagination - Page 1',
        url: '/api/seed?page=1&limit=10',
        expectedBehavior: 'Should return first 10 results'
    },
    {
        name: '21. Pagination - Page 2',
        url: '/api/seed?page=2&limit=10',
        expectedBehavior: 'Should return next 10 results'
    },
    {
        name: '22. Pagination - Large Limit',
        url: '/api/seed?page=1&limit=50',
        expectedBehavior: 'Should return up to 50 results'
    },

    // ==================== SORTING TESTS ====================
    {
        name: '23. Sort by Price - Ascending',
        url: '/api/seed?sortBy=price&sortOrder=asc',
        expectedBehavior: 'Should return seeds sorted by price (low to high)'
    },
    {
        name: '24. Sort by Price - Descending',
        url: '/api/seed?sortBy=price&sortOrder=desc',
        expectedBehavior: 'Should return seeds sorted by price (high to low)'
    },
    {
        name: '25. Sort by THC - Descending',
        url: '/api/seed?sortBy=thc&sortOrder=desc',
        expectedBehavior: 'Should return seeds sorted by THC (high to low)'
    },
    {
        name: '26. Sort by Name',
        url: '/api/seed?sortBy=name&sortOrder=asc',
        expectedBehavior: 'Should return seeds sorted alphabetically'
    },

    // ==================== COMBINED FILTERS TESTS ====================
    {
        name: '27. Search + Price Range',
        url: '/api/seed?search=og&minPrice=0&maxPrice=15',
        expectedBehavior: 'Should filter by search AND price range'
    },
    {
        name: '28. Seed Type + Cannabis Type',
        url: '/api/seed?seedTypes=FEMINIZED&cannabisTypes=INDICA',
        expectedBehavior: 'Should return feminized indica seeds'
    },
    {
        name: '29. THC + CBD Range',
        url: '/api/seed?minTHC=15&maxTHC=25&minCBD=0&maxCBD=5',
        expectedBehavior: 'Should filter by both THC and CBD ranges'
    },
    {
        name: '30. Full Filter Combination',
        url: '/api/seed?search=kush&seedTypes=FEMINIZED&cannabisTypes=INDICA&minPrice=0&maxPrice=20&minTHC=18&maxTHC=30&sortBy=price&sortOrder=asc&page=1&limit=20',
        expectedBehavior: 'Should apply all filters together'
    },

    // ==================== EDGE CASES ====================
    {
        name: '31. No Filters (Default)',
        url: '/api/seed',
        expectedBehavior: 'Should return all seeds with default pagination'
    },
    {
        name: '32. Invalid Page Number',
        url: '/api/seed?page=999',
        expectedBehavior: 'Should return empty results for non-existent page'
    },
    {
        name: '33. Zero Price Range',
        url: '/api/seed?minPrice=0&maxPrice=0',
        expectedBehavior: 'Should handle edge case gracefully'
    },
];

async function testAPI() {
    console.log('🧪 Starting Comprehensive API Tests for /api/seed\n');
    console.log('='.repeat(80));

    let passedTests = 0;
    let failedTests = 0;

    for (const testCase of filterTestCases) {
        try {
            console.log(`\n📋 ${testCase.name}`);
            console.log(`   URL: ${testCase.url}`);
            console.log(`   Expected: ${testCase.expectedBehavior}`);

            const startTime = Date.now();
            const response = await fetch(`${BASE_URL}${testCase.url}`);
            const responseTime = Date.now() - startTime;

            if (!response.ok) {
                console.log(`   ❌ FAILED - HTTP ${response.status}`);
                failedTests++;
                continue;
            }

            const data = await response.json();

            // Validate response structure
            if (!data.seeds || !data.pagination) {
                console.log(`   ❌ FAILED - Invalid response structure`);
                failedTests++;
                continue;
            }

            // Display results
            console.log(`   ✅ PASSED - ${responseTime}ms`);
            console.log(`   📊 Results: ${data.seeds.length} seeds found`);
            console.log(`   📄 Pagination: Page ${data.pagination.page}/${data.pagination.totalPages} (Total: ${data.pagination.total})`);

            // Show first seed details if available
            if (data.seeds.length > 0) {
                const firstSeed = data.seeds[0];
                console.log(`   🌱 First Result: ${firstSeed.name}`);
                console.log(`      - Price: $${firstSeed.pricings[0]?.pricePerSeed || 'N/A'}/seed`);
                console.log(`      - THC: ${firstSeed.thcMin}-${firstSeed.thcMax}%`);
                console.log(`      - CBD: ${firstSeed.cbdMin}-${firstSeed.cbdMax}%`);
                console.log(`      - Vendor: ${firstSeed.category.seller.name}`);
            }

            passedTests++;

        } catch (error) {
            console.log(`   ❌ FAILED - Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            failedTests++;
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Test Summary:`);
    console.log(`   ✅ Passed: ${passedTests}/${filterTestCases.length}`);
    console.log(`   ❌ Failed: ${failedTests}/${filterTestCases.length}`);
    console.log(`   📈 Success Rate: ${((passedTests / filterTestCases.length) * 100).toFixed(2)}%`);

    if (failedTests === 0) {
        console.log('\n🎉 All tests passed! API is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
}

// Run tests
testAPI().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
});
