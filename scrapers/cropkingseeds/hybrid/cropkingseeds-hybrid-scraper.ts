/**
 * Crop King Seeds Hybrid Scraper
 * 
 * Hybrid JSON-LD + Manual extraction for Crop King Seeds
 * Platform: woocommerce
 * Base URL: https://www.cropkingseeds.ca
 */

import { CheerioCrawler, Dataset } from 'crawlee';
import { CheerioAPI } from 'cheerio';
import { 
  extractHybridProduct, 
  ManualSelectors, 
  ScraperProduct 
} from '@/lib/services/json-ld';
import { PRODUCT_CARD_SELECTORS, BASE_URL } from '../core/selectors';

/**
 * Crop King Seeds manual selectors configuration
 * Now using organized selectors from selectors.ts
 */
export const CROPKINGSEEDS_SELECTORS: ManualSelectors = {
  // Core product information
  name: PRODUCT_CARD_SELECTORS.name,
  price: PRODUCT_CARD_SELECTORS.price,
  currency: '.woocommerce-Price-currencySymbol, .currency',
  image: PRODUCT_CARD_SELECTORS.image,
  description: PRODUCT_CARD_SELECTORS.description,
  availability: PRODUCT_CARD_SELECTORS.stockStatus,
  rating: PRODUCT_CARD_SELECTORS.rating,
  reviewCount: PRODUCT_CARD_SELECTORS.reviewCount,
  
  // Cannabis-specific selectors
  strainType: PRODUCT_CARD_SELECTORS.strainType,
  seedType: '.seed-type, .variation-SeedType td, .product-attributes .seed-type',
  thcContent: PRODUCT_CARD_SELECTORS.thcLevel,
  cbdContent: PRODUCT_CARD_SELECTORS.cbdLevel,
  floweringTime: PRODUCT_CARD_SELECTORS.floweringTime,
  yieldInfo: `${PRODUCT_CARD_SELECTORS.yieldIndoor}, ${PRODUCT_CARD_SELECTORS.yieldOutdoor}`,
  genetics: PRODUCT_CARD_SELECTORS.genetics,
  height: PRODUCT_CARD_SELECTORS.height,
  effects: PRODUCT_CARD_SELECTORS.effects,
  aroma: '.custom-acf-prod li:contains("Aroma") .elementor-icon-list-text',
  flavor: '.custom-acf-prod li:contains("Flavor") .elementor-icon-list-text'
};

/**
 * Create Crop King Seeds hybrid scraper
 */
export async function createCropKingSeedsScraper(): Promise<CheerioCrawler> {
  const dataset = await Dataset.open('cropkingseeds-hybrid-products');

  return new CheerioCrawler({
    // Compliance settings
    maxConcurrency: 1,
    maxRequestsPerMinute: 15,
    
    async requestHandler({ $, request, log }) {
      // Compliance delay (2-5 seconds)
      await new Promise(resolve => 
        setTimeout(resolve, Math.random() * 3000 + 2000)
      );

      log.info(`🔍 Processing: ${request.url}`);

      try {
        const product = await extractHybridProduct($, CROPKINGSEEDS_SELECTORS, request.url);
        
        if (product) {
          const enhancedProduct = enhanceCropKingSeedsProduct(product, $);
          
          await dataset.pushData({
            ...enhancedProduct,
            extracted_at: new Date().toISOString(),
            site: 'cropkingseeds',
            page_url: request.url
          });

          log.info(`✅ Extracted: ${enhancedProduct.name} ($${enhancedProduct.price})`);
        } else {
          log.error(`❌ Failed to extract: ${request.url}`);
        }

      } catch (error) {
        log.error(`💥 Error processing ${request.url}: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    failedRequestHandler({ request, log }) {
      log.error(`❌ Request failed: ${request.url}`);
    }
  });
}

/**
 * Site-specific enhancement function for Crop King Seeds
 * Extracts cannabis-specific data using regex patterns and site-specific selectors
 */
function enhanceCropKingSeedsProduct(product: ScraperProduct, $: CheerioAPI): ScraperProduct {
  const enhanced = { ...product };

  try {
    // Get full description text for analysis
    const fullDescription = [
      product.description || '',
      $('.product-description').text(),
      $('.woocommerce-product-details__short-description').text(),
      $('.entry-content').text()
    ].join(' ').toLowerCase();

    // 1. THC/CBD Content Extraction (Advanced Regex)
    extractCannabinoidContent(enhanced, fullDescription);

    // 2. WooCommerce Attributes Table Extraction (Priority fallback)
    extractFromAttributesTable(enhanced, $);

    // 3. Strain Type Detection (Enhanced patterns)
    extractStrainType(enhanced, fullDescription);

    // 4. Genetics/Lineage Extraction
    extractGenetics(enhanced, fullDescription, $);

    // 4. Growing Information
    extractGrowingInfo(enhanced, fullDescription, $);

    // 5. Sensory Attributes (Aroma, Flavor, Effects)
    extractSensoryAttributes(enhanced, fullDescription, $);

    // 6. Multiple Images Extraction
    extractMultipleImages(enhanced, $);

    // 7. Price Enhancement (handle ranges)
    enhancePriceData(enhanced);

    console.log(`🔧 Enhanced product: ${product.name} [${enhanced.strain_type || 'N/A'}] THC:${enhanced.thc_content || 'N/A'}% CBD:${enhanced.cbd_content || 'N/A'}%`);
    
  } catch (error) {
    console.warn('Enhancement processing error:', error);
  }

  return enhanced;
}

/**
 * Extract THC/CBD content using comprehensive regex patterns
 * Based on actual Crop King Seeds content format analysis
 */
function extractCannabinoidContent(product: ScraperProduct, description: string): void {
  // THC Content Patterns (based on "THC content below 1%")
  const thcPatterns = [
    /thc\s+content\s+(?:below|under|less than|<)\s*(\d+(?:\.\d+)?)%?/i,  // "THC content below 1%"
    /thc.*?(\d+(?:\.\d+)?)%/i,                    // "THC: 25%"
    /(\d+(?:\.\d+)?)%?\s*thc/i,                   // "25% THC"
    /thc\s*(?:level|content).*?(\d+(?:\.\d+)?)%?/i, // "THC content 25%"
    /(\d+(?:\.\d+)?)%?\s*(?:of\s+)?thc/i,         // "25% of THC"
    /tetrahydrocannabinol.*?(\d+(?:\.\d+)?)%/i,   // "tetrahydrocannabinol 25%"
    /keeping\s+the\s+thc\s+content\s+below\s+(\d+(?:\.\d+)?)%?/i  // "keeping the THC content below 1%"
  ];

  // CBD Content Patterns (based on "content level of 20%")
  const cbdPatterns = [
    /cbd\s+punch\s+with\s+a\s+content\s+level\s+of\s+(\d+(?:\.\d+)?)%?/i, // "packs a CBD punch with a content level of 20%"
    /content\s+level\s+of\s+(\d+(?:\.\d+)?)%/i,   // "content level of 20%"
    /cbd.*?(\d+(?:\.\d+)?)%/i,                    // "CBD: 15%"
    /(\d+(?:\.\d+)?)%?\s*cbd/i,                   // "15% CBD"
    /cbd\s*(?:level|content).*?(\d+(?:\.\d+)?)%?/i, // "CBD content 15%"
    /(\d+(?:\.\d+)?)%?\s*(?:of\s+)?cbd/i,         // "15% of CBD"
    /cannabidiol.*?(\d+(?:\.\d+)?)%/i             // "cannabidiol 15%"
  ];

  // Extract THC
  for (const pattern of thcPatterns) {
    const match = description.match(pattern);
    if (match && !product.thc_content) {
      const value = parseFloat(match[1]);
      if (value >= 0 && value <= 35) { // Reasonable THC range
        product.thc_content = `${value}%`;
        break;
      }
    }
  }

  // Extract CBD  
  for (const pattern of cbdPatterns) {
    const match = description.match(pattern);
    if (match && !product.cbd_content) {
      const value = parseFloat(match[1]);
      if (value >= 0 && value <= 25) { // Reasonable CBD range
        product.cbd_content = `${value}%`;
        break;
      }
    }
  }

  // Special case: "THC content below 1%" or "low THC"
  if (!product.thc_content && /thc.*?below.*?(\d+(?:\.\d+)?)%/i.test(description)) {
    const match = description.match(/thc.*?below.*?(\d+(?:\.\d+)?)%/i);
    if (match) {
      product.thc_content = `<${match[1]}%`; // Below threshold
    }
  }
}

/**
 * Extract strain type with enhanced detection - Based on Crop King Seeds patterns
 */
function extractStrainType(product: ScraperProduct, description: string): void {
  const strainPatterns = [
    // Crop King Seeds specific patterns
    { pattern: /this\s+sativa[- ]dominant\s+beauty/i, type: 'sativa-dominant' },
    { pattern: /sativa[- ]dominant\s+beauty/i, type: 'sativa-dominant' },
    { pattern: /indica[- ]dominant|indica dominant/i, type: 'indica-dominant' },
    { pattern: /sativa[- ]dominant|sativa dominant/i, type: 'sativa-dominant' },  
    { pattern: /(?:is\s+a\s+)?(?:fantastic\s+)?hybrid/i, type: 'hybrid' },
    { pattern: /\b(?:pure\s+)?indica\b/i, type: 'indica' },
    { pattern: /\b(?:pure\s+)?sativa\b/i, type: 'sativa' },
    { pattern: /hybrid|50\/50|balanced/i, type: 'hybrid' },
    { pattern: /indica\/sativa|indica\s*\/\s*sativa/i, type: 'hybrid' },
    { pattern: /\d+%\s*indica.*?\d+%\s*sativa|\d+%\s*sativa.*?\d+%\s*indica/i, type: 'hybrid' }
  ];

  for (const { pattern, type } of strainPatterns) {
    if (pattern.test(description)) {
      product.strain_type = type;
      console.log(`🌿 Strain type detected: "${pattern}" -> "${type}"`);
      break;
    }
  }
}

/**
 * Extract genetics/lineage information - Based on Crop King Seeds patterns
 */
function extractGenetics(product: ScraperProduct, description: string, $: CheerioAPI): void {
  // Look for genetics in specific elements first
  const geneticsSelectors = ['.genetics', '.lineage', '.parents', '.strain-info'];
  for (const selector of geneticsSelectors) {
    const genetics = $(selector).text().trim();
    if (genetics) {
      product.genetics = genetics;
      return;
    }
  }

  // Regex patterns for genetics in description - Crop King Seeds format
  const geneticsPatterns = [
    // "born from a mix of Sour Diesel, Turbo Diesel, and Harlequin"
    /born\s+from\s+a\s+mix\s+of\s+([^.]+)/i,
    /(?:genetics|lineage|cross|bred from|parents?):\s*([^.]+)/i,
    /(?:a cross of|crossing|hybrid of|mix of)\s+([^.]+)/i,
    /created\s+(?:by\s+)?(?:crossing|breeding)\s+([^.]+)/i,
    /combination\s+of\s+([^.]+)/i,
    /blend\s+of\s+([^.]+)/i,
    /([a-z\s]+)\s*[x×]\s*([a-z\s]+)/i, // "Northern Lights x Skunk"
  ];

  for (const pattern of geneticsPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      let genetics = match[1].trim();
      // Clean up the genetics string
      genetics = genetics.replace(/\s+and\s+/g, ' x ').replace(/,\s+/g, ' x ');
      product.genetics = genetics;
      console.log(`🧬 Genetics detected: "${match[0]}" -> "${genetics}"`);
      break;
    }
  }
}

/**
 * Extract growing information
 */
function extractGrowingInfo(product: ScraperProduct, description: string, $: CheerioAPI): void {
  // Flowering time
  const floweringPatterns = [
    /flowering.*?(\d+(?:-\d+)?\s*(?:weeks?|days?))/i,
    /(\d+(?:-\d+)?\s*(?:weeks?|days?))\s*flowering/i,
    /flower.*?(\d+(?:-\d+)?\s*(?:weeks?|days?))/i
  ];

  for (const pattern of floweringPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      product.flowering_time = match[1].trim();
      break;
    }
  }

  // Yield information
  const yieldPatterns = [
    /yield.*?(\d+(?:-\d+)?\s*(?:g\/m²|grams?\s*per\s*(?:square\s*)?met(?:er|re)|g\/plant|grams?\s*per\s*plant))/i,
    /(\d+(?:-\d+)?\s*(?:g\/m²|grams?\s*per\s*(?:square\s*)?met(?:er|re)|g\/plant|grams?\s*per\s*plant))\s*yield/i
  ];

  for (const pattern of yieldPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      product.yield_info = match[1].trim();
      break;
    }
  }

  // Plant height
  const heightPatterns = [
    /height.*?(\d+(?:-\d+)?\s*(?:cm|centimeters?|m|meters?|ft|feet|inches?))/i,
    /(\d+(?:-\d+)?\s*(?:cm|centimeters?|m|meters?|ft|feet|inches?))\s*(?:tall|high|height)/i
  ];

  for (const pattern of heightPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      product.height = match[1].trim();
      break;
    }
  }
}

/**
 * Extract sensory attributes
 */
function extractSensoryAttributes(product: ScraperProduct, description: string, $: CheerioAPI): void {
  // Aroma patterns
  const aromaPatterns = [
    /aroma.*?[:;]?\s*([^.]+)/i,
    /smell.*?[:;]?\s*([^.]+)/i,
    /scent.*?[:;]?\s*([^.]+)/i
  ];

  for (const pattern of aromaPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      product.aroma = match[1].trim().split(/[,;]/).map(s => s.trim()).join(', ');
      break;
    }
  }

  // Flavor patterns  
  const flavorPatterns = [
    /flavor.*?[:;]?\s*([^.]+)/i,
    /taste.*?[:;]?\s*([^.]+)/i,
    /flavou?r.*?[:;]?\s*([^.]+)/i
  ];

  for (const pattern of flavorPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      product.flavor = match[1].trim().split(/[,;]/).map(s => s.trim()).join(', ');
      break;
    }
  }

  // Effects patterns
  const effectPatterns = [
    /effects?.*?[:;]?\s*([^.]+)/i,
    /experience.*?[:;]?\s*([^.]+)/i,
    /feel(?:ing)?.*?[:;]?\s*([^.]+)/i
  ];

  for (const pattern of effectPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      product.effects = match[1].trim().split(/[,;]/).map(s => s.trim()).join(', ');
      break;
    }
  }
}

/**
 * Extract multiple images from product galleries
 */
function extractMultipleImages(product: ScraperProduct, $: CheerioAPI): void {
  const images: string[] = [];
  
  // Primary image (already extracted)
  if (product.image_url) {
    images.push(product.image_url);
  }

  // Gallery images selectors for Crop King Seeds
  const gallerySelectors = [
    '.woocommerce-product-gallery__image img',
    '.product-images img', 
    '.product-gallery img',
    '.wp-post-image',
    '.attachment-woocommerce_single img'
  ];

  gallerySelectors.forEach(selector => {
    $(selector).each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      if (src && !images.includes(src)) {
        // Validate image URL
        if (isValidImageUrl(src)) {
          images.push(src);
        }
      }
    });
  });

  // Update product with multiple images (store as JSON string or add to description)
  if (images.length > 1) {
    // Since interface doesn't have images array, we'll use image_url for primary
    product.image_url = images[0]; // Keep primary image
    // Store additional images in description as metadata
    const additionalImages = images.slice(1);
    if (additionalImages.length > 0) {
      product.description += `\n\n<!-- Additional Images: ${additionalImages.join(', ')} -->`;
    }
  }
}

/**
 * Validate image URL quality
 */
function isValidImageUrl(url: string): boolean {
  // Skip placeholder, thumbnail, or low-quality images
  const invalidPatterns = [
    /placeholder/i,
    /dummy/i,
    /\d+x\d+\./, // Skip tiny images like 50x50
    /-\d{2,3}x\d{2,3}\./, // Skip WordPress thumbnails
  ];

  return !invalidPatterns.some(pattern => pattern.test(url)) && 
         url.includes('crop') || url.includes('seed') || url.includes('cannabis');
}

/**
 * Enhance price data (handle ranges and currencies)
 */
function enhancePriceData(product: ScraperProduct): void {
  if (!product.price) return;

  let priceStr = product.price.toString();
  
  // Clean up price format
  priceStr = priceStr.replace(/[^\d.\-$\s]/g, '');
  
  // Handle price ranges like "$65.00 - $240.00"
  const rangeMatch = priceStr.match(/\$?(\d+(?:\.\d{2})?)\s*-\s*\$?(\d+(?:\.\d{2})?)/);
  if (rangeMatch) {
    const minPrice = parseFloat(rangeMatch[1]);
    const maxPrice = parseFloat(rangeMatch[2]);
    product.price = minPrice; // Use minimum as default price
    // Store range info in description
    product.description += `\n\n<!-- Price Range: $${minPrice} - $${maxPrice} CAD -->`;
  } else {
    // Single price
    const singleMatch = priceStr.match(/\$?(\d+(?:\.\d{2})?)/);
    if (singleMatch) {
      product.price = parseFloat(singleMatch[1]);
    }
  }

  // Set currency
  product.currency = 'CAD'; // Crop King Seeds uses Canadian Dollars
}

/**
 * Test JSON-LD availability for Crop King Seeds
 */
export async function testCropKingSeedsJsonLD(url: string): Promise<void> {
  const { CheerioCrawler } = await import('crawlee');
  
  const testCrawler = new CheerioCrawler({
    maxConcurrency: 1,
    
    async requestHandler({ $, request }) {
      console.log(`🧪 Testing JSON-LD on: ${request.url}`);
      
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

      const product = await extractHybridProduct($, CROPKINGSEEDS_SELECTORS, request.url);
      console.log(`🎯 Extraction result:`, product ? 'SUCCESS' : 'FAILED');
      
      if (product) {
        console.log(`📊 Product data:`, {
          name: product.name,
          price: product.price,
          source: product.data_source
        });
      }
    }
  });

  await testCrawler.addRequests([url]);
  await testCrawler.run();
}

/**
 * Extract cannabis data from Crop King Seeds ACF fields (Based on actual HTML structure)
 * This function targets the .custom-acf-prod and .itype elements with structured data
 */
function extractFromAttributesTable(product: ScraperProduct, $: CheerioAPI): void {
  console.log('🔧 Checking Crop King Seeds structured fields...');
  
  // 1. Extract strain type from organized selectors
  const strainType = $(PRODUCT_CARD_SELECTORS.strainType).text().trim();
  if (strainType) {
    product.strain_type = normalizeStrainType(strainType);
    console.log(`   ✅ Strain Type: "${strainType}" -> "${product.strain_type}"`);
  }
  
  // 2. Extract THC from organized selectors
  const thcText = $(PRODUCT_CARD_SELECTORS.thcLevel).text().trim();
  if (thcText) {
    product.thc_content = thcText;
    console.log(`   ✅ THC Content: "${thcText}"`);
  }
  
  // 3. Extract cannabis data from .custom-acf-prod using Vancouver proven patterns
  console.log('   📋 Using Vancouver-style selectors for ACF data extraction...');
  
  // Extract THC content using organized selectors
  if (!product.thc_content) {
    const thcElement = $(PRODUCT_CARD_SELECTORS.thcLevel).text().trim();
    if (thcElement) {
      const thcMatch = thcElement.match(/(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?%?/);
      if (thcMatch) {
        product.thc_content = thcMatch[2] ? 
          `${thcMatch[1]}-${thcMatch[2]}%` : 
          `${thcMatch[1]}%`;
        console.log(`   ✅ THC Content (organized selectors): "${product.thc_content}"`);
      }
    }
  }

  // Extract CBD content using organized selectors
  if (!product.cbd_content) {
    const cbdElement = $(PRODUCT_CARD_SELECTORS.cbdLevel).text().trim();
    if (cbdElement) {
      const cbdMatch = cbdElement.match(/(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?%?/);
      if (cbdMatch) {
        product.cbd_content = cbdMatch[2] ? 
          `${cbdMatch[1]}-${cbdMatch[2]}%` : 
          `${cbdMatch[1]}%`;
        console.log(`   ✅ CBD Content (organized selectors): "${product.cbd_content}"`);
      }
    }
  }

  // Extract flowering time using organized selectors
  if (!product.flowering_time) {
    const floweringElement = $(PRODUCT_CARD_SELECTORS.floweringTime).text().trim();
    if (floweringElement) {
      product.flowering_time = floweringElement;
      console.log(`   ✅ Flowering Time (organized selectors): "${product.flowering_time}"`);
    }
  }

  // Extract yield info using organized selectors
  if (!product.yield_info) {
    const yieldIndoor = $(PRODUCT_CARD_SELECTORS.yieldIndoor).text().trim();
    const yieldOutdoor = $(PRODUCT_CARD_SELECTORS.yieldOutdoor).text().trim();
    const yieldInfo = [yieldIndoor, yieldOutdoor].filter(Boolean).join(', ');
    if (yieldInfo) {
      product.yield_info = yieldInfo;
      console.log(`   ✅ Yield Info (organized selectors): "${product.yield_info}"`);
    }
  }

  // Extract genetics using organized selectors
  if (!product.genetics) {
    const geneticsElement = $(PRODUCT_CARD_SELECTORS.genetics).text().trim();
    if (geneticsElement) {
      product.genetics = geneticsElement;
      console.log(`   ✅ Genetics (organized selectors): "${product.genetics}"`);
    }
  }

  // Extract growing difficulty using organized selectors
  const growingLevel = $(PRODUCT_CARD_SELECTORS.difficulty).text().trim();
  if (growingLevel) {
    product.description += `\n\nGrowing Level: ${growingLevel}`;
    console.log(`   ✅ Growing Level (organized selectors): "${growingLevel}"`);
  }

  // Extract effects using organized selectors
  const effectsElement = $(PRODUCT_CARD_SELECTORS.effects).text().trim();
  if (effectsElement) {
    product.description += `\n\nEffects: ${effectsElement}`;
    console.log(`   ✅ Effects (organized selectors): "${effectsElement}"`);
  }
  
  // Extract additional cannabis data
  const medicalUse = $(PRODUCT_CARD_SELECTORS.medicalUse).text().trim();
  if (medicalUse) {
    product.description += `\n\nMedical Use: ${medicalUse}`;
    console.log(`   ✅ Medical Use (organized selectors): "${medicalUse}"`);
  }
  
  const height = $(PRODUCT_CARD_SELECTORS.height).text().trim();
  if (height) {
    product.description += `\n\nHeight: ${height}`;
    console.log(`   ✅ Height (organized selectors): "${height}"`);
  }
  
  // Fallback: Process all ACF items for any missed data
  const acfItems = $('.custom-acf-prod .elementor-icon-list-item');
  
  acfItems.each((_, item) => {
    const $item = $(item);
    const text = $item.find('.elementor-icon-list-text').text().toLowerCase().trim();
    
    if (!text) return;
    
    console.log(`   📋 Found ACF item: "${text}"`);
    
    // Legacy fallback mapping for any fields not caught by Vancouver patterns
    if (text.includes('cbd') && !product.cbd_content) {
      const cbdMatch = text.match(/cbd\s*:\s*(.+)/i);
      if (cbdMatch) {
        product.cbd_content = cbdMatch[1].trim();
        console.log(`   ✅ CBD Content (fallback): "${product.cbd_content}"`);
      }
    }
    else if (text.includes('effects') && !text.includes('Effects:')) {
      const effectsMatch = text.match(/effects?\s*:\s*(.+)/i);
      if (effectsMatch) {
        const effects = effectsMatch[1].trim();
        product.description += `\n\nEffects: ${effects}`;
        console.log(`   ✅ Effects (fallback): "${effects}"`);
      }
    }
  });

  // Extract pack sizes using Vancouver pattern
  const packSizes = $('[data-attribute_pa_pack-size] option, .variation-PackSize select option')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(size => size && size !== 'Choose an option');

  if (packSizes.length > 0) {
    product.description += `\n\nAvailable pack sizes: ${packSizes.join(', ')}`;
    console.log(`   ✅ Pack Sizes (Vancouver pattern): ${packSizes.join(', ')}`);
  }
}

/**
 * Normalize strain type values from attributes table
 */
function normalizeStrainType(value: string): string {
  const normalized = value.toLowerCase().trim();
  
  if (normalized.includes('indica') && normalized.includes('dominant')) {
    return 'indica-dominant';
  } else if (normalized.includes('sativa') && normalized.includes('dominant')) {
    return 'sativa-dominant';
  } else if (normalized.includes('hybrid')) {
    return 'hybrid';
  } else if (normalized.includes('indica')) {
    return 'indica';
  } else if (normalized.includes('sativa')) {
    return 'sativa';
  }
  
  return value; // Return original if no match
}