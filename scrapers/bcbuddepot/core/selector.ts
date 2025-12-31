/**
 * 🎯 BC BUD DEPOT PRODUCT DETAIL PAGE SELECTORS
 * 
 * Strategy: Extract from product detail pages for complete data
 * URL Pattern: https://bcbuddepot.com/marijuana-seeds/[breeder]/[product-slug]/
 * 
 * Updated: 2025-12-30
 */

export const BCBUDDEPOT_PRODUCT_DETAIL_SELECTORS = {
    // Basic product info
    productName: 'h1.product_title.entry-title.elementor-heading-title',
    productImage: '.woocommerce-product-gallery__image img.wp-post-image',
    
    // Cannabis details section
    strainType: '.elementor-icon-list-items .elementor-icon-list-item',
    
    // Cannabis tags for seedType and cannabisType  
    tagsLinks: '.elementor-icon-list-item:contains("Tags:") .elementor-icon-list-text a[rel="tag"]',
    
    // Pricing table
    versionsRows: 'table.vartable tbody tr',
    packSizeCell: '.attribute_pa_pack_size',
    priceCell: '.pricecol .woocommerce-Price-amount',
} as const;

// Product listing selectors (for collecting URLs)
export const BCBUDDEPOT_PRODUCT_CARD_SELECTORS = {
    productCards: '.woo-entry-inner',
    productCardLink: '.title h2 a',
    
    // Pagination
    paginationContainer: '.woocommerce-pagination',
    pageLinks: '.page-numbers[href*="/page/"]',
    currentPage: '.page-numbers.current',
    nextPage: '.page-numbers.next',
} as const;

/**
 * Base URL for BC Bud Depot
 */
export const BCBUDDEPOT_BASE_URL = 'https://bcbuddepot.com' as const;

/**
 * 📋 BC BUD DEPOT PRODUCT DETAIL PAGE STRUCTURE ANALYSIS:
 * 
 * PRODUCT DETAIL PAGE STRUCTURE:
 * section.elementor-section
 * ├── .elementor-column (Left: Images)
 * │   └── .woocommerce-product-gallery
 * │       └── img.wp-post-image (main product image)
 * │
 * └── .elementor-column (Right: Product Info)
 *     ├── h1.product_title.entry-title (product name)
 *     ├── .elementor-widget-woocommerce-product-content p (description)
 *     ├── h2 "Details" (section header)
 *     ├── ul.elementor-icon-list-items (cannabis details)
 *     │   ├── li: Type: Indoor/Outdoor
 *     │   ├── li: Flavour: Creamy smooth taste
 *     │   ├── li: Genetics: BC Kush IBL
 *     │   ├── li: Specifics: 75% Indica / 25% Sativa
 *     │   ├── li: Flowering Time: Indoor: 8-9 weeks / Outdoor: Late-September
 *     │   └── li: Tags: Feminized, Indica, Indoor/Outdoor, Kush, Purple
 *     ├── h2 "Versions" (section header)
 *     └── table.vartable (pricing variations)
 *         └── tbody tr (each pack size)
 *             ├── td.attribute_pa_pack_size (5 Seeds, 10 Seeds, 25 Seeds)
 *             └── td.pricecol (.woocommerce-Price-amount: $65.00, $120.00, $240.00)
 * 
 * EXTRACTION STRATEGY:
 * 1. Step 1: Crawl sitemap to collect product URLs
 * 2. Step 2: Crawl each product detail page to extract complete data
 * 3. Benefits: Complete cannabis metadata, accurate pricing, strain information
 * 
 * DIFFERENCES FROM CARD-BASED EXTRACTION:
 * 1. Complete strain information (Indica/Sativa percentages)
 * 2. Accurate pack size variations with real pricing
 * 3. Flowering time and growing details available
 * 4. Cannabis tags for seedType (Feminized, Auto) and strain type (Indica, Sativa)
 * 5. Genetics and breeder information
 */
