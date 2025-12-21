/**
 * Selectors for Crop King Seeds scraper
 * Following Vancouver Seed Bank organizational pattern
 * 
 * Crop King Seeds uses WooCommerce + ACF (Advanced Custom Fields)
 * Structure: .custom-acf-prod containing various cannabis data fields
 */

export const PRODUCT_CARD_SELECTORS = {
    // Basic product info (from JSON-LD)
    name: 'h1.product_title, .product-title h1',
    price: '.woocommerce-Price-amount',
    image: '.woocommerce-product-gallery__image img',
    description: '.woocommerce-product-details__short-description, .product-summary',
    
    // Cannabis-specific fields from ACF structure (targeting main product area)
    strainType: '.single-product .itype .elementor-icon-list-text:first, .product-summary .itype .elementor-icon-list-text:first, article.product .itype .elementor-icon-list-text:first',
    thcLevel: '.single-product .thc-lvl:first, .product-summary .thc-lvl:first, article.product .thc-lvl:first',
    cbdLevel: '.single-product .custom-acf-prod li:contains("CBD") .elementor-icon-list-text:first, .product-summary .custom-acf-prod li:contains("CBD") .elementor-icon-list-text:first',
    
    // Additional ACF cannabis fields (targeting main product area)
    genetics: '.single-product .custom-acf-prod li:contains("Genetics") .elementor-icon-list-text:first, .product-summary .custom-acf-prod li:contains("Genetics") .elementor-icon-list-text:first',
    floweringTime: '.single-product .custom-acf-prod li:contains("Flowering") .elementor-icon-list-text:first, .product-summary .custom-acf-prod li:contains("Flowering") .elementor-icon-list-text:first',
    yieldIndoor: '.single-product .custom-acf-prod li:contains("Indoor") .elementor-icon-list-text:first, .product-summary .custom-acf-prod li:contains("Indoor") .elementor-icon-list-text:first',
    yieldOutdoor: '.single-product .custom-acf-prod li:contains("Outdoor") .elementor-icon-list-text:first, .product-summary .custom-acf-prod li:contains("Outdoor") .elementor-icon-list-text:first',
    height: '.single-product .custom-acf-prod li:contains("Height") .elementor-icon-list-text:first, .product-summary .custom-acf-prod li:contains("Height") .elementor-icon-list-text:first',
    
    // Effects and characteristics (targeting main product area)
    effects: '.single-product .custom-acf-prod li:contains("Effects") .elementor-icon-list-text:first, .product-summary .custom-acf-prod li:contains("Effects") .elementor-icon-list-text:first',
    medicalUse: '.single-product .custom-acf-prod li:contains("Medical") .elementor-icon-list-text:first, .product-summary .custom-acf-prod li:contains("Medical") .elementor-icon-list-text:first',
    difficulty: '.single-product .custom-acf-prod li:contains("Difficulty") .elementor-icon-list-text:first, .single-product .custom-acf-prod li:contains("Growing Level") .elementor-icon-list-text:first',
    
    // Product variants and stock
    variants: '.woocommerce-product-attributes tr',
    stockStatus: '.stock, .in-stock, .out-of-stock',
    
    // Category and tags
    categories: '.product_meta .posted_in a',
    tags: '.product_meta .tagged_as a',
    
    // Reviews and ratings
    rating: '.woocommerce-product-rating .star-rating',
    reviewCount: '.woocommerce-review-link',
    
    // Additional product details
    sku: '.product_meta .sku_wrapper .sku',
    availability: '.product_meta .availability',
    
    // Fallback selectors for manual extraction
    fallbackSelectors: {
        cannabisData: '.custom-acf-prod, .woocommerce-product-attributes, .product-details',
        allText: '.product-summary, .product-description, .woocommerce-tabs',
        attributesTable: '.woocommerce-product-attributes tr'
    }
};

/**
 * Navigation selectors for category and pagination
 */
export const NAVIGATION_SELECTORS = {
    productLinks: 'a[href*="/product/"]',
    nextPage: '.next.page-numbers',
    pagination: '.page-numbers',
    categoryLinks: '.product-category a'
};

/**
 * Category URL patterns for Crop King Seeds
 */
export const CATEGORY_PATTERNS = {
    feminizedSeeds: '/product-category/feminized-seeds/',
    autoflowerSeeds: '/product-category/autoflower-seeds/',
    regularSeeds: '/product-category/regular-seeds/',
    cbdSeeds: '/product-category/cbd-seeds/',
    fastSeeds: '/product-category/fast-seeds/'
};

/**
 * Generate category URL with pagination for Crop King Seeds
 */
export function getCategoryUrl(baseUrl: string, page: number = 1): string {
    if (page === 1) {
        return baseUrl;
    }

    // Crop King Seeds pagination format: /page/2/
    // Remove trailing slash if exists
    const cleanUrl = baseUrl.replace(/\/$/, '');

    return `${cleanUrl}/page/${page}/`;
}

/**
 * Base URL for Crop King Seeds
 */
export const BASE_URL = 'https://www.cropkingseeds.com';

/**
 * Test URLs for development and validation
 */
export const TEST_URLS = {
    autoflower: 'https://www.cropkingseeds.com/autoflowering-seeds/',
    feminized: 'https://www.cropkingseeds.com/feminized-seeds/',
    regular: 'https://www.cropkingseeds.com/regular-marijuana-seeds/',
};

/**
 * Cannabis data field mappings for transformation
 */
export const CANNABIS_FIELD_MAPPINGS = {
    thc: ['thc', 'thc level', 'thc content', 'thc %'],
    cbd: ['cbd', 'cbd level', 'cbd content', 'cbd %'],
    strainType: ['strain type', 'type', 'indica/sativa', 'strain'],
    genetics: ['genetics', 'lineage', 'parent strains'],
    floweringTime: ['flowering time', 'flowering period', 'flower time'],
    effects: ['effects', 'high', 'feeling'],
    medicalUse: ['medical use', 'medical benefits', 'therapeutic']
};