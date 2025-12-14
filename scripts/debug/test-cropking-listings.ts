/**
 * Simple test for Crop King Seeds listing URLs
 */

import { JSDOM } from 'jsdom';

async function testListingURL(url: string) {
  console.log(`🔍 Testing listing URL: ${url}`);
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Check for JSON-LD scripts
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    console.log(`   📄 JSON-LD scripts found: ${jsonLdScripts.length}`);
    
    jsonLdScripts.forEach((script, index) => {
      try {
        const jsonData = JSON.parse(script.textContent || '');
        console.log(`   ✅ Script ${index + 1}: ${jsonData['@type'] || 'Unknown type'}`);
        
        if (jsonData['@type'] === 'ItemList' || jsonData['@type'] === 'CollectionPage') {
          console.log(`      🎯 Found listing page schema!`);
          if (jsonData.itemListElement) {
            console.log(`      📊 Items: ${jsonData.itemListElement.length}`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Script ${index + 1}: Invalid JSON`);
      }
    });
    
    // Check for pagination elements
    const paginationSelectors = [
      '.pagination',
      '.page-numbers', 
      '.nav-links',
      '.wp-pagenavi',
      'a[href*="page"]',
      'a[href*="paged"]'
    ];
    
    let paginationFound = false;
    for (const selector of paginationSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`   🔄 Pagination found: ${selector} (${elements.length} elements)`);
        paginationFound = true;
        
        // Extract page numbers
        elements.forEach((el, i) => {
          if (i < 3) { // Show first 3
            const text = el.textContent?.trim() || el.getAttribute('href') || '';
            console.log(`      ${i + 1}: ${text}`);
          }
        });
      }
    }
    
    if (!paginationFound) {
      console.log(`   ⚠️ No pagination elements found`);
    }
    
    // Check for product links
    const productSelectors = [
      'a[href*="marijuana-seeds"]',
      'a[href*="cannabis-seeds"]', 
      'a[href*="seeds"]'
    ];
    
    let productCount = 0;
    for (const selector of productSelectors) {
      const products = document.querySelectorAll(selector);
      productCount += products.length;
    }
    
    console.log(`   🌱 Product links found: ${productCount}`);
    console.log('');
    
  } catch (error) {
    console.error(`   ❌ Error: ${error}`);
    console.log('');
  }
}

async function main() {
  console.log('🧪 Testing Crop King Seeds Listing URLs');
  console.log('==========================================\n');
  
  const listingUrls = [
    'https://www.cropkingseeds.ca/shop/',
    'https://www.cropkingseeds.ca/marijuana-seeds/', 
    'https://www.cropkingseeds.ca/feminized-seeds-canada/',
    'https://www.cropkingseeds.ca/autoflower-seeds-canada/'
  ];
  
  for (const url of listingUrls) {
    await testListingURL(url);
  }
}

main().catch(console.error);