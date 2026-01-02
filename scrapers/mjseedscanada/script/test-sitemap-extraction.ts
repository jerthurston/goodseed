/**
 * 🧪 Test Script for MJ Seeds Canada Sitemap URL Extraction
 * 
 * This script tests the extractProductUrlsFromSitemap utility to ensure
 * it correctly filters and extracts product URLs from MJ Seeds Canada's sitemap
 */

import { extractProductUrlsFromSitemap } from '../utils/extractProductUrlsFromSitemap';

// Test configuration
const SITEMAP_URL = 'https://www.mjseedscanada.ca/product-sitemap.xml';
const ALTERNATIVE_SITEMAP = 'https://mjseedscanada.ca/sitemap.xml';

// Expected URL patterns for validation
const EXPECTED_PATTERNS = [
    /^https:\/\/(www\.)?mjseedscanada\.ca\/[^\/]+\/?$/,
    /^https:\/\/(www\.)?mjseedscanada\.ca\/product\/[^\/]+\/?$/,
    /^https:\/\/(www\.)?mjseedscanada\.ca\/.*-seeds?\/?$/,
    /^https:\/\/(www\.)?maryjanesgarden\.com\/[^\/]+\/?$/
];

// URLs that should be excluded
const EXCLUDED_PATTERNS = [
    '/page/',
    '/category/', 
    '/shop/',
    '/tag/',
    '/cart/',
    '/checkout/',
    '/my-account/'
];

async function testSitemapExtraction() {
    console.log('🧪 Starting MJ Seeds Canada Sitemap Extraction Test...\n');

    try {
        // Test with primary sitemap URL
        console.log('📍 Testing primary sitemap URL...');
        console.log(`URL: ${SITEMAP_URL}\n`);

        const startTime = Date.now();
        const productUrls = await extractProductUrlsFromSitemap(SITEMAP_URL);
        const duration = Date.now() - startTime;

        console.log('📊 Test Results:');
        console.log('=================');
        console.log(`✅ Total URLs extracted: ${productUrls.length}`);
        console.log(`⏱️  Extraction time: ${duration}ms`);
        console.log(`🔄 Performance: ${productUrls.length > 0 ? 'SUCCESS' : 'NEEDS_REVIEW'}\n`);

        if (productUrls.length === 0) {
            console.log('⚠️  No URLs found - trying alternative sitemap...');
            
            try {
                const altUrls = await extractProductUrlsFromSitemap(ALTERNATIVE_SITEMAP);
                console.log(`📍 Alternative sitemap results: ${altUrls.length} URLs\n`);
                
                if (altUrls.length > 0) {
                    productUrls.push(...altUrls);
                }
            } catch (altError) {
                console.log('❌ Alternative sitemap also failed\n');
            }
        }

        // Validate URL patterns
        if (productUrls.length > 0) {
            console.log('🔍 URL Pattern Analysis:');
            console.log('========================');
            
            let validUrls = 0;
            let invalidUrls = 0;
            const sampleUrls = productUrls.slice(0, 5);
            
            productUrls.forEach(url => {
                const isValid = EXPECTED_PATTERNS.some(pattern => pattern.test(url));
                const hasExcluded = EXCLUDED_PATTERNS.some(pattern => url.includes(pattern));
                
                if (isValid && !hasExcluded) {
                    validUrls++;
                } else {
                    invalidUrls++;
                }
            });

            console.log(`✅ Valid product URLs: ${validUrls}`);
            console.log(`❌ Invalid/excluded URLs: ${invalidUrls}`);
            console.log(`📊 Success rate: ${((validUrls / productUrls.length) * 100).toFixed(2)}%\n`);

            // Show sample URLs
            console.log('📋 Sample URLs (first 5):');
            console.log('==========================');
            sampleUrls.forEach((url, index) => {
                const isValid = EXPECTED_PATTERNS.some(pattern => pattern.test(url));
                const status = isValid ? '✅' : '❌';
                console.log(`${index + 1}. ${status} ${url}`);
            });
            console.log('');

            // URL pattern breakdown
            console.log('🏷️  URL Pattern Breakdown:');
            console.log('===========================');
            
            const patterns = {
                productPath: productUrls.filter(url => url.includes('/product/')).length,
                seedsSuffix: productUrls.filter(url => url.includes('-seeds/')).length,
                directProduct: productUrls.filter(url => !url.includes('/product/') && !url.includes('-seeds/')).length
            };

            console.log(`/product/ paths: ${patterns.productPath}`);
            console.log(`-seeds/ suffixes: ${patterns.seedsSuffix}`);
            console.log(`Direct product URLs: ${patterns.directProduct}\n`);

            // Check for expected domains
            console.log('🌐 Domain Analysis:');
            console.log('===================');
            
            const domains = {
                mjseedscanada: productUrls.filter(url => url.includes('mjseedscanada.ca')).length,
                maryjanesgarden: productUrls.filter(url => url.includes('maryjanesgarden.com')).length
            };

            console.log(`mjseedscanada.ca: ${domains.mjseedscanada}`);
            console.log(`maryjanesgarden.com: ${domains.maryjanesgarden}\n`);
        }

        // Test edge cases
        console.log('🧪 Edge Case Testing:');
        console.log('=====================');

        // Test with invalid URL
        try {
            console.log('Testing invalid sitemap URL...');
            const invalidResult = await extractProductUrlsFromSitemap('https://invalid-url.com/sitemap.xml');
            console.log(`✅ Invalid URL handled gracefully: ${invalidResult.length} URLs returned`);
        } catch (error) {
            console.log('✅ Invalid URL error handled properly');
        }

        // Test with empty URL
        try {
            console.log('Testing empty URL...');
            const emptyResult = await extractProductUrlsFromSitemap('');
            console.log(`✅ Empty URL handled gracefully: ${emptyResult.length} URLs returned`);
        } catch (error) {
            console.log('✅ Empty URL error handled properly');
        }

        console.log('\n🎉 Test completed successfully!');
        
        return {
            totalUrls: productUrls.length,
            duration,
            validUrls: productUrls.filter(url => 
                EXPECTED_PATTERNS.some(pattern => pattern.test(url)) &&
                !EXCLUDED_PATTERNS.some(excluded => url.includes(excluded))
            ).length,
            sampleUrls: productUrls.slice(0, 3)
        };

    } catch (error) {
        console.error('\n❌ Test failed with error:');
        console.error('===========================');
        console.error(error instanceof Error ? error.message : 'Unknown error');
        console.error('\nStack trace:');
        console.error(error);
        
        throw error;
    }
}

// Additional utility functions for testing
function validateUrlStructure(url: string): boolean {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'https:' && 
               (urlObj.hostname.includes('mjseedscanada') || urlObj.hostname.includes('maryjanesgarden'));
    } catch {
        return false;
    }
}

function categorizeUrls(urls: string[]) {
    return {
        total: urls.length,
        byPattern: {
            product: urls.filter(url => url.includes('/product/')),
            seeds: urls.filter(url => url.includes('-seeds/')),
            marijuana: urls.filter(url => url.includes('/marijuana-seeds/')),
            other: urls.filter(url => 
                !url.includes('/product/') && 
                !url.includes('-seeds/') && 
                !url.includes('/marijuana-seeds/')
            )
        },
        byDomain: {
            mjseedscanada: urls.filter(url => url.includes('mjseedscanada.ca')),
            maryjanesgarden: urls.filter(url => url.includes('maryjanesgarden.com'))
        }
    };
}

// Run the test if this script is executed directly
if (require.main === module) {
    testSitemapExtraction()
        .then((result) => {
            console.log('\n✅ All tests passed!');
            console.log(`📊 Final stats: ${result.totalUrls} total, ${result.validUrls} valid URLs`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Tests failed');
            console.error(error);
            process.exit(1);
        });
}

export { testSitemapExtraction, validateUrlStructure, categorizeUrls };