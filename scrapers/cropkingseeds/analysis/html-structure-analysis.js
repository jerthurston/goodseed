/**
 * Manual HTML Analysis for Crop King Seeds
 * 
 * This file documents the HTML structure analysis for manual fallback selectors
 * Based on actual product page inspection
 */

// ==================================================
// GELATO PRODUCT PAGE ANALYSIS
// ==================================================
// URL: https://www.cropkingseeds.ca/feminized-seeds-canada/gelato-marijuana-seeds/
// 
// Key Observations:
// 1. JSON-LD has minimal cannabis data
// 2. Need to extract from product tabs/descriptions
// 3. Look for structured data in hidden sections

/* HTML Structure to analyze:

<div class="woocommerce-tabs">
  <ul class="tabs wc-tabs" role="tablist">
    <li class="description_tab" role="presentation">
      <a href="#tab-description">Description</a>
    </li>
    <li class="additional_information_tab" role="presentation">
      <a href="#tab-additional_information">Additional information</a>  
    </li>
  </ul>
  
  <div class="woocommerce-Tabs-panel" id="tab-description" role="tabpanel">
    <!-- Full product description with cannabis data -->
  </div>
  
  <div class="woocommerce-Tabs-panel" id="tab-additional_information" role="tabpanel">
    <!-- Product attributes table -->
    <table class="woocommerce-product-attributes shop_attributes">
      <tr class="woocommerce-product-attributes-item">
        <th>Strain Type</th>
        <td>Indica Dominant</td>
      </tr>
      <tr>
        <th>THC Level</th>
        <td>25-27%</td>
      </tr>
      <!-- More attributes... -->
    </table>
  </div>
</div>

*/

// ==================================================
// MANUAL SELECTOR STRATEGY
// ==================================================

export const CROP_KING_MANUAL_SELECTORS = {
  // Enhanced selectors based on WooCommerce structure
  tabs: {
    description: '#tab-description',
    additionalInfo: '#tab-additional_information',
    attributes: '.woocommerce-product-attributes'
  },
  
  // Cannabis-specific attribute selectors
  cannabis: {
    strainType: '.woocommerce-product-attributes tr:contains("Strain Type") td, .woocommerce-product-attributes tr:contains("Type") td',
    thcLevel: '.woocommerce-product-attributes tr:contains("THC") td, .woocommerce-product-attributes tr:contains("thc") td',
    cbdLevel: '.woocommerce-product-attributes tr:contains("CBD") td, .woocommerce-product-attributes tr:contains("cbd") td',
    genetics: '.woocommerce-product-attributes tr:contains("Genetics") td, .woocommerce-product-attributes tr:contains("genetics") td',
    floweringTime: '.woocommerce-product-attributes tr:contains("Flowering") td',
    yieldInfo: '.woocommerce-product-attributes tr:contains("Yield") td',
    height: '.woocommerce-product-attributes tr:contains("Height") td'
  },
  
  // Gallery images  
  gallery: {
    mainImage: '.woocommerce-product-gallery__image:first-child img',
    thumbnails: '.woocommerce-product-gallery__image img',
    allImages: '.wp-post-image, .woocommerce-product-gallery img'
  },
  
  // Product variations (pack sizes)
  variations: {
    packSizes: '.variations select[data-attribute_name] option, .variation-PackSize option',
    priceRange: '.woocommerce-variation-price .price'
  }
};

// ==================================================
// FALLBACK EXTRACTION STRATEGY 
// ==================================================

/**
 * Enhanced extraction strategy:
 * 1. Try JSON-LD first (primary)
 * 2. If cannabis data missing, extract from WooCommerce attributes table
 * 3. If still missing, extract from full description with enhanced regex
 * 4. Extract multiple images from gallery
 * 5. Get pack size variations
 */

export const EXTRACTION_PRIORITIES = [
  {
    method: 'json-ld',
    coverage: 'Basic product info (name, price, main description)',
    reliability: 'High (95%+)',
    fields: ['name', 'price', 'description', 'main_image']
  },
  {
    method: 'woocommerce-attributes',
    coverage: 'Cannabis-specific data (THC, CBD, strain type, genetics)',
    reliability: 'Medium (60-80%)',
    fields: ['strain_type', 'thc_content', 'cbd_content', 'genetics', 'flowering_time']
  },
  {
    method: 'enhanced-regex',
    coverage: 'Fallback extraction from description text',
    reliability: 'Medium (40-70%)',
    fields: ['strain_type', 'thc_content', 'cbd_content', 'genetics']
  },
  {
    method: 'gallery-extraction',
    coverage: 'Multiple product images',
    reliability: 'High (90%+)',
    fields: ['images_array', 'gallery_images']
  }
];

// ==================================================
// IMPLEMENTATION PLAN
// ==================================================

/**
 * Next steps:
 * 1. Update CROPKINGSEEDS_SELECTORS with WooCommerce-specific selectors
 * 2. Enhance extractHybridProduct to use attributes table
 * 3. Implement gallery image extraction
 * 4. Test with all product types (feminized, autoflower, CBD)
 * 5. Validate quality metrics reach >85% threshold
 */