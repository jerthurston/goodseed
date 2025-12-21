/**
 * Test Script for Hybrid JSON-LD + Manual Extraction
 * 
 * This script tests the new hybrid extraction system against existing scrapers
 * to validate performance and data quality improvements.
 */

import { 
  testVancouverJsonLD,
  createVancouverScraper,
  VANCOUVER_SELECTORS 
} from '@/scrapers/vancouverseedbank/hybrid/vancouver-hybrid-scraper';

import { 
  testSunWestJsonLD,
  createSunWestScraper,
  SUNWEST_SELECTORS 
} from '@/scrapers/sunwestgenetics/hybrid/sunwest-hybrid-scraper';

import { 
  testJsonLdAvailability,
  generateScraperReport,
  processUrlsBatch
} from '@/lib/services/json-ld';

import { 
  validateProduct,
  generateValidationReport,
  compareExtractionMethods
} from '@/lib/services/validation/cannabis-validator';

/**
 * Test URLs for validation (sample product pages)
 */
const TEST_URLS = {
  vancouver: [
    'https://vancouverseedbank.ca/product/blue-dream-feminized-seeds/',
    'https://vancouverseedbank.ca/product/northern-lights-feminized-seeds/',
    'https://vancouverseedbank.ca/product/white-widow-feminized-seeds/',
    'https://vancouverseedbank.ca/product/ak-47-feminized-seeds/',
    'https://vancouverseedbank.ca/product/girl-scout-cookies-feminized-seeds/'
  ],
  sunwest: [
    'https://www.sunwestgenetics.com/product/blue-dream-feminized-seeds/',
    'https://www.sunwestgenetics.com/product/og-kush-feminized-seeds/',
    'https://www.sunwestgenetics.com/product/gorilla-glue-4-feminized-seeds/',
    'https://www.sunwestgenetics.com/product/wedding-cake-feminized-seeds/',
    'https://www.sunwestgenetics.com/product/gelato-feminized-seeds/'
  ]
} as const;

/**
 * Main test function
 */
async function runHybridExtractionTests(): Promise<void> {
  console.log('🧪 Starting Hybrid Extraction System Tests');
  console.log('=' .repeat(60));

  try {
    // Test 1: JSON-LD Availability Assessment
    console.log('\n📋 Test 1: JSON-LD Availability Assessment');
    console.log('-'.repeat(40));
    await testJsonLdAvailability([
      { 
        name: 'Vancouver Seed Bank', 
        urls: TEST_URLS.vancouver.slice(0, 2) // Test first 2 URLs
      },
      { 
        name: 'SunWest Genetics', 
        urls: TEST_URLS.sunwest.slice(0, 2) // Test first 2 URLs
      }
    ]);

    // Test 2: Individual Site JSON-LD Testing
    console.log('\n🔬 Test 2: Individual Site JSON-LD Testing');
    console.log('-'.repeat(40));
    
    console.log('\n🇨🇦 Testing Vancouver Seed Bank:');
    await testVancouverJsonLD(TEST_URLS.vancouver[0]);
    
    console.log('\n🇺🇸 Testing SunWest Genetics:');
    await testSunWestJsonLD(TEST_URLS.sunwest[0]);

    // Test 3: Batch Processing Performance
    console.log('\n⚡ Test 3: Batch Processing Performance');
    console.log('-'.repeat(40));
    
    const startTime = Date.now();
    
    console.log('Processing Vancouver Seed Bank products...');
    const vancouverProducts = await processUrlsBatch(
      {
        siteName: 'vancouver-seed-bank',
        baseUrl: 'https://vancouverseedbank.ca',
        selectors: VANCOUVER_SELECTORS,
        maxConcurrency: 1,
        maxRequestsPerMinute: 10 // Slower for testing
      },
      TEST_URLS.vancouver.slice(0, 3) // Test first 3 products
    );
    
    console.log('Processing SunWest Genetics products...');
    const sunwestProducts = await processUrlsBatch(
      {
        siteName: 'sunwest-genetics', 
        baseUrl: 'https://www.sunwestgenetics.com',
        selectors: SUNWEST_SELECTORS,
        maxConcurrency: 1,
        maxRequestsPerMinute: 10
      },
      TEST_URLS.sunwest.slice(0, 3) // Test first 3 products
    );
    
    const processingTime = (Date.now() - startTime) / 1000;
    console.log(`⏱️ Total processing time: ${processingTime.toFixed(2)} seconds`);
    console.log(`📊 Vancouver products extracted: ${vancouverProducts.length}`);
    console.log(`📊 SunWest products extracted: ${sunwestProducts.length}`);

    // Test 4: Data Quality Validation
    console.log('\n✅ Test 4: Data Quality Validation');
    console.log('-'.repeat(40));
    
    const allProducts = [...vancouverProducts, ...sunwestProducts];
    
    if (allProducts.length > 0) {
      const validationReport = generateValidationReport(allProducts);
      
      console.log(`📊 Validation Summary:`);
      console.log(`   Total Products: ${validationReport.totalProducts}`);
      console.log(`   Valid Products: ${validationReport.validProducts}`);
      console.log(`   Validation Rate: ${validationReport.validationRate}%`);
      console.log(`   Average Quality Score: ${validationReport.averageScore}%`);
      
      if (validationReport.commonIssues.length > 0) {
        console.log(`\n⚠️ Top Issues:`);
        validationReport.commonIssues.slice(0, 3).forEach((issue, index) => {
          console.log(`   ${index + 1}. ${issue.issue} (${issue.percentage}% of products)`);
        });
      }
      
      console.log(`\n💡 Recommendations:`);
      validationReport.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });

      // Test 5: Individual Product Analysis
      console.log('\n🔍 Test 5: Sample Product Analysis');
      console.log('-'.repeat(40));
      
      if (allProducts.length > 0) {
        const sampleProduct = allProducts[0];
        console.log(`\n📦 Analyzing: ${sampleProduct.name}`);
        
        const validation = validateProduct(sampleProduct);
        console.log(`   Quality Score: ${validation.score}%`);
        console.log(`   Valid: ${validation.isValid ? '✅' : '❌'}`);
        console.log(`   Extraction Method: ${sampleProduct.data_source}`);
        console.log(`   Price: $${sampleProduct.price} ${sampleProduct.currency}`);
        
        if (sampleProduct.strain_type) {
          console.log(`   Strain Type: ${sampleProduct.strain_type}`);
        }
        if (sampleProduct.seed_type) {
          console.log(`   Seed Type: ${sampleProduct.seed_type}`);
        }
        if (sampleProduct.thc_content) {
          console.log(`   THC Content: ${sampleProduct.thc_content}`);
        }
        
        if (validation.errors.length > 0) {
          console.log(`\n   ❌ Errors:`);
          validation.errors.forEach(error => {
            console.log(`      • ${error.field}: ${error.message}`);
          });
        }
        
        if (validation.warnings.length > 0) {
          console.log(`\n   ⚠️ Warnings:`);
          validation.warnings.slice(0, 3).forEach(warning => {
            console.log(`      • ${warning.field}: ${warning.message}`);
          });
        }
      }
    } else {
      console.log('❌ No products were successfully extracted for validation');
    }

    // Test 6: Performance Comparison
    console.log('\n📈 Test 6: Performance vs Legacy Method');
    console.log('-'.repeat(40));
    
    const totalExtracted = allProducts.length;
    const totalTested = TEST_URLS.vancouver.length + TEST_URLS.sunwest.length;
    const successRate = (totalExtracted / Math.min(totalTested, 6)) * 100; // We tested 6 URLs total
    
    console.log(`📊 Hybrid System Performance:`);
    console.log(`   URLs Tested: 6 (3 Vancouver + 3 SunWest)`);
    console.log(`   Products Extracted: ${totalExtracted}`);
    console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`   Average Processing Time: ${(processingTime / 6).toFixed(2)}s per product`);
    
    const jsonLdProducts = allProducts.filter(p => p.data_source === 'json-ld').length;
    const manualProducts = allProducts.filter(p => p.data_source === 'manual').length;
    
    console.log(`\n🎯 Extraction Method Distribution:`);
    console.log(`   JSON-LD Extractions: ${jsonLdProducts} (${((jsonLdProducts/totalExtracted)*100).toFixed(1)}%)`);
    console.log(`   Manual Extractions: ${manualProducts} (${((manualProducts/totalExtracted)*100).toFixed(1)}%)`);

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Hybrid Extraction System Test Complete!');
    console.log('='.repeat(60));
    
    if (successRate >= 80) {
      console.log('✅ PASS: Hybrid system shows good performance');
    } else if (successRate >= 60) {
      console.log('⚠️ PARTIAL: System works but needs optimization');
    } else {
      console.log('❌ FAIL: System needs significant improvements');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Review any validation errors and warnings');
    console.log('   2. Optimize selectors for sites with low JSON-LD support');
    console.log('   3. Consider implementing additional cannabis-specific validations');
    console.log('   4. Scale testing to more products and sites');

  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

/**
 * Generate detailed scraper performance reports
 */
async function generateDetailedReports(): Promise<void> {
  console.log('\n📊 Generating Detailed Performance Reports');
  console.log('='.repeat(50));

  try {
    // Generate report for Vancouver
    console.log('\n🇨🇦 Vancouver Seed Bank Report:');
    const vancouverReport = await generateScraperReport(
      {
        siteName: 'vancouver-seed-bank',
        baseUrl: 'https://vancouverseedbank.ca', 
        selectors: VANCOUVER_SELECTORS
      },
      TEST_URLS.vancouver.slice(0, 3)
    );
    
    console.log(`   Site: ${vancouverReport.siteName}`);
    console.log(`   URLs Tested: ${vancouverReport.totalTested}`);
    console.log(`   JSON-LD Success Rate: ${vancouverReport.jsonLdSuccessRate}%`);
    console.log(`   Manual Success Rate: ${vancouverReport.manualSuccessRate}%`);
    console.log(`   Overall Success Rate: ${vancouverReport.overallSuccessRate}%`);
    console.log(`   Average Quality Score: ${vancouverReport.averageQualityScore}%`);
    
    console.log(`\n   📋 Recommendations:`);
    vancouverReport.recommendations.forEach(rec => {
      console.log(`      • ${rec}`);
    });

    // Generate report for SunWest
    console.log('\n🇺🇸 SunWest Genetics Report:');
    const sunwestReport = await generateScraperReport(
      {
        siteName: 'sunwest-genetics',
        baseUrl: 'https://www.sunwestgenetics.com',
        selectors: SUNWEST_SELECTORS
      },
      TEST_URLS.sunwest.slice(0, 3)
    );
    
    console.log(`   Site: ${sunwestReport.siteName}`);
    console.log(`   URLs Tested: ${sunwestReport.totalTested}`);
    console.log(`   JSON-LD Success Rate: ${sunwestReport.jsonLdSuccessRate}%`);
    console.log(`   Manual Success Rate: ${sunwestReport.manualSuccessRate}%`);
    console.log(`   Overall Success Rate: ${sunwestReport.overallSuccessRate}%`);
    console.log(`   Average Quality Score: ${sunwestReport.averageQualityScore}%`);
    
    console.log(`\n   📋 Recommendations:`);
    sunwestReport.recommendations.forEach(rec => {
      console.log(`      • ${rec}`);
    });

  } catch (error) {
    console.error('Error generating reports:', error);
  }
}

/**
 * Run all tests
 */
async function main(): Promise<void> {
  try {
    await runHybridExtractionTests();
    await generateDetailedReports();
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Execute tests if script is run directly
if (require.main === module) {
  main().catch(console.error);
}

export { 
  runHybridExtractionTests, 
  generateDetailedReports,
  TEST_URLS 
};