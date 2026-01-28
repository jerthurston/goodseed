/**
 * 🧪 CROP KING SEEDS SCRAPER TEST
 * 
 * Test the main scraper function with real crawling using Crawlee
 * Features: Polite crawling, pagination handling, dataset management
 */

import { CropKingSeedsScraper } from '../core/cropkingSeedScraper';
import { SiteConfig } from '../../../lib/factories/scraper-factory';
import { CROPKINGSEEDS_PRODUCT_CARD_SELECTORS } from '../core/selectors';

/**
 * Test result interface
 */
interface ScraperTestResult {
    success: boolean;
    totalProducts: number;
    totalPages: number;
    duration: number;
    avgProductsPerPage: number;
    productSample: Array<{
        name: string;
        url: string;
        seedType?: string;
        cannabisType?: string;
        thc: string;
        cbd: string;
        pricingCount: number;
        hasImage: boolean;
    }>;
    errors?: string[];
}

/**
 * Test parameters
 */
interface TestParams {
    testUrl?: string;
    startPage?: number;
    endPage?: number;
    dbMaxPage?: number;
    sampleSize?: number;
}

/**
 * Main test function for the scraper
 */
async function testCropKingSeedsScraper(params: TestParams = {}): Promise<ScraperTestResult> {
    const {
        testUrl = 'https://www.cropkingseeds.ca/marijuana-seeds/',
        startPage = 1,
        endPage = 2, // Test with just 2 pages
        dbMaxPage = 10,
        sampleSize = 5
    } = params;

    console.log('🧪 Crop King Seeds Scraper Test');
    console.log('===============================\n');

    const result: ScraperTestResult = {
        success: false,
        totalProducts: 0,
        totalPages: 0,
        duration: 0,
        avgProductsPerPage: 0,
        productSample: [],
        errors: []
    };

    try {
        // Site configuration
        const siteConfig: SiteConfig = {
            name: 'Crop King Seeds',
            baseUrl: 'https://www.cropkingseeds.ca',
            isImplemented: true,
            selectors: CROPKINGSEEDS_PRODUCT_CARD_SELECTORS
        };

        // Source context for scraping
        const sourceContext = {
            scrapingSourceUrl: testUrl,
            sourceName: 'Crop King Seeds - Marijuana Seeds',
            dbMaxPage: dbMaxPage
        };

        console.log('🚀 Starting scraper test...');
        console.log(`📂 Source URL: ${sourceContext.scrapingSourceUrl}`);
        console.log(`📄 Page range: ${startPage} - ${endPage}`);
        console.log(`📄 Max pages: ${sourceContext.dbMaxPage}`);
        console.log('🔧 Mode: Crawlee-based scraping with polite delays\n');

        const startTime = Date.now();

        // Run scraper
        const scraperResult = await CropKingSeedsScraper(
            siteConfig,
            startPage,
            endPage,
            false, // fullSiteCrawl = false for test
            sourceContext
        );

        const duration = Date.now() - startTime;

        // Populate results
        result.success = true;
        result.totalProducts = scraperResult.totalProducts;
        result.totalPages = scraperResult.totalPages;
        result.duration = duration;
        result.avgProductsPerPage = result.totalPages > 0 ? 
            Math.round((result.totalProducts / result.totalPages) * 100) / 100 : 0;

        // Generate product sample
        result.productSample = scraperResult.products.slice(0, sampleSize).map(product => ({
            name: product.name,
            url: product.url,
            seedType: product.seedType,
            cannabisType: product.cannabisType,
            thc: product.thcLevel || `${product.thcMin || 'N/A'}-${product.thcMax || 'N/A'}%`,
            cbd: product.cbdLevel || `${product.cbdMin || 'N/A'}-${product.cbdMax || 'N/A'}%`,
            pricingCount: product.pricings.length,
            hasImage: !!product.imageUrl
        }));

        // Log results
        logTestResults(result, scraperResult);

        return result;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('\n❌ Scraper test failed:');
        console.error(errorMsg);
        
        result.errors?.push(errorMsg);
        result.success = false;
        
        return result;
    }
}

/**
 * Log detailed test results
 */
function logTestResults(result: ScraperTestResult, scraperResult: any) {
    console.log('\n✅ Scraper test completed!');
    console.log('==========================');
    
    console.log('\n📊 PERFORMANCE METRICS:');
    console.log('=======================');
    console.log(`⏱️ Total duration: ${result.duration}ms (${(result.duration / 1000).toFixed(2)}s)`);
    console.log(`📄 Pages processed: ${result.totalPages}`);
    console.log(`🛍️ Total products: ${result.totalProducts}`);
    console.log(`📈 Avg products/page: ${result.avgProductsPerPage}`);
    console.log(`⚡ Products/second: ${((result.totalProducts / (result.duration / 1000)) || 0).toFixed(2)}`);
    console.log(`📅 Scraped at: ${scraperResult.timestamp.toISOString()}`);

    // Validation checks
    console.log('\n🎯 VALIDATION RESULTS:');
    console.log('======================');
    
    const validations = [
        {
            check: 'Products extracted',
            passed: result.totalProducts > 0,
            value: `${result.totalProducts} products`
        },
        {
            check: 'Pages processed',
            passed: result.totalPages > 0,
            value: `${result.totalPages} pages`
        },
        {
            check: 'Performance acceptable',
            passed: result.duration < 120000, // Less than 2 minutes
            value: `${(result.duration / 1000).toFixed(2)}s`
        },
        {
            check: 'Product extraction rate',
            passed: result.avgProductsPerPage >= 15, // At least 15 products per page
            value: `${result.avgProductsPerPage} products/page`
        },
        {
            check: 'Sample data quality',
            passed: result.productSample.length > 0 && 
                   result.productSample.every(p => p.name && p.url),
            value: `${result.productSample.length} valid samples`
        }
    ];

    validations.forEach(validation => {
        const status = validation.passed ? '✅' : '❌';
        console.log(`${status} ${validation.check}: ${validation.value}`);
    });

    // Product samples
    if (result.productSample.length > 0) {
        console.log('\n📦 PRODUCT SAMPLES:');
        console.log('===================');
        
        result.productSample.forEach((product, index) => {
            console.log(`\n${index + 1}. ${product.name}`);
            console.log(`   🔗 URL: ${product.url}`);
            console.log(`   🌱 Type: ${product.seedType || 'Unknown'} | ${product.cannabisType || 'Unknown'}`);
            console.log(`   🧪 THC: ${product.thc} | CBD: ${product.cbd}`);
            console.log(`   💰 Pricing: ${product.pricingCount} variants | 🖼️ Image: ${product.hasImage ? '✅' : '❌'}`);
        });
    }

    // Overall status
    const overallSuccess = result.success && validations.every(v => v.passed);
    console.log(`\n🎯 OVERALL RESULT: ${overallSuccess ? '✅ SUCCESS' : '❌ ISSUES DETECTED'}`);
}

/**
 * Quick test function
 */
async function quickTest(): Promise<ScraperTestResult> {
    console.log('🚀 Running Quick Scraper Test (2 pages)...\n');
    return await testCropKingSeedsScraper({
        startPage: 1,
        endPage: 2
    });
}

/**
 * Extended test function
 */
async function extendedTest(): Promise<ScraperTestResult> {
    console.log('🔬 Running Extended Scraper Test (5 pages)...\n');
    return await testCropKingSeedsScraper({
        startPage: 1,
        endPage: 5,
        sampleSize: 10
    });
}

/**
 * Single page test function
 */
async function singlePageTest(): Promise<ScraperTestResult> {
    console.log('⚡ Running Single Page Test...\n');
    return await testCropKingSeedsScraper({
        startPage: 1,
        endPage: 1,
        sampleSize: 20
    });
}

// Export functions
export { 
    testCropKingSeedsScraper, 
    quickTest, 
    extendedTest, 
    singlePageTest
};

// Export types
export type {
    ScraperTestResult,
    TestParams
};

// Run test if executed directly
if (require.main === module) {
    (async () => {
        try {
            console.log('🎬 Crop King Seeds Scraper Test Suite');
            console.log('=====================================\n');

            // Run quick test by default
            const result = await quickTest();

            // Exit with appropriate code
            const exitCode = result.success ? 0 : 1;
            
            console.log('\n📋 TEST SUMMARY:');
            console.log('================');
            console.log(`Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
            console.log(`Products: ${result.totalProducts}`);
            console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
            console.log(`Exit Code: ${exitCode}`);
            
            if (result.errors && result.errors.length > 0) {
                console.log('\n❌ Errors encountered:');
                result.errors.forEach(error => console.log(`  - ${error}`));
            }

            process.exit(exitCode);
            
        } catch (error) {
            console.error('❌ Fatal test error:', error);
            process.exit(1);
        }
    })();
}