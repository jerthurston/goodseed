/**
 * Enhanced Vancouver Seed Bank Scraper with JSON-LD + Manual Hybrid Approach
 * 
 * This scraper uses JSON-LD extraction as primary method with manual selectors as fallback
 */

import { CheerioCrawler, Dataset } from 'crawlee';
import { CheerioAPI } from 'cheerio';
import { 
  extractHybridProduct, 
  ManualSelectors, 
  ScraperProduct,
  generateExtractionReport 
} from '@/lib/services/json-ld';

/**
 * Vancouver Seed Bank manual selectors configuration
 */
const VANCOUVER_SELECTORS: ManualSelectors = {
  // Core product information
  name: 'h1.product_title, .product-title, h1',
  price: '.woocommerce-Price-amount, .price .amount, .product_price_dfn .amount',
  currency: '.woocommerce-Price-currencySymbol',
  image: '.wp-post-image, .product-image img, figure.main_img img',
  description: '.product-description, .woocommerce-product-details__short-description, .summary .entry-content',
  availability: '.stock, .availability, .in-stock-label',
  rating: '.star-rating strong.rating',
  reviewCount: '.raiting-and-review-count div:last-child',
  
  // Cannabis-specific selectors for Vancouver Seed Bank
  strainType: '.itype .elementor-icon-list-text, .strain-type, .cannabis-type',
  seedType: '.seed-type, .variation-SeedType td, .product-attributes .seed-type',
  thcContent: '.thc-lvl, .thc-content, .custom-acf-prod li:contains("THC") .elementor-icon-list-text',
  cbdContent: '.cbd-lvl, .cbd-content, .custom-acf-prod li:contains("CBD") .elementor-icon-list-text',
  floweringTime: '.custom-acf-prod li:contains("Flowering") .elementor-icon-list-text, .flowering-time',
  yieldInfo: '.yield-info, .custom-acf-prod li:contains("Yield") .elementor-icon-list-text',
  genetics: '.genetics, .lineage, .custom-acf-prod li:contains("Genetics") .elementor-icon-list-text',
  height: '.height, .plant-height, .custom-acf-prod li:contains("Height") .elementor-icon-list-text',
  effects: '.effects, .custom-acf-prod li:contains("Effect") .elementor-icon-list-text',
  aroma: '.aroma, .fragrance, .custom-acf-prod li:contains("Aroma") .elementor-icon-list-text',
  flavor: '.flavor, .taste, .custom-acf-prod li:contains("Flavor") .elementor-icon-list-text'
};

/**
 * Create enhanced Vancouver Seed Bank scraper with hybrid extraction
 */
export async function createVancouverScraper(): Promise<CheerioCrawler> {
  // Setup dataset for saving results
  const dataset = await Dataset.open('vancouver-hybrid-products');

  return new CheerioCrawler({
    // Compliance with project requirements
    maxConcurrency: 1, // Sequential processing within same site
    maxRequestsPerMinute: 15, // Conservative rate limiting
    
    async requestHandler({ $, request, log }) {
      // Add compliance delay (2-5 seconds)
      await new Promise(resolve => 
        setTimeout(resolve, Math.random() * 3000 + 2000)
      );

      log.info(`🔍 Processing: ${request.url}`);

      try {
        // Extract both methods for comparison
        const product = await extractHybridProduct($, VANCOUVER_SELECTORS, request.url);
        
        if (product) {
          // Additional Vancouver-specific processing
          const enhancedProduct = enhanceVancouverProduct(product, $);
          
          // Save to dataset
          await dataset.pushData({
            ...enhancedProduct,
            extracted_at: new Date().toISOString(),
            site: 'vancouver-seed-bank',
            page_url: request.url
          });

          log.info(`✅ Successfully extracted: ${enhancedProduct.name} ($${enhancedProduct.price})`);
        } else {
          log.error(`❌ Failed to extract product from: ${request.url}`);
        }

      } catch (error) {
        log.error(`💥 Scraper error for ${request.url}: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    // Enhanced error handling
    failedRequestHandler({ request, log }) {
      log.error(`❌ Request failed: ${request.url}`);
    }
  });
}

/**
 * Vancouver-specific product enhancement
 */
function enhanceVancouverProduct(product: ScraperProduct, $: CheerioAPI): ScraperProduct {
  // Extract additional Vancouver-specific data
  const enhanced = { ...product };

  try {
    // Try to extract pack sizes if available
    const packSizes = $('[data-attribute_pa_pack-size] option, .variation-PackSize select option')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(size => size && size !== 'Choose an option');

    if (packSizes.length > 0) {
      enhanced.description += `\n\nAvailable pack sizes: ${packSizes.join(', ')}`;
    }

    // Extract growing difficulty if available
    const growingLevel = $('.custom-acf-prod li:contains("Growing Level") .elementor-icon-list-text').text().trim();
    if (growingLevel) {
      enhanced.description += `\n\nGrowing Level: ${growingLevel}`;
    }

    // Clean up strain type formatting
    if (enhanced.strain_type) {
      enhanced.strain_type = enhanced.strain_type
        .replace(/strain/gi, '')
        .replace(/type/gi, '')
        .trim();
    }

    // Parse THC content to extract range
    if (enhanced.thc_content) {
      const thcMatch = enhanced.thc_content.match(/(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?%?/);
      if (thcMatch) {
        enhanced.thc_content = thcMatch[2] ? 
          `${thcMatch[1]}-${thcMatch[2]}%` : 
          `${thcMatch[1]}%`;
      }
    }

    // Parse CBD content similarly  
    if (enhanced.cbd_content) {
      const cbdMatch = enhanced.cbd_content.match(/(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?%?/);
      if (cbdMatch) {
        enhanced.cbd_content = cbdMatch[2] ? 
          `${cbdMatch[1]}-${cbdMatch[2]}%` : 
          `${cbdMatch[1]}%`;
      }
    }

  } catch (error) {
    console.warn('Enhancement processing error:', error);
  }

  return enhanced;
}

/**
 * Test function to validate JSON-LD availability on Vancouver Seed Bank
 */
export async function testVancouverJsonLD(url: string): Promise<void> {
  const { CheerioCrawler } = await import('crawlee');
  
  const testCrawler = new CheerioCrawler({
    maxConcurrency: 1,
    
    async requestHandler({ $, request }) {
      console.log(`🧪 Testing JSON-LD on: ${request.url}`);
      
      // Check for JSON-LD scripts
      const jsonLdScripts = $('script[type="application/ld+json"]');
      console.log(`📄 Found ${jsonLdScripts.length} JSON-LD scripts`);

      jsonLdScripts.each((index, element) => {
        const content = $(element).html();
        if (content) {
          try {
            const jsonData = JSON.parse(content);
            console.log(`📋 Script ${index + 1}:`, {
              type: jsonData['@type'] || 'Unknown',
              hasProduct: jsonData['@type'] === 'Product',
              hasOffer: !!jsonData.offers,
              preview: JSON.stringify(jsonData).substring(0, 200) + '...'
            });
          } catch (e) {
            console.log(`⚠️ Script ${index + 1}: Invalid JSON`);
          }
        }
      });

      // Test extraction
      const product = await extractHybridProduct($, VANCOUVER_SELECTORS, request.url);
      console.log(`🎯 Extraction result:`, product ? 'SUCCESS' : 'FAILED');
      
      if (product) {
        console.log(`📊 Product data:`, {
          name: product.name,
          price: product.price,
          source: product.data_source,
          strainType: product.strain_type,
          seedType: product.seed_type
        });
      }
    }
  });

  await testCrawler.addRequests([url]);
  await testCrawler.run();
}

// Export for use in other modules
export { VANCOUVER_SELECTORS };