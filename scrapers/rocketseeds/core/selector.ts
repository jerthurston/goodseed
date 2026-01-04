import { ManualSelectors } from "@/lib/factories/scraper-factory";

/**
 * Rocket Seeds CSS Selectors
 * Based on HTML structure analysis from rocketseeds.com
 * Updated: 2025-12-31
 */

export const ROCKETSEEDS_PRODUCT_CARD_SELECTORS: ManualSelectors = {
    // Product Cards - Real structure (placeholder - cần HTML từ listing page)
    productCard: '.product-item, .product',
    productLink: '.product-title a, .product-link',
    productName: 'h1.product_title.entry-title',
    productImage: '.wp-post-image',

    // Cannabis Type / Strain - From specifications
    strainType: '.specification_individual:has(img[src*="strain-types-1.jpg"]) .specification_individual_text span',

    // Badge / Tag
    badge: '.product-badge, .sale-badge',

    // Rating & Reviews - may not exist
    rating: '.star-rating .rating',
    ratingAriaLabel: '.star-rating',
    reviewCount: '.review-count',

    // THC & CBD - From specification_individual sections
    thcLevel: '.specification_individual:has(img[src*="fm_img3.svg"]) .specification_individual_text span',
    cbdLevel: '.specification_individual:has(img[src*="cbd.png"]) .specification_individual_text span',

    // Additional Info - From specifications
    floweringTime: '.specification_individual:has(img[src*="marijuana.png"]) .specification_individual_text span',
    growingLevel: '.specifications-table tr:contains("Growing Difficulty") td:last-child', // placeholder

    // Genetics and other specifications
    genetics: '.specification_individual:has(img[src*="igenetics_img.png"]) .specification_individual_text span',
    height: '.plant-height', // placeholder
    effects: '.effects-info', // placeholder
    aroma: '.aroma-info', // placeholder 
    flavor: '.flavor-info', // placeholder
    
    // Yield Info - Combined indoor/outdoor yields
    yieldInfo: '.specification_individual:has(img[src*="indoor-yield.jpg"], img[src*="Outdoor-Yield-1.jpg"]) .specification_individual_text span',

    // Price - From variant table with correct selectors
    priceDisplay: '.pvt-tr',
    priceAmount: '.woocommerce-Price-amount',
    variationInputs: '.pvtfw_variant_table_block input, .variation-selector input',

    // Pagination - WordPress Standard
    nextPage: '.page-numbers.next',
    pageLinks: '.page-numbers:not(.prev):not(.next):not(.current)',
    currentPage: '.page-numbers.current',

    // Pagination container and items for max page detection
    paginationContainer: '.pagination',
    paginationItems: '.page-numbers',
} as const;