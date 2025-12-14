/**
 * Phase 4.1: Test JSON-LD Extraction for Crop King Seeds
 * Following add-new-scraper-guide(JSON-LD).md - Phase 4.1
 */

import { CheerioAPI } from 'cheerio';
import { JSDOM } from 'jsdom';
import { CROPKINGSEEDS_SELECTORS } from '../../scrapers/cropkingseeds/hybrid/cropkingseeds-hybrid-scraper';
import { extractHybridProduct } from '../../lib/services/json-ld';

const TEST_PRODUCT_URLS = [
  'https://www.cropkingseeds.ca/feminized-seeds-canada/gelato-marijuana-seeds/',
  'https://www.cropkingseeds.ca/autoflower-seeds-canada/amnesia-haze-marijuana-seeds/',
  'https://www.cropkingseeds.ca/cbd-seeds-canada/cb-diesel-marijuana-seeds/'
];

async function testJsonLdExtraction(url: string) {
  console.log(`🔍 Testing JSON-LD extraction: ${url}`);
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Create cheerio-like object for extraction
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Manual cheerio simulation for JSON-LD extraction
    const $ = {
      find: (selector: string) => {
        const elements = Array.from(document.querySelectorAll(selector));
        return {
          length: elements.length,
          each: (callback: (i: number, el: any) => void) => {
            elements.forEach((el, i) => callback(i, el));
          }
        };
      }
    } as any;
    
    // Check JSON-LD scripts
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    console.log(`   📄 JSON-LD scripts found: ${jsonLdScripts.length}`);
    
    let productSchemaFound = false;
    let cannabisDataFound = false;
    
    jsonLdScripts.forEach((script, index) => {
      try {
        const jsonData = JSON.parse(script.textContent || '');
        const type = jsonData['@type'] || 'Unknown';
        console.log(`   📋 Script ${index + 1}: ${type}`);
        
        if (type === 'Product') {
          productSchemaFound = true;
          console.log(`      ✅ Product schema found!`);
          
          // Check for cannabis-specific data
          const hasOffers = jsonData.offers ? '✅' : '❌';
          const hasImages = jsonData.image ? '✅' : '❌';
          const hasDescription = jsonData.description ? '✅' : '❌';
          
          console.log(`      ${hasOffers} Offers data`);
          console.log(`      ${hasImages} Images`);
          console.log(`      ${hasDescription} Description`);
          
          // Check for cannabis data in description
          if (jsonData.description) {
            const desc = jsonData.description.toLowerCase();
            if (desc.includes('thc') || desc.includes('cbd') || desc.includes('indica') || desc.includes('sativa')) {
              cannabisDataFound = true;
              console.log(`      ✅ Cannabis data detected in description`);
            }
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Script ${index + 1}: Invalid JSON`);
      }
    });
    
    // Overall assessment for this URL
    const jsonLdQuality = productSchemaFound ? (cannabisDataFound ? 95 : 75) : 0;
    console.log(`   🎯 JSON-LD Quality: ${jsonLdQuality}%`);
    
    return {
      url,
      jsonLdScripts: jsonLdScripts.length,
      productSchemaFound,
      cannabisDataFound,
      quality: jsonLdQuality
    };
    
  } catch (error) {
    console.error(`   ❌ Error testing ${url}:`, error);
    return {
      url,
      jsonLdScripts: 0,
      productSchemaFound: false,
      cannabisDataFound: false,
      quality: 0
    };
  }
}

async function main() {
  console.log('🧪 Phase 4.1: Testing JSON-LD Extraction for Crop King Seeds');
  console.log('='.repeat(60));
  console.log('Following: docs/implementation/add-new-scraper-guide(JSON-LD).md - Phase 4.1\n');
  
  const results = [];
  
  for (const url of TEST_PRODUCT_URLS) {
    const result = await testJsonLdExtraction(url);
    results.push(result);
    console.log('');
  }
  
  // Summary report
  console.log('📊 PHASE 4.1 SUMMARY REPORT');
  console.log('='.repeat(40));
  
  const totalProducts = results.length;
  const jsonLdFound = results.filter(r => r.jsonLdScripts > 0).length;
  const productSchemaFound = results.filter(r => r.productSchemaFound).length;
  const cannabisDataFound = results.filter(r => r.cannabisDataFound).length;
  const avgQuality = results.reduce((sum, r) => sum + r.quality, 0) / totalProducts;
  
  console.log(`✅ JSON-LD found: ${jsonLdFound}/${totalProducts} products (${Math.round(jsonLdFound/totalProducts*100)}%)`);
  console.log(`✅ Product schema valid: ${productSchemaFound}/${totalProducts} (${Math.round(productSchemaFound/totalProducts*100)}%)`);
  console.log(`✅ Cannabis data coverage: ${cannabisDataFound}/${totalProducts} (${Math.round(cannabisDataFound/totalProducts*100)}%)`);
  console.log(`🎯 Average quality score: ${Math.round(avgQuality)}%`);
  
  // Phase 4.1 Requirements Check
  console.log('\n📋 PHASE 4.1 REQUIREMENTS CHECK');
  console.log('='.repeat(40));
  const jsonLdCoverage = jsonLdFound / totalProducts * 100;
  const schemaValid = productSchemaFound / totalProducts * 100;
  const cannabisCoverage = cannabisDataFound / totalProducts * 100;
  
  console.log(`${jsonLdCoverage >= 80 ? '✅' : '❌'} JSON-LD Coverage: ${Math.round(jsonLdCoverage)}% (requirement: >80%)`);
  console.log(`${schemaValid >= 100 ? '✅' : '❌'} Product schema valid: ${Math.round(schemaValid)}% (requirement: 100%)`);
  console.log(`${cannabisCoverage >= 85 ? '✅' : '❌'} Cannabis data coverage: ${Math.round(cannabisCoverage)}% (requirement: >85%)`);
  
  if (jsonLdCoverage >= 80 && schemaValid >= 100 && cannabisCoverage >= 85) {
    console.log('\n🎉 Phase 4.1 PASSED! Ready for Phase 4.2');
  } else {
    console.log('\n⚠️ Phase 4.1 needs improvement before proceeding to Phase 4.2');
  }
}

main().catch(console.error);