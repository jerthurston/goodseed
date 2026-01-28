/**
 * Test script for Canuk Seeds product detail extraction
 * 
 * Usage:
 * npx tsx scrapers/canukseeds/scripts/test-product-detail-extraction.ts
 */

import { CheerioCrawler } from 'crawlee';
import { extractProductFromDetailHTML } from '../utils/extractProductFromDetailHTML';
import CANUK_SEEDS_PRODUCT_SELECTORS from '../core/selectors';
import { SiteConfig } from '@/lib/factories/scraper-factory';

async function testProductDetailExtraction(): Promise<void> {
    console.log('🧪 Testing Canuk Seeds Product Detail Extraction...\n');
    
    // Test URLs - test multiple products
const testUrls = [
    'https://www.canukseeds.com/hellfire-og-autoflowering-feminized-seeds-canuk-seeds',
    'https://www.canukseeds.com/blueberry-badazz-og-feminized-seeds-canuk-seeds'
];    // Create site config for testing
    const siteConfig: SiteConfig = {
        selectors: CANUK_SEEDS_PRODUCT_SELECTORS,
        baseUrl: 'https://www.canukseeds.com',
        name: 'Canuk Seeds',
        isImplemented: true
    };
    
    for (let i = 0; i < testUrls.length; i++) {
        const testUrl = testUrls[i];
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔍 Testing Product ${i + 1}/${testUrls.length}`);
        console.log(`🌐 URL: ${testUrl}`);
        console.log(`${'='.repeat(80)}\n`);
        
        await testSingleProduct(testUrl, siteConfig);
    }
}

async function testSingleProduct(testUrl: string, siteConfig: SiteConfig): Promise<void> {
    
    return new Promise((resolve, reject) => {
        console.log(`🌐 Fetching product page...`);
        
        const crawler = new CheerioCrawler({
            requestHandler: async ({ $ }) => {
                try {
                    console.log('✅ Page loaded successfully, waiting for JavaScript...\n');
                    
                    // Wait a bit for JavaScript to load gallery
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Extract product using our function
                    const product = extractProductFromDetailHTML($, siteConfig, testUrl);
                    
                    if (product) {
                        console.log('🎉 Product extraction successful!\n');
                        
                        console.log('📊 Extracted Product Data:');
                        console.log('==========================================');
                        console.log(`📝 Name: ${product.name}`);
                        console.log(`🔗 URL: ${product.url}`);
                        console.log(`🏷️ Slug: ${product.slug}`);
                        console.log(`🖼️ Image: ${product.imageUrl || 'Not found'}`);
                        console.log(`🌾 Seed Type: ${product.seedType || 'Not found'}`);
                        console.log(`🌿 Cannabis Type: ${product.cannabisType || 'Not found'}`);
                        console.log(`🧪 THC Level: ${product.thcLevel || 'Not found'} (${product.thcMin}-${product.thcMax})`);
                        console.log(`🌱 CBD Level: ${product.cbdLevel || 'Not found'} (${product.cbdMin}-${product.cbdMax})`);
                        console.log(`⏰ Flowering Time: ${product.floweringTime || 'Not found'}`);
                        console.log(`📈 Growing Level: ${product.growingLevel || 'Not found'}`);
                        console.log(`🏷️ Badge: ${product.badge || 'Not found'}`);
                        console.log(`⭐ Rating: ${product.rating || 'Not found'}`);
                        console.log(`💬 Review Count: ${product.reviewCount || 'Not found'}`);
                        
                        console.log('\n💰 Pricing Information:');
                        if (product.pricings.length > 0) {
                            product.pricings.forEach((pricing, index) => {
                                console.log(`  ${index + 1}. ${pricing.packSize} seeds = $${pricing.totalPrice} ($${pricing.pricePerSeed.toFixed(2)}/seed)`);
                            });
                        } else {
                            console.log('  No pricing found');
                        }
                        
                        console.log('\n✅ Data Quality Assessment:');
                        console.log('==========================================');
                        const requiredFields = [
                            { field: 'name', value: product.name, required: true },
                            { field: 'seedType', value: product.seedType, required: true },
                            { field: 'cannabisType', value: product.cannabisType, required: true },
                            { field: 'thcLevel', value: product.thcLevel, required: true },
                            { field: 'cbdLevel', value: product.cbdLevel, required: true },
                            { field: 'floweringTime', value: product.floweringTime, required: false },
                            { field: 'pricings', value: product.pricings.length > 0 ? 'Available' : null, required: true }
                        ];
                        
                        let missingRequired = 0;
                        let totalOptional = 0;
                        let foundOptional = 0;
                        
                        requiredFields.forEach(({ field, value, required }) => {
                            const status = value ? '✅' : '❌';
                            const importance = required ? '[REQUIRED]' : '[OPTIONAL]';
                            console.log(`${status} ${field} ${importance}: ${value || 'Missing'}`);
                            
                            if (required && !value) {
                                missingRequired++;
                            } else if (!required) {
                                totalOptional++;
                                if (value) foundOptional++;
                            }
                        });
                        
                        console.log(`\n📈 Extraction Success Rate:`);
                        console.log(`🎯 Required fields: ${requiredFields.filter(f => f.required).length - missingRequired}/${requiredFields.filter(f => f.required).length}`);
                        console.log(`⭐ Optional fields: ${foundOptional}/${totalOptional}`);
                        console.log(`📊 Overall score: ${((requiredFields.filter(f => f.required).length - missingRequired) / requiredFields.filter(f => f.required).length * 100).toFixed(1)}%`);
                        
                        if (missingRequired === 0) {
                            console.log('\n🎉 All required fields extracted successfully!');
                        } else {
                            console.log(`\n⚠️ ${missingRequired} required field(s) missing - needs attention`);
                        }
                        
                        resolve();
                    } else {
                        console.log('❌ Product extraction failed - no data returned');
                        reject(new Error('Product extraction returned null'));
                    }
                } catch (error) {
                    console.error('💥 Error during extraction:', error);
                    reject(error);
                }
            },
            failedRequestHandler: async ({ error }) => {
                console.error('🚫 Failed to fetch page:', error);
                reject(error);
            },
            requestHandlerTimeoutSecs: 30,
            maxRequestRetries: 3
        });
        
        // Add the test URL
        crawler.addRequests([{
            url: testUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        }]);
        
        // Run crawler
        crawler.run().catch((error) => {
            console.error('💥 Crawler failed:', error);
            reject(error);
        });
    });
}

// Run the test
testProductDetailExtraction()
    .then(() => {
        console.log('\n✅ Test completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });