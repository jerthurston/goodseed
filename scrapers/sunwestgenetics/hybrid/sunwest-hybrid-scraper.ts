/**
 * Enhanced SunWest Genetics Scraper with JSON-LD + Manual Hybrid Approach
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
 * SunWest Genetics manual selectors configuration
 */
const SUNWEST_SELECTORS: ManualSelectors = {
  // Core product information
  name: 'h1.product_title, .product-title, h1',
  price: '.woocommerce-Price-amount, .price .amount, .product_price_dfn .amount',
  currency: '.woocommerce-Price-currencySymbol',
  image: '.wp-post-image, .product-image img, figure.main_img img',
  description: '.product-description, .woocommerce-product-details__short-description, .summary .entry-content',
  availability: '.stock, .availability, .in-stock-label',
  rating: '.star-rating',
  reviewCount: '.star-rating .rating',
  
  // Cannabis-specific selectors for SunWest Genetics
  strainType: '.icatztop .elementor-icon-list-text, .strain-type, .cannabis-type',
  seedType: '.seed-type, .variation-SeedType td, .product-attributes .seed-type',
  thcContent: '.elementor-icon-list-text:contains("THC:"), .thc-content, .thc-level',
  cbdContent: '.elementor-icon-list-text:contains("CBD:"), .cbd-content, .cbd-level',
  floweringTime: '.elementor-icon-list-text:contains("Flowering:"), .flowering-time',
  yieldInfo: '.yield-info, .elementor-icon-list-text:contains("Yield")',
  genetics: '.genetics, .lineage, .elementor-icon-list-text:contains("Genetics")',
  height: '.height, .plant-height, .elementor-icon-list-text:contains("Height")',
  effects: '.effects, .elementor-icon-list-text:contains("Effect")',
  aroma: '.aroma, .fragrance, .elementor-icon-list-text:contains("Aroma")',
  flavor: '.flavor, .taste, .elementor-icon-list-text:contains("Flavor")'
};

/**
 * Create enhanced SunWest Genetics scraper with hybrid extraction
 */
export async function createSunWestScraper(): Promise<CheerioCrawler> {
  // Setup dataset for saving results
  const dataset = await Dataset.open('sunwest-hybrid-products');

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
        // Extract using hybrid approach
        const product = await extractHybridProduct($, SUNWEST_SELECTORS, request.url);
        
        if (product) {
          // Additional SunWest-specific processing
          const enhancedProduct = enhanceSunWestProduct(product, $);
          
          // Save to dataset
          await dataset.pushData({
            ...enhancedProduct,
            extracted_at: new Date().toISOString(),
            site: 'sunwest-genetics',
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
 * SunWest-specific product enhancement
 */
function enhanceSunWestProduct(product: ScraperProduct, $: CheerioAPI): ScraperProduct {
  // Extract additional SunWest-specific data
  const enhanced = { ...product };

  try {
    // Extract growing level if available
    const growingLevel = $('.elementor-icon-list-text:contains("Growing Level:")').text().trim();
    if (growingLevel) {
      enhanced.description += `\n\nGrowing Level: ${growingLevel.replace('Growing Level:', '').trim()}`;
    }

    // Extract badges/tags (new strains, sale items, etc.)
    const badges = $('.product_tag-new-strains, .product_tag-sale, .badge')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(badge => badge.length > 0);

    if (badges.length > 0) {
      enhanced.description += `\n\nTags: ${badges.join(', ')}`;
    }

    // Clean up THC content - SunWest format is "THC: XX%"
    if (enhanced.thc_content) {
      enhanced.thc_content = enhanced.thc_content
        .replace(/THC:\s*/gi, '')
        .replace(/thc\s*:/gi, '')
        .trim();
      
      // Ensure % symbol
      if (enhanced.thc_content && !enhanced.thc_content.includes('%')) {
        enhanced.thc_content += '%';
      }
    }

    // Clean up CBD content - SunWest format is "CBD: XX%"
    if (enhanced.cbd_content) {
      enhanced.cbd_content = enhanced.cbd_content
        .replace(/CBD:\s*/gi, '')
        .replace(/cbd\s*:/gi, '')
        .trim();
      
      // Ensure % symbol
      if (enhanced.cbd_content && !enhanced.cbd_content.includes('%')) {
        enhanced.cbd_content += '%';
      }
    }

    // Clean up flowering time - SunWest format is "Flowering: X weeks"
    if (enhanced.flowering_time) {
      enhanced.flowering_time = enhanced.flowering_time
        .replace(/Flowering:\s*/gi, '')
        .replace(/flowering\s*:/gi, '')
        .trim();
    }

    // Extract pack variation prices if available
    const variations = $('input.product_variation_radio')
      .map((_, el) => {
        const $input = $(el);
        const price = $input.attr('item-price');
        const label = $input.next('label').text().trim();
        return price && label ? `${label}: $${price}` : null;
      })
      .get()
      .filter(variation => variation !== null);

    if (variations.length > 0) {
      enhanced.description += `\n\nAvailable variations: ${variations.join(', ')}`;
    }

  } catch (error) {
    console.warn('SunWest enhancement processing error:', error);
  }

  return enhanced;
}

/**
 * Test function to validate JSON-LD availability on SunWest Genetics
 */
export async function testSunWestJsonLD(url: string): Promise<void> {
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
      const product = await extractHybridProduct($, SUNWEST_SELECTORS, request.url);
      console.log(`🎯 Extraction result:`, product ? 'SUCCESS' : 'FAILED');
      
      if (product) {
        console.log(`📊 Product data:`, {
          name: product.name,
          price: product.price,
          source: product.data_source,
          strainType: product.strain_type,
          seedType: product.seed_type,
          thcContent: product.thc_content
        });
      }
    }
  });

  await testCrawler.addRequests([url]);
  await testCrawler.run();
}

// Export for use in other modules
export { SUNWEST_SELECTORS };