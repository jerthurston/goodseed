/**
 * Test script to validate Crop King Seeds scraper using Vancouver patterns
 * Tests the enhanced extraction methods for cannabis data
 */
import { CheerioCrawler } from 'crawlee';

async function testCropKingSeedsVancouverPatterns() {
  console.log('🚀 Testing Crop King Seeds with Vancouver Pattern Enhancements');
  console.log('================================================================');

  // Test URLs - using actual product pages
  const testUrls = [
    'https://www.cropkingseeds.com/product/red-cherry-berry-feminized-seeds/',
    'https://www.cropkingseeds.com/product/white-widow-feminized-seeds/',
    'https://www.cropkingseeds.com/product/sour-diesel-autoflower-seeds/'
  ];

  const crawler = new CheerioCrawler({
    requestHandler: async ({ request, $ }) => {
      console.log(`\n🔍 Testing: ${request.loadedUrl}`);
      console.log('---------------------------------------------------');

      try {
        // Test JSON-LD extraction
        console.log('📊 JSON-LD Product Data:');
        const jsonLdScripts = $('script[type="application/ld+json"]').get();
        let productFound = false;

        for (const script of jsonLdScripts) {
          try {
            const data = JSON.parse($(script).html() || '');
            if (data['@type'] === 'Product' || (Array.isArray(data) && data.some((item: any) => item['@type'] === 'Product'))) {
              const product = Array.isArray(data) ? data.find((item: any) => item['@type'] === 'Product') : data;
              console.log(`   ✅ Product Name: ${product.name || 'N/A'}`);
              console.log(`   ✅ Price: ${product.offers?.price || 'N/A'} ${product.offers?.priceCurrency || ''}`);
              console.log(`   ✅ Availability: ${product.offers?.availability || 'N/A'}`);
              console.log(`   ✅ Description Length: ${(product.description || '').length} chars`);
              productFound = true;
              break;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }

        if (!productFound) {
          console.log('   ❌ No Product JSON-LD found');
        }

        // Test Vancouver Pattern Selectors
        console.log('\n🎯 Vancouver Pattern Cannabis Data Extraction:');

        // Test strain type extraction
        const strainType = $('.itype .elementor-icon-list-text').text().trim();
        console.log(`   Strain Type (.itype): "${strainType}"`);

        // Test THC from dedicated selector
        const thcLevel = $('.thc-lvl').text().trim();
        console.log(`   THC Level (.thc-lvl): "${thcLevel}"`);

        // Test Vancouver-style ACF selectors
        console.log('\n   🔧 Vancouver ACF Pattern Tests:');

        // THC content using Vancouver pattern
        const thcVancouver = $('.custom-acf-prod li:contains("THC") .elementor-icon-list-text').text().trim();
        console.log(`   THC (Vancouver pattern): "${thcVancouver}"`);

        // CBD content using Vancouver pattern
        const cbdVancouver = $('.custom-acf-prod li:contains("CBD") .elementor-icon-list-text').text().trim();
        console.log(`   CBD (Vancouver pattern): "${cbdVancouver}"`);

        // Flowering time using Vancouver pattern
        const floweringVancouver = $('.custom-acf-prod li:contains("Flowering Time") .elementor-icon-list-text, .custom-acf-prod li:contains("Flowering") .elementor-icon-list-text').text().trim();
        console.log(`   Flowering (Vancouver pattern): "${floweringVancouver}"`);

        // Yield using Vancouver pattern
        const yieldVancouver = $('.custom-acf-prod li:contains("Yield") .elementor-icon-list-text').text().trim();
        console.log(`   Yield (Vancouver pattern): "${yieldVancouver}"`);

        // Genetics using Vancouver pattern
        const geneticsVancouver = $('.custom-acf-prod li:contains("Genetics") .elementor-icon-list-text').text().trim();
        console.log(`   Genetics (Vancouver pattern): "${geneticsVancouver}"`);

        // Growing level using Vancouver pattern
        const growingVancouver = $('.custom-acf-prod li:contains("Growing Level") .elementor-icon-list-text, .custom-acf-prod li:contains("Difficulty") .elementor-icon-list-text').text().trim();
        console.log(`   Growing Level (Vancouver pattern): "${growingVancouver}"`);

        // Effects using Vancouver pattern
        const effectsVancouver = $('.custom-acf-prod li:contains("Effects") .elementor-icon-list-text, .custom-acf-prod li:contains("Effect") .elementor-icon-list-text').text().trim();
        console.log(`   Effects (Vancouver pattern): "${effectsVancouver}"`);

        // Pack sizes using Vancouver pattern
        const packSizes = $('[data-attribute_pa_pack-size] option, .variation-PackSize select option')
          .map((_, el) => $(el).text().trim())
          .get()
          .filter(size => size && size !== 'Choose an option');
        console.log(`   Pack Sizes (Vancouver pattern): [${packSizes.join(', ')}]`);

        // Test all ACF items structure
        console.log('\n   📋 All ACF Items Found:');
        const acfItems = $('.custom-acf-prod .elementor-icon-list-item');
        acfItems.each((_, item) => {
          const text = $(item).find('.elementor-icon-list-text').text().trim();
          if (text) {
            console.log(`     - "${text}"`);
          }
        });

        // Calculate completion score
        const dataPoints = [
          strainType ? 'Strain Type' : null,
          thcLevel || thcVancouver ? 'THC Content' : null,
          cbdVancouver ? 'CBD Content' : null,
          floweringVancouver ? 'Flowering Time' : null,
          yieldVancouver ? 'Yield Info' : null,
          geneticsVancouver ? 'Genetics' : null,
          growingVancouver ? 'Growing Level' : null,
          effectsVancouver ? 'Effects' : null,
          packSizes.length > 0 ? 'Pack Sizes' : null
        ].filter(Boolean);

        const completionScore = (dataPoints.length / 9) * 100;
        console.log(`\n🎯 Cannabis Data Completion Score: ${completionScore.toFixed(1)}% (${dataPoints.length}/9)`);
        console.log(`   ✅ Extracted: ${dataPoints.join(', ')}`);

        if (completionScore >= 70) {
          console.log('   🎉 EXCELLENT! Vancouver patterns working well');
        } else if (completionScore >= 50) {
          console.log('   ✅ GOOD! Vancouver patterns showing improvement');
        } else {
          console.log('   ⚠️  NEEDS IMPROVEMENT: Low data extraction rate');
        }

      } catch (error) {
        console.error(`❌ Error processing ${request.loadedUrl}:`, error);
      }
    },
    maxRequestsPerCrawl: testUrls.length,
  });

  try {
    await crawler.run(testUrls);
    console.log('\n🎉 Vancouver Pattern Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCropKingSeedsVancouverPatterns().catch(console.error);