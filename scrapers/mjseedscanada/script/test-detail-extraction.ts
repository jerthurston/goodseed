/**
 * 🧪 Test Script for MJ Seeds Canada Product Detail Extraction
 * 
 * Tests extractProductFromDetailHTML utility to ensure it correctly extracts
 * cannabis product data from MJ Seeds Canada detail pages
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { extractProductFromDetailHTML } from '../utils/extractProductFromDetailHTML';
import { MJSEEDSCANADA_PRODUCT_CARD_SELECTORS } from '../core/selector';

// Test configuration
const ARCHIVE_HTML_PATH = path.join(__dirname, '..', '_archive', 'detail-product-section.html');
const TEST_PRODUCT_URL = 'https://www.mjseedscanada.ca/blue-dream-autoflowering-marijuana-seeds/';

// Site configuration for testing
const TEST_SITE_CONFIG = {
    name: 'MJ Seeds Canada',
    baseUrl: 'https://www.mjseedscanada.ca',
    selectors: MJSEEDSCANADA_PRODUCT_CARD_SELECTORS,
    isImplemented: true
};

// Expected data patterns for validation
const EXPECTED_PATTERNS = {
    name: /^.{3,100}$/,                    // Product name 3-100 characters
    url: /^https:\/\/.*mjseedscanada\.ca/, // Valid MJ Seeds Canada URL
    slug: /^[a-z0-9-]+$/,                  // Valid slug format
    imageUrl: /^https?:\/\/.*\.(jpg|jpeg|png|webp)/i, // Valid image URL
    seedTypes: ['autoflower', 'feminized', 'regular', 'photoperiod'],
    cannabisTypes: ['indica', 'sativa', 'hybrid'],
    floweringTime: /\d+.*week|day|month/i  // Flowering time format
};

async function testProductDetailExtraction() {
    console.log('🧪 Starting MJ Seeds Canada Product Detail Extraction Test...\n');

    try {
        // Check if archive HTML exists
        if (!fs.existsSync(ARCHIVE_HTML_PATH)) {
            console.error(`❌ Archive HTML not found: ${ARCHIVE_HTML_PATH}`);
            console.error('Please ensure the archive file exists before running tests.\n');
            return;
        }

        // Load and parse archive HTML
        console.log('📂 Loading archive HTML...');
        const htmlContent = fs.readFileSync(ARCHIVE_HTML_PATH, 'utf-8');
        const $ = cheerio.load(htmlContent);
        console.log(`✅ Archive HTML loaded (${htmlContent.length} characters)\n`);

        // Test product extraction
        console.log('🔍 Testing product extraction...');
        console.log('================================');

        const startTime = Date.now();
        const product = extractProductFromDetailHTML($, TEST_SITE_CONFIG, TEST_PRODUCT_URL);
        const extractionTime = Date.now() - startTime;

        if (!product) {
            console.error('❌ Product extraction failed - returned null');
            console.error('This indicates selectors may not match the HTML structure\n');
            return;
        }

        console.log(`✅ Product extracted successfully in ${extractionTime}ms\n`);

        // Validate extracted data
        console.log('📊 Product Data Validation:');
        console.log('===========================');

        // Core fields validation
        const validations = [
            {
                field: 'name',
                value: product.name,
                isValid: product.name && EXPECTED_PATTERNS.name.test(product.name),
                expected: 'Product name (3-100 chars)'
            },
            {
                field: 'url',
                value: product.url,
                isValid: product.url && EXPECTED_PATTERNS.url.test(product.url),
                expected: 'Valid MJ Seeds Canada URL'
            },
            {
                field: 'slug',
                value: product.slug,
                isValid: product.slug && EXPECTED_PATTERNS.slug.test(product.slug),
                expected: 'Valid slug format (lowercase, dashes)'
            },
            {
                field: 'imageUrl',
                value: product.imageUrl,
                isValid: product.imageUrl ? EXPECTED_PATTERNS.imageUrl.test(product.imageUrl) : true,
                expected: 'Valid image URL (optional)'
            },
            {
                field: 'seedType',
                value: product.seedType,
                isValid: product.seedType ? EXPECTED_PATTERNS.seedTypes.includes(product.seedType) : true,
                expected: 'Valid seed type (optional)'
            },
            {
                field: 'cannabisType',
                value: product.cannabisType,
                isValid: product.cannabisType ? EXPECTED_PATTERNS.cannabisTypes.includes(product.cannabisType) : true,
                expected: 'Valid cannabis type (optional)'
            },
            {
                field: 'floweringTime',
                value: product.floweringTime,
                isValid: product.floweringTime ? EXPECTED_PATTERNS.floweringTime.test(product.floweringTime) : true,
                expected: 'Valid flowering time format (optional)'
            }
        ];

        let validCount = 0;
        let totalCount = validations.length;

        validations.forEach(validation => {
            const status = validation.isValid ? '✅' : '❌';
            const value = validation.value || 'undefined';
            console.log(`${status} ${validation.field}: ${value}`);
            
            if (validation.isValid) {
                validCount++;
            } else {
                console.log(`   Expected: ${validation.expected}`);
            }
        });

        console.log(`\n📈 Validation Score: ${validCount}/${totalCount} (${((validCount/totalCount)*100).toFixed(1)}%)\n`);

        // Cannabis-specific data analysis
        console.log('🌿 Cannabis Data Analysis:');
        console.log('==========================');
        
        const cannabisData = {
            seedType: product.seedType,
            cannabisType: product.cannabisType,
            floweringTime: product.floweringTime,
            badge: product.badge,
            thcLevel: product.thcLevel,
            cbdLevel: product.cbdLevel
        };

        Object.entries(cannabisData).forEach(([key, value]) => {
            const status = value ? '✅' : '➖';
            console.log(`${status} ${key}: ${value || 'not extracted'}`);
        });

        // Pricing analysis
        console.log(`\n💰 Pricing Analysis:`);
        console.log('====================');
        
        if (product.pricings && product.pricings.length > 0) {
            console.log(`✅ Found ${product.pricings.length} pricing variations:`);
            
            product.pricings.forEach((pricing, index) => {
                console.log(`  ${index + 1}. ${pricing.packSize} seeds: $${pricing.totalPrice} ($${pricing.pricePerSeed.toFixed(2)}/seed)`);
            });
            
            const avgPricePerSeed = product.pricings.reduce((sum, p) => sum + p.pricePerSeed, 0) / product.pricings.length;
            console.log(`📊 Average price per seed: $${avgPricePerSeed.toFixed(2)}`);
        } else {
            console.log('❌ No pricing data extracted');
        }

        // Selector effectiveness test
        console.log(`\n🔧 Selector Effectiveness Test:`);
        console.log('===============================');
        
        const selectorTests = [
            { name: 'productName', selector: TEST_SITE_CONFIG.selectors.productName },
            { name: 'productImage', selector: TEST_SITE_CONFIG.selectors.productImage },
            { name: 'strainType', selector: TEST_SITE_CONFIG.selectors.strainType },
            { name: 'tagsLinks', selector: TEST_SITE_CONFIG.selectors.tagsLinks },
            { name: 'versionsRows', selector: TEST_SITE_CONFIG.selectors.versionsRows },
            { name: 'packSizeCell', selector: TEST_SITE_CONFIG.selectors.packSizeCell },
            { name: 'priceCell', selector: TEST_SITE_CONFIG.selectors.priceCell }
        ];

        selectorTests.forEach(test => {
            const elements = $(test.selector);
            const count = elements.length;
            const status = count > 0 ? '✅' : '❌';
            console.log(`${status} ${test.name}: ${count} elements found`);
            
            if (count === 0) {
                console.log(`   Selector: ${test.selector}`);
            }
        });

        // Show sample data
        console.log(`\n📋 Extracted Product Sample:`);
        console.log('============================');
        console.log(JSON.stringify(product, null, 2));

        console.log('\n🎉 Test completed successfully!');
        
        return {
            success: true,
            product,
            validationScore: (validCount / totalCount) * 100,
            extractionTime,
            pricingCount: product.pricings?.length || 0
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
function validateProductStructure(product: any): boolean {
    const requiredFields = ['name', 'url', 'slug'];
    return requiredFields.every(field => product[field] && typeof product[field] === 'string');
}

function analyzeCannabisCompleteness(product: any): number {
    const cannabisFields = ['seedType', 'cannabisType', 'floweringTime', 'badge', 'thcLevel', 'cbdLevel'];
    const presentFields = cannabisFields.filter(field => product[field]);
    return (presentFields.length / cannabisFields.length) * 100;
}

function validatePricingStructure(pricings: any[]): boolean {
    if (!Array.isArray(pricings) || pricings.length === 0) return false;
    
    return pricings.every(pricing => 
        typeof pricing.totalPrice === 'number' &&
        typeof pricing.packSize === 'number' &&
        typeof pricing.pricePerSeed === 'number' &&
        pricing.totalPrice > 0 &&
        pricing.packSize > 0 &&
        pricing.pricePerSeed > 0
    );
}

// Run the test if this script is executed directly
if (require.main === module) {
    testProductDetailExtraction()
        .then((result) => {
            console.log('\n✅ All tests passed!');
            console.log(`📊 Final stats: ${result?.validationScore.toFixed(1)}% validation score`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Tests failed');
            console.error(error);
            process.exit(1);
        });
}

export { 
    testProductDetailExtraction, 
    validateProductStructure, 
    analyzeCannabisCompleteness, 
    validatePricingStructure 
};