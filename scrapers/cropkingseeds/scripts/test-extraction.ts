/**
 * 🧪 CROP KING SEEDS EXTRACTION TEST - IMPROVED VERSION
 * 
 * Comprehensive test of the extraction function with real HTML from live website
 * Features: Product detection, THC/CBD extraction, pricing variants, image handling, pagination
 * Returns: Detailed results object with products and maxPages data
 */

import { extractProductsFromHTML } from '../utils/extractProductFromHTML';
import { SiteConfig } from '../../../lib/factories/scraper-factory';
import { CROPKINGSEEDS_PRODUCT_CARD_SELECTORS } from '../core/selectors';
import { ProductCardDataFromCrawling } from '../../../types/crawl.type';
import * as cheerio from 'cheerio';

/**
 * Test result interface
 */
interface TestResult {
    success: boolean;
    products: ProductCardDataFromCrawling[];
    maxPages: number | null;
    statistics: {
        totalProducts: number;
        extractionTime: number;
        completenessScore: number;
        successRate: number;
        fieldSuccessRates: Record<string, number>;
        productTypes: Record<string, number>;
        cannabisTypes: Record<string, number>;
        dataCompleteness: Record<string, number>;
    };
    sampleProducts: Array<{
        name: string;
        url: string;
        seedType?: string;
        cannabisType?: string;
        thc: string;
        cbd: string;
        pricingCount: number;
        hasImage: boolean;
        completeness: number;
    }>;
    debugInfo?: {
        selectors: Record<string, number>;
        containerCounts: {
            total: number;
            withImages: number;
            withTitles: number;
            withBoth: number;
        };
        paginationInfo: {
            found: boolean;
            type?: string;
            itemsCount: number;
        };
    };
    errors?: string[];
}

/**
 * Test parameters interface
 */
interface TestParams {
    testUrl?: string;
    startPage?: number | null;
    endPage?: number | null;
    fullSiteCrawl?: boolean;
    dbMaxPage?: number;
    enableDebug?: boolean;
}

/**
 * Main test function with configurable parameters and detailed return object
 */
async function testCropKingSeedsExtraction(params: TestParams = {}): Promise<TestResult> {
    const {
        testUrl = 'https://www.cropkingseeds.ca/marijuana-seeds/',
        startPage = null,
        endPage = null,
        fullSiteCrawl = false,
        dbMaxPage = 10,
        enableDebug = false
    } = params;

    console.log('🧪 Crop King Seeds Extraction Test - Improved Version');
    console.log('====================================================\n');

    // Site configuration
    const siteConfig: SiteConfig = {
        name: 'Crop King Seeds',
        baseUrl: 'https://www.cropkingseeds.ca',
        isImplemented: true,
        selectors: CROPKINGSEEDS_PRODUCT_CARD_SELECTORS
    };

    // Initialize result object
    const result: TestResult = {
        success: false,
        products: [],
        maxPages: null,
        statistics: {
            totalProducts: 0,
            extractionTime: 0,
            completenessScore: 0,
            successRate: 0,
            fieldSuccessRates: {},
            productTypes: {},
            cannabisTypes: {},
            dataCompleteness: {}
        },
        sampleProducts: [],
        errors: []
    };

    try {
        // Fetch HTML from website
        console.log(`📂 Fetching HTML from: ${testUrl}`);
        
        const response = await fetch(testUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            const errorMsg = `Failed to fetch: ${response.status} ${response.statusText}`;
            console.log(`❌ ${errorMsg}`);
            result.errors?.push(errorMsg);
            return result;
        }
        
        const htmlContent = await response.text();
        console.log(`✅ HTML fetched (${htmlContent.length} characters)\n`);

        console.log('🔍 Running extraction...');
        const startTime = Date.now();
        const $ = cheerio.load(htmlContent);
        
        // Run extraction function
        const extractionResult = extractProductsFromHTML(
            $,
            siteConfig,
            dbMaxPage,
            startPage,
            endPage,
            fullSiteCrawl
        );

        const extractionTime = Date.now() - startTime;

        // Populate basic results
        result.products = extractionResult.products;
        result.maxPages = extractionResult.maxPages;
        result.statistics.totalProducts = extractionResult.products.length;
        result.statistics.extractionTime = extractionTime;

        console.log(`✅ Extraction completed in ${extractionTime}ms\n`);
        console.log('📊 EXTRACTION RESULTS:');
        console.log('======================');
        console.log(`Products found: ${result.statistics.totalProducts}`);
        console.log(`Max pages detected: ${result.maxPages}`);

        if (result.products.length === 0) {
            console.log('❌ NO PRODUCTS EXTRACTED\n');
            result.success = false;
            
            // Add debug info if enabled
            if (enableDebug) {
                result.debugInfo = generateDebugInfo($);
                logDebugInfo(result.debugInfo);
            }
        } else {
            console.log('✅ Products successfully extracted\n');
            result.success = true;
            
            // Calculate comprehensive statistics
            result.statistics = calculateStatistics(result.products, extractionTime);
            
            // Generate sample products
            result.sampleProducts = generateSampleProducts(result.products, 5);
            
            // Log detailed results
            logDetailedResults(result);
            
            // Add debug info if enabled
            if (enableDebug) {
                result.debugInfo = generateDebugInfo($);
                logDebugInfo(result.debugInfo);
            }
        }

        return result;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error during extraction test: ${errorMsg}`);
        result.errors?.push(errorMsg);
        return result;
    }
}

/**
 * Calculate comprehensive statistics for extracted products
 */
function calculateStatistics(products: ProductCardDataFromCrawling[], extractionTime: number) {
    const fieldSuccessRates = calculateFieldSuccessRates(products);
    
    const productTypes = {
        autoflower: products.filter(p => p.seedType === 'autoflower').length,
        feminized: products.filter(p => p.seedType === 'feminized').length,
        regular: products.filter(p => p.seedType === 'regular').length,
        photoperiod: products.filter(p => p.seedType === 'photoperiod').length,
        unknown: products.filter(p => !p.seedType).length
    };
    
    const cannabisTypes = {
        indica: products.filter(p => p.cannabisType === 'indica').length,
        sativa: products.filter(p => p.cannabisType === 'sativa').length,
        hybrid: products.filter(p => p.cannabisType === 'hybrid').length,
        unknown: products.filter(p => !p.cannabisType).length
    };
    
    const dataCompleteness = {
        withImages: products.filter(p => p.imageUrl && p.imageUrl.length > 0).length,
        withTHC: products.filter(p => p.thcLevel || p.thcMin || p.thcMax).length,
        withCBD: products.filter(p => p.cbdLevel || p.cbdMin || p.cbdMax).length,
        withPricing: products.filter(p => p.pricings && p.pricings.length > 0).length,
        withFloweringTime: products.filter(p => p.floweringTime && p.floweringTime.length > 0).length
    };
    
    // Calculate completeness score
    const completenessScore = products.reduce((sum, p) => 
        sum + calculateCompletionScore(p).percentage, 0) / Math.max(1, products.length);

    // Calculate success rate (products with ≥70% completeness)
    const completeProducts = products.filter(p => 
        calculateCompletionScore(p).percentage >= 70
    ).length;
    const successRate = (completeProducts / Math.max(1, products.length)) * 100;

    return {
        totalProducts: products.length,
        extractionTime,
        completenessScore: Math.round(completenessScore * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        fieldSuccessRates,
        productTypes,
        cannabisTypes,
        dataCompleteness
    };
}

/**
 * Generate sample products for display
 */
function generateSampleProducts(products: ProductCardDataFromCrawling[], count: number) {
    return products.slice(0, count).map(p => ({
        name: p.name,
        url: p.url,
        seedType: p.seedType,
        cannabisType: p.cannabisType,
        thc: p.thcLevel || `${p.thcMin || 'N/A'}-${p.thcMax || 'N/A'}%`,
        cbd: p.cbdLevel || `${p.cbdMin || 'N/A'}-${p.cbdMax || 'N/A'}%`,
        pricingCount: p.pricings.length,
        hasImage: !!p.imageUrl,
        completeness: Math.round(calculateCompletionScore(p).percentage * 100) / 100
    }));
}

/**
 * Generate debug information
 */
function generateDebugInfo($: ReturnType<typeof import('cheerio').load>) {
    const selectors = CROPKINGSEEDS_PRODUCT_CARD_SELECTORS;
    const selectorCounts: Record<string, number> = {};
    
    // Test individual selectors
    Object.entries(selectors).forEach(([key, selector]) => {
        if (typeof selector === 'string' && selector) {
            selectorCounts[key] = $(selector).length;
        }
    });
    
    // Test container detection logic
    const $containers = $('div');
    let containersWithImg = 0;
    let containersWithTitles = 0;
    let containersWithBoth = 0;

    $containers.each((_, element) => {
        const $container = $(element);
        const hasImg = $container.find('.main_img').length > 0;
        const hasTitles = $container.find('.prod_titles').length > 0;
        
        if (hasImg) containersWithImg++;
        if (hasTitles) containersWithTitles++;
        if (hasImg && hasTitles) containersWithBoth++;
    });
    
    // Test pagination
    const $pagination = $(selectors.paginationContainer).first();
    const paginationInfo = {
        found: $pagination.length > 0,
        type: $pagination.length > 0 ? 
            ($pagination.hasClass('woocommerce-pagination') ? 'WooCommerce' : 'Jet Smart Filters') : undefined,
        itemsCount: $pagination.find(selectors.paginationItems).length
    };

    return {
        selectors: selectorCounts,
        containerCounts: {
            total: $containers.length,
            withImages: containersWithImg,
            withTitles: containersWithTitles,
            withBoth: containersWithBoth
        },
        paginationInfo
    };
}

/**
 * Log detailed results to console
 */
function logDetailedResults(result: TestResult) {
    const { statistics, sampleProducts } = result;
    
    console.log('📈 DETAILED STATISTICS:');
    console.log('======================');
    console.log(`Extraction Time: ${statistics.extractionTime}ms`);
    console.log(`Overall Completeness: ${statistics.completenessScore}%`);
    console.log(`Success Rate: ${statistics.successRate}%`);
    
    console.log('\n📋 Field Success Rates:');
    Object.entries(statistics.fieldSuccessRates).forEach(([field, rate]) => {
        const status = rate >= 80 ? '✅' : rate >= 50 ? '⚠️' : '❌';
        console.log(`  ${field}: ${rate.toFixed(1)}% ${status}`);
    });
    
    console.log('\n🌱 Product Types:');
    Object.entries(statistics.productTypes).forEach(([type, count]) => {
        const percentage = ((count / statistics.totalProducts) * 100).toFixed(1);
        console.log(`  ${type}: ${count} (${percentage}%)`);
    });
    
    console.log('\n🌿 Cannabis Types:');
    Object.entries(statistics.cannabisTypes).forEach(([type, count]) => {
        const percentage = ((count / statistics.totalProducts) * 100).toFixed(1);
        console.log(`  ${type}: ${count} (${percentage}%)`);
    });
    
    console.log('\n📦 Data Completeness:');
    Object.entries(statistics.dataCompleteness).forEach(([field, count]) => {
        const percentage = ((count / statistics.totalProducts) * 100).toFixed(1);
        console.log(`  ${field}: ${count} (${percentage}%)`);
    });
    
    console.log('\n📦 SAMPLE PRODUCTS (Top 5):');
    console.log('============================');
    sampleProducts.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   🔗 URL: ${product.url}`);
        console.log(`   🌱 Type: ${product.seedType || 'Unknown'} | ${product.cannabisType || 'Unknown'}`);
        console.log(`   🧪 THC: ${product.thc} | CBD: ${product.cbd}`);
        console.log(`   💰 Pricing: ${product.pricingCount} variants | 🖼️ Image: ${product.hasImage ? '✅' : '❌'}`);
        console.log(`   📊 Completeness: ${product.completeness}%`);
    });
}

/**
 * Log debug information to console
 */
function logDebugInfo(debugInfo: TestResult['debugInfo']) {
    if (!debugInfo) return;
    
    console.log('\n🔧 DEBUG INFORMATION:');
    console.log('=====================');
    
    console.log('\nSelector Effectiveness:');
    Object.entries(debugInfo.selectors).forEach(([key, count]) => {
        const status = count > 0 ? '✅' : '❌';
        console.log(`  ${key}: ${count} elements ${status}`);
    });
    
    console.log('\nContainer Detection:');
    const { containerCounts } = debugInfo;
    console.log(`  Total divs: ${containerCounts.total}`);
    console.log(`  With .main_img: ${containerCounts.withImages}`);
    console.log(`  With .prod_titles: ${containerCounts.withTitles}`);
    console.log(`  With both (products): ${containerCounts.withBoth}`);
    
    console.log('\nPagination Info:');
    const { paginationInfo } = debugInfo;
    console.log(`  Found: ${paginationInfo.found ? '✅' : '❌'}`);
    if (paginationInfo.found) {
        console.log(`  Type: ${paginationInfo.type}`);
        console.log(`  Items: ${paginationInfo.itemsCount}`);
    }
}

/**
 * Calculate completion score for a product
 */
function calculateCompletionScore(product: ProductCardDataFromCrawling): { percentage: number; details: string } {
    const fields = {
        name: product.name,
        url: product.url,
        slug: product.slug,
        imageUrl: product.imageUrl,
        seedType: product.seedType,
        cannabisType: product.cannabisType,
        thcData: product.thcLevel || product.thcMin || product.thcMax,
        cbdData: product.cbdLevel || product.cbdMin || product.cbdMax,
        floweringTime: product.floweringTime,
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
function calculateFieldSuccessRates(products: ProductCardDataFromCrawling[]): Record<string, number> {
    const fields = ['name', 'imageUrl', 'seedType', 'cannabisType', 'thcData', 'cbdData', 'floweringTime', 'pricings'];
    const rates: Record<string, number> = {};
    
    if (products.length === 0) return rates;
    
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
                const value = (product as any)[field];
                hasValue = !!(value && value !== '' && value !== 'Not available');
            }
            
            if (hasValue) successCount++;
        });
        
        rates[field] = (successCount / products.length) * 100;
    });
    
    return rates;
}

/**
 * Quick test function (for backwards compatibility)
 */
async function quickTest(): Promise<TestResult> {
    console.log('🚀 Running Quick Test...\n');
    return await testCropKingSeedsExtraction();
}

/**
 * Advanced test function with custom parameters
 */
async function advancedTest(params: TestParams): Promise<TestResult> {
    console.log('🔬 Running Advanced Test...\n');
    return await testCropKingSeedsExtraction(params);
}

/**
 * Debug test function with debug info enabled
 */
async function debugTest(): Promise<TestResult> {
    console.log('🔧 Running Debug Test...\n');
    return await testCropKingSeedsExtraction({ enableDebug: true });
}

// Export functions for use as module
export { 
    testCropKingSeedsExtraction,
    quickTest,
    advancedTest,
    debugTest
};

// Export types
export type { 
    TestResult,
    TestParams 
};

// Run test if executed directly
if (require.main === module) {
    (async () => {
        try {
            // Run quick test by default
            const result = await quickTest();
            
            console.log('\n🎯 FINAL RESULT SUMMARY:');
            console.log('========================');
            console.log(`Success: ${result.success ? '✅' : '❌'}`);
            console.log(`Products: ${result.statistics.totalProducts}`);
            console.log(`Max Pages: ${result.maxPages}`);
            console.log(`Completeness: ${result.statistics.completenessScore}%`);
            console.log(`Success Rate: ${result.statistics.successRate}%`);
            console.log(`Extraction Time: ${result.statistics.extractionTime}ms`);
            
            if (result.errors && result.errors.length > 0) {
                console.log('\n❌ Errors:');
                result.errors.forEach(error => console.log(`  - ${error}`));
            }
            
            // Example of returning result object (can be used by other scripts)
            console.log('\n📋 RESULT OBJECT AVAILABLE FOR EXTERNAL USE:');
            console.log(`- result.products: Array of ${result.products.length} ProductCardDataFromCrawling objects`);
            console.log(`- result.maxPages: ${result.maxPages}`);
            console.log(`- result.statistics: Complete extraction statistics`);
            console.log(`- result.sampleProducts: Preview of first 5 products`);
            
            process.exit(result.success ? 0 : 1);
            
        } catch (error) {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        }
    })();
}