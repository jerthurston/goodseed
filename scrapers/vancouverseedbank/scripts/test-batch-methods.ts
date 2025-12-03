/**
 * Test script for ProductListScraper methods
 * 
 * Test cả 2 methods:
 * 1. scrapeProductList() - Fixed mode
 * 2. scrapeProductListByBatch() - Batch mode
 */

import { ProductListScraper } from '../core/product-list-scrapers';

const LISTING_URL = 'https://vancouverseedbank.ca/shop/jsf/epro-archive-products/';

async function testScrapeProductList() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 1: scrapeProductList() - Fixed Mode');
    console.log('='.repeat(70));

    const scraper = new ProductListScraper();

    try {
        console.log('Testing: scrapeProductList(url, 2) - Crawl 2 pages from page 1');
        const result = await scraper.scrapeProductList(LISTING_URL, 2);

        console.log('\n✅ Result:');
        console.log(`   Category: ${result.category}`);
        console.log(`   Total Products: ${result.totalProducts}`);
        console.log(`   Total Pages: ${result.totalPages}`);
        console.log(`   Duration: ${result.duration}ms`);
        console.log(`   Timestamp: ${result.timestamp.toISOString()}`);

        // Show sample products
        console.log('\n📦 Sample Products (first 3):');
        result.products.slice(0, 3).forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.name}`);
            console.log(`      URL: ${p.url}`);
            console.log(`      Image: ${p.imageUrl ? 'Yes' : 'No'}`);
            console.log(`      THC: ${p.thcLevel || 'N/A'} (${p.thcMin}-${p.thcMax})`);
            console.log(`      CBD: ${p.cbdLevel || 'N/A'} (${p.cbdMin}-${p.cbdMax})`);
            console.log(`      Rating: ${p.rating || 'N/A'} (${p.reviewCount || 0} reviews)`);
        });

        return true;
    } catch (error) {
        console.error('❌ Error:', error);
        return false;
    }
}

async function testScrapeProductListByBatch() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 2: scrapeProductListByBatch() - Batch Mode');
    console.log('='.repeat(70));

    const scraper = new ProductListScraper();

    try {
        console.log('Testing: scrapeProductListByBatch(url, 3, 4) - Crawl pages 3-4');
        const result = await scraper.scrapeProductListByBatch(LISTING_URL, 3, 4);

        console.log('\n✅ Result:');
        console.log(`   Category: ${result.category}`);
        console.log(`   Total Products: ${result.totalProducts}`);
        console.log(`   Total Pages: ${result.totalPages}`);
        console.log(`   Duration: ${result.duration}ms`);
        console.log(`   Timestamp: ${result.timestamp.toISOString()}`);

        // Show sample products
        console.log('\n📦 Sample Products (first 3):');
        result.products.slice(0, 3).forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.name}`);
            console.log(`      URL: ${p.url}`);
            console.log(`      Image: ${p.imageUrl ? 'Yes' : 'No'}`);
            console.log(`      THC: ${p.thcLevel || 'N/A'} (${p.thcMin}-${p.thcMax})`);
            console.log(`      CBD: ${p.cbdLevel || 'N/A'} (${p.cbdMin}-${p.cbdMax})`);
            console.log(`      Rating: ${p.rating || 'N/A'} (${p.reviewCount || 0} reviews)`);
        });

        return true;
    } catch (error) {
        console.error('❌ Error:', error);
        return false;
    }
}

async function testInvalidBatchRange() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 3: scrapeProductListByBatch() - Invalid Range');
    console.log('='.repeat(70));

    const scraper = new ProductListScraper();

    try {
        console.log('Testing: scrapeProductListByBatch(url, 10, 5) - Invalid range (should throw error)');
        await scraper.scrapeProductListByBatch(LISTING_URL, 10, 5);

        console.log('❌ Should have thrown an error!');
        return false;
    } catch (error) {
        console.log('✅ Correctly threw error:', (error as Error).message);
        return true;
    }
}

async function main() {
    console.log('🧪 Vancouver Seed Bank - ProductListScraper Test Suite');
    console.log('Testing both scrapeProductList() and scrapeProductListByBatch()');

    const results = {
        test1: false,
        test2: false,
        test3: false,
    };

    // Run tests
    results.test1 = await testScrapeProductList();
    results.test2 = await testScrapeProductListByBatch();
    results.test3 = await testInvalidBatchRange();

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Test 1 (scrapeProductList):           ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 (scrapeProductListByBatch):    ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 3 (Invalid Range Validation):    ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = Object.values(results).every(r => r === true);
    console.log('\n' + (allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'));
}

main().catch(console.error);
