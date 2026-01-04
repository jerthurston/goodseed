/**
 * Test script to analyze robots.txt fetching frequency
 * This script will help us understand caching behavior
 */

import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler.bk';
import { apiLogger } from '@/lib/helpers/api-logger';

// Counter to track robots.txt fetches
let robotsTxtFetchCount = 0;

// Override the original RobotsTxtFile.find method to count fetches
const originalRobotsTxtFind = require('crawlee').RobotsTxtFile.find;

// Patch the method to add logging
require('crawlee').RobotsTxtFile.find = async function(url: string) {
    robotsTxtFetchCount++;
    console.log(`🤖 ROBOTS.TXT FETCH #${robotsTxtFetchCount}: ${url}`);
    return await originalRobotsTxtFind(url);
};

async function testRobotsTxtCaching() {
    console.log('🧪 Testing robots.txt caching behavior');
    console.log('============================================================\n');

    const politeCrawler = new SimplePoliteCrawler({
        userAgent: 'GoodSeed-Bot/1.0 (+https://goodseed.ca/contact) Commercial Cannabis Research',
        acceptLanguage: 'en-US,en;q=0.9',
        minDelay: 1000, // Faster for testing
        maxDelay: 2000
    });

    const testUrls = [
        'https://vancouverseedbank.ca/shop/',
        'https://vancouverseedbank.ca/shop/page/2/',
        'https://vancouverseedbank.ca/product-category/feminized-seeds/',
        'https://vancouverseedbank.ca/product-category/feminized-seeds/page/2/',
        'https://vancouverseedbank.ca/product/10th-planet-strain-feminized-marijuana-seeds/',
        'https://vancouverseedbank.ca/product/2090-strain-feminized-marijuana-seeds/',
    ];

    console.log('📋 Test 1: Multiple requests to same origin');
    console.log('Expected: robots.txt should be fetched only ONCE due to caching\n');

    robotsTxtFetchCount = 0;

    for (let i = 0; i < testUrls.length; i++) {
        const url = testUrls[i];
        console.log(`🔍 Request ${i + 1}: ${url}`);
        
        const allowed = await politeCrawler.isAllowed(url);
        const delay = await politeCrawler.getCrawlDelay(url);
        
        console.log(`   ✓ Allowed: ${allowed}, Delay: ${delay}ms`);
        console.log(`   📊 robots.txt fetches so far: ${robotsTxtFetchCount}`);
        console.log('');
    }

    console.log(`🎯 RESULT: robots.txt was fetched ${robotsTxtFetchCount} time(s) for ${testUrls.length} requests`);
    
    if (robotsTxtFetchCount === 1) {
        console.log('✅ EXCELLENT: Caching is working perfectly!');
    } else if (robotsTxtFetchCount > 1) {
        console.log('⚠️ WARNING: Caching might not be working as expected');
    }

    console.log('\n============================================================');
    console.log('📋 Test 2: Testing different origins');
    console.log('Expected: Each origin should fetch robots.txt once\n');

    const multiOriginUrls = [
        'https://vancouverseedbank.ca/shop/',
        'https://sunwestgenetics.com/shop/',
        'https://vancouverseedbank.ca/shop/page/2/', // Should use cached
        'https://sunwestgenetics.com/product-category/seeds/', // New fetch
    ];

    robotsTxtFetchCount = 0;

    for (let i = 0; i < multiOriginUrls.length; i++) {
        const url = multiOriginUrls[i];
        console.log(`🔍 Request ${i + 1}: ${url}`);
        
        try {
            const allowed = await politeCrawler.isAllowed(url);
            const delay = await politeCrawler.getCrawlDelay(url);
            
            console.log(`   ✓ Allowed: ${allowed}, Delay: ${delay}ms`);
        } catch (error) {
            console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        console.log(`   📊 robots.txt fetches so far: ${robotsTxtFetchCount}`);
        console.log('');
    }

    console.log(`🎯 RESULT: robots.txt was fetched ${robotsTxtFetchCount} time(s) for ${multiOriginUrls.length} requests to 2 different origins`);
    
    if (robotsTxtFetchCount === 2) {
        console.log('✅ EXCELLENT: Origin-based caching is working perfectly!');
    } else {
        console.log('⚠️ WARNING: Origin-based caching might have issues');
    }

    console.log('\n============================================================');
    console.log('📋 Test 3: Testing cache expiry behavior');
    console.log('Note: Cache expires after 24 hours, so this should use cached version\n');

    const cacheTestUrl = 'https://vancouverseedbank.ca/shop/';
    const initialFetchCount = robotsTxtFetchCount;
    
    console.log(`🔍 Testing cache with: ${cacheTestUrl}`);
    await politeCrawler.isAllowed(cacheTestUrl);
    
    const finalFetchCount = robotsTxtFetchCount;
    
    if (finalFetchCount === initialFetchCount) {
        console.log('✅ EXCELLENT: Cache is being used (no additional fetch)');
    } else {
        console.log('⚠️ WARNING: Cache might have expired or not working');
    }

    console.log('\n🎉 robots.txt Caching Analysis Complete!');
    console.log('============================================================');
}

testRobotsTxtCaching().catch(console.error);