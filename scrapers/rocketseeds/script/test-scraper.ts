/**
 * 🧪 ROCKET SEEDS SCRAPER TEST
 * 
 * Tests the complete Rocket Seeds scraper với sitemap crawling và icon-based extraction
 * Validation: THC/CBD levels, cannabis type, pricing variants, genetics
 */

import RocketSeedsScraper from '../core/rocketSeedScraper';
import { SiteConfig } from '../../../lib/factories/scraper-factory';
import { ROCKETSEEDS_PRODUCT_CARD_SELECTORS } from '../core/selector';

async function testRocketSeedsScraper() {
    console.log('🧪 Rocket Seeds Complete Scraper Test');
    console.log('============================================================\n');

    try {
        // Mock site config with proper selectors
        const siteConfig: SiteConfig = {
            name: 'Rocket Seeds',
            baseUrl: 'https://rocketseeds.com',
            isImplemented: true,
            selectors: ROCKETSEEDS_PRODUCT_CARD_SELECTORS // ✅ Use actual selectors
        };

        // Mock source context với pagination URL (NEW STRATEGY)
        const sourceContext = {
            scrapingSourceUrl: 'https://rocketseeds.com/shop?swoof=1&product_brand=rocketseeds', // Pagination URL with filters
            sourceName: 'Rocket Seeds Pagination',
            dbMaxPage: 0
        };

        console.log('📋 Test Configuration:');
        console.log(`  Site: ${siteConfig.name}`);
        console.log(`  Base URL: ${siteConfig.baseUrl}`);
        console.log(`  Source URL: ${sourceContext.scrapingSourceUrl}`);
        console.log(`  Strategy: Pagination-based crawling (NEW)`);
        console.log(`  Total Pages: ${sourceContext.dbMaxPage}`);
        console.log(`  Test Mode: Limited to 5 products (startPage=1, endPage=6)`);
        console.log(`  Extraction: Icon-based với specification_individual structure`);

        console.log('\n🚀 Starting Rocket Seeds Scraper...');
        console.log('--------------------------------------------------');

        const startTime = Date.now();

        // Run the scraper với test mode (limited products)
        const result = await RocketSeedsScraper(
            siteConfig,
            1, // startPage - test mode với 5 products
            6, // endPage - test mode limit
            sourceContext
        );

        const duration = Date.now() - startTime;

        console.log('\n✅ Rocket Seeds Scraper Completed!');
        console.log('==================================================');

        console.log('\n📊 Scraping Results:');
        console.log(`  Total Products: ${result.totalProducts}`);
        console.log(`  Total Pages Processed: ${result.totalPages}`);
        console.log(`  Duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
        console.log(`  Timestamp: ${result.timestamp}`);
        console.log(`  Average Processing Time: ${(duration/result.totalProducts).toFixed(0)}ms per product`);

        console.log('\n📦 Extracted Products Analysis:');
        if (result.products.length > 0) {
            // Analyze each product for completeness
            let completeProducts = 0;
            let incompleteProducts = 0;
            
            result.products.forEach((product, index) => {
                const completionScore = calculateCompletionScore(product);
                
                console.log(`\n${index + 1}. ${product.name} (${completionScore.percentage}% complete)`);
                console.log(`   URL: ${product.url}`);
                console.log(`   Image: ${product.imageUrl ? '✅ Found' : '❌ Missing'}`);
                
                // Cannabis-specific data validation
                console.log(`   🌿 Cannabis Data:`);
                console.log(`     - Cannabis Type: ${product.cannabisType || 'Not detected'} ${product.cannabisType ? '✅' : '❌'}`);
                console.log(`     - Seed Type: ${product.seedType || 'Not available'} ${product.seedType ? '✅' : '❌'}`);
                
                // THC/CBD levels validation
                console.log(`   🧪 Cannabinoid Levels:`);
                if (product.thcLevel || product.thcMin || product.thcMax) {
                    console.log(`     - THC: ${product.thcLevel || `${product.thcMin || 'N/A'}-${product.thcMax || 'N/A'}%`} ✅`);
                } else {
                    console.log(`     - THC: Not detected ❌`);
                }
                
                if (product.cbdLevel || product.cbdMin || product.cbdMax) {
                    console.log(`     - CBD: ${product.cbdLevel || `${product.cbdMin || 'N/A'}-${product.cbdMax || 'N/A'}%`} ✅`);
                } else {
                    console.log(`     - CBD: Not detected ❌`);
                }
                
                // Growing information
                console.log(`   🌱 Growing Information:`);
                console.log(`     - Flowering Time: ${product.floweringTime || 'Not available'} ${product.floweringTime ? '✅' : '❌'}`);
                console.log(`     - Growing Level: ${product.growingLevel || 'Not available'} ${product.growingLevel ? '✅' : '❌'}`);
                
                // Pricing analysis
                console.log(`   💰 Pricing Information:`);
                console.log(`     - Pricing Variations: ${product.pricings.length} ${product.pricings.length > 0 ? '✅' : '❌'}`);
                if (product.pricings.length > 0) {
                    product.pricings.forEach((pricing, pIndex) => {
                        console.log(`       ${pIndex + 1}. $${pricing.totalPrice} (${pricing.packSize} seeds)`);
                    });
                }
                
                if (completionScore.percentage >= 80) {
                    completeProducts++;
                } else {
                    incompleteProducts++;
                }
                
                console.log(`   📊 Completion Score: ${completionScore.details}`);
            });

            // Overall quality analysis
            console.log('\n📈 Extraction Quality Analysis:');
            console.log('================================================');
            console.log(`Complete Products (≥80%): ${completeProducts}`);
            console.log(`Incomplete Products (<80%): ${incompleteProducts}`);
            console.log(`Success Rate: ${((completeProducts/result.products.length) * 100).toFixed(1)}%`);
            
            // Field success rates
            const fieldSuccessRates = calculateFieldSuccessRates(result.products);
            console.log('\n📋 Field Success Rates:');
            Object.entries(fieldSuccessRates).forEach(([field, rate]) => {
                const status = rate >= 80 ? '✅' : rate >= 50 ? '⚠️' : '❌';
                console.log(`  ${field}: ${rate.toFixed(1)}% ${status}`);
            });
            
        } else {
            console.log('  ❌ No products extracted - check extraction logic');
        }

        // Test validation
        console.log('\n🎯 Test Validation:');
        console.log('===================');
        
        if (result.products.length === 0) {
            console.log('❌ FAIL: No products extracted');
        } else if (result.products.length < 3) {
            console.log('⚠️ WARNING: Less than expected products extracted');
        } else {
            console.log('✅ PASS: Products successfully extracted');
        }
        
        const avgCompleteness = result.products.reduce((sum, p) => 
            sum + calculateCompletionScore(p).percentage, 0) / result.products.length;
        
        if (avgCompleteness >= 80) {
            console.log('✅ PASS: High extraction completeness (≥80%)');
        } else if (avgCompleteness >= 60) {
            console.log('⚠️ WARNING: Medium extraction completeness (60-79%)');
        } else {
            console.log('❌ FAIL: Low extraction completeness (<60%)');
        }

    } catch (error) {
        console.error('❌ Error testing Rocket Seeds scraper:', error);
        process.exit(1);
    }
}

/**
 * Calculate completion score for a product
 */
function calculateCompletionScore(product: any): { percentage: number; details: string } {
    const fields = {
        name: product.name,
        url: product.url,
        imageUrl: product.imageUrl,
        cannabisType: product.cannabisType,
        seedType: product.seedType,
        thcData: product.thcLevel || product.thcMin || product.thcMax,
        cbdData: product.cbdLevel || product.cbdMin || product.cbdMax,
        floweringTime: product.floweringTime,
        growingLevel: product.growingLevel,
        pricings: product.pricings && product.pricings.length > 0
    };
    
    const completedFields = Object.values(fields).filter(field => 
        field !== null && field !== undefined && field !== '' && field !== 'Not available'
    ).length;
    
    const totalFields = Object.keys(fields).length;
    const percentage = (completedFields / totalFields) * 100;
    
    return {
        percentage,
        details: `${completedFields}/${totalFields} fields`
    };
}

/**
 * Calculate field success rates across all products
 */
function calculateFieldSuccessRates(products: any[]): Record<string, number> {
    const fields = ['name', 'imageUrl', 'cannabisType', 'seedType', 'thcData', 'cbdData', 'floweringTime', 'growingLevel', 'pricings'];
    const rates: Record<string, number> = {};
    
    fields.forEach(field => {
        let successCount = 0;
        
        products.forEach(product => {
            let hasValue = false;
            
            if (field === 'thcData') {
                hasValue = !!(product.thcLevel || product.thcMin || product.thcMax);
            } else if (field === 'cbdData') {
                hasValue = !!(product.cbdLevel || product.cbdMin || product.cbdMax);
            } else if (field === 'pricings') {
                hasValue = product.pricings && product.pricings.length > 0;
            } else {
                const value = product[field];
                hasValue = !!(value && value !== '' && value !== 'Not available');
            }
            
            if (hasValue) successCount++;
        });
        
        rates[field] = (successCount / products.length) * 100;
    });
    
    return rates;
}

// Run the test
if (require.main === module) {
    testRocketSeedsScraper();
}