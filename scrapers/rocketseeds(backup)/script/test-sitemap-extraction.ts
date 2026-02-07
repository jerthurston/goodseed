#!/usr/bin/env tsx

/**
 * 🧪 ROCKET SEEDS SITEMAP EXTRACTION TEST SCRIPT
 * 
 * Tests sitemap URL extraction for Rocket Seeds only
 */

import { extractProductUrlsFromSitemap as extractRocketSeedsUrls } from '../utils/extractProductUrlsFromSitemap';

// Test URLs
const ROCKET_SEEDS_SITEMAPS = [
    'https://rocketseeds.com/product-sitemap.xml',
    'https://rocketseeds.com/product-sitemap2.xml',
    'https://rocketseeds.com/product-sitemap3.xml',
    'https://rocketseeds.com/product-sitemap4.xml'
];

async function testSitemapExtraction() {
    console.log('🧪 Starting Rocket Seeds Sitemap Extraction Test...\n');

    // Test Rocket Seeds only
    console.log('🚀 Testing Rocket Seeds Sitemaps:');
    console.log('='.repeat(50));
    
    let rocketTotalUrls = 0;
    for (const sitemapUrl of ROCKET_SEEDS_SITEMAPS) {
        try {
            console.log(`\n📂 Testing: ${sitemapUrl}`);
            const urls = await extractRocketSeedsUrls(sitemapUrl);
            console.log(`✅ Success: ${urls.length} product URLs found`);
            
            if (urls.length > 0) {
                console.log('📝 Sample URLs (first 5):');
                urls.slice(0, 5).forEach((url: string, index: number) => {
                    console.log(`   ${index + 1}. ${url}`);
                });
            }
            
            rocketTotalUrls += urls.length;
            
        } catch (error) {
            console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    console.log(`\n📊 Rocket Seeds Total: ${rocketTotalUrls} URLs`);
    
    // Summary
    console.log('\n🎯 Test Summary:');
    console.log('='.repeat(50));
    console.log(`🚀 Rocket Seeds: ${rocketTotalUrls} product URLs\n`);
    
    // Validation
    if (rocketTotalUrls > 0) {
        console.log('✅ Sitemap extraction successful!');
        return true;
    } else {
        console.log('❌ Sitemap extraction failed!');
        return false;
    }
}

// Test URL pattern validation
function testUrlPatterns() {
    console.log('\n🔍 Testing Rocket Seeds URL Pattern Validation:');
    console.log('='.repeat(50));
    
    const testUrls = [
        // Valid product URLs
        'https://rocketseeds.com/product/green-crack-feminized-marijuana-seeds/',
        'https://rocketseeds.com/amnesia-haze-feminized-seeds/',
        'https://rocketseeds.com/white-widow-autoflower-seeds/',
        
        // Invalid URLs (should be filtered out)
        'https://rocketseeds.com/category/feminized-seeds/',
        'https://rocketseeds.com/cart/',
        'https://rocketseeds.com/page/shipping-info/',
        'https://rocketseeds.com/shop/',
        'https://rocketseeds.com/my-account/',
    ];
    
    testUrls.forEach(url => {
        const isValid = (url.includes('rocketseeds.com')) && 
                       (url.includes('/product/') || url.includes('/marijuana-seeds/') || url.includes('-seeds/')) &&
                       !url.includes('/page/') &&
                       !url.includes('/category/') &&
                       !url.includes('/shop/') &&
                       !url.includes('/tag/') &&
                       !url.includes('/cart/') &&
                       !url.includes('/checkout/') &&
                       !url.includes('/my-account/') &&
                       url.match(/\/[^\/]+\/?$/);
        console.log(`${isValid ? '✅' : '❌'} ${url}`);
    });
}

// Run tests
async function runAllTests() {
    try {
        testUrlPatterns();
        const success = await testSitemapExtraction();
        
        console.log('\n🏁 Test Complete!');
        process.exit(success ? 0 : 1);
        
    } catch (error) {
        console.error('\n💥 Test Error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    runAllTests();
}

export { testSitemapExtraction, testUrlPatterns };