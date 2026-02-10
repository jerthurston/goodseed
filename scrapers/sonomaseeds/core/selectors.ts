/**
 * Sonoma Seeds CSS Selectors
 * 
 * Based on WooCommerce HTML structure with custom styling
 * Updated: February 9, 2026
 */

import { ManualSelectors } from "@/lib/factories/scraper-factory";

export const SONOMASEEDS_PRODUCT_CARD_SELECTORS: ManualSelectors = {
    // Core product information (required)
    productName: 'h3.prod_titles a',
    priceDisplay: '.product_price_dfn',

    // Product structure
    productCard: 'li.product.type-product',
    productLink: 'h3.prod_titles a',
    productImage: 'figure.main_img img',

    // Cannabis Type / Strain - located in .itype section
    strainType: '.itype .elementor-icon-list-text',

    // Badge / Tag (if available)
    badge: '.bogo_wrapper li, .seller_all_tags',

    // Rating & Reviews - star rating system
    rating: '.star-rating strong.rating',
    ratingAriaLabel: '.star-rating',  // aria-label contains full rating info
    reviewCount: '.prod-reviews',  // Review container

    // THC & CBD levels - in custom-acf-prod section
    thcLevel: '.custom-acf-prod li:contains("THC") .elementor-icon-list-text',
    cbdLevel: '.custom-acf-prod li:contains("CBD") .elementor-icon-list-text',

    // Additional Cannabis Info
    floweringTime: '.custom-acf-prod li:contains("Flowering") .elementor-icon-list-text',
    growingLevel: '.custom-acf-prod li:contains("Growing Level") .elementor-icon-list-text',

    // Price information
    priceAmount: '.product_price_dfn .woocommerce-Price-amount',
    variationInputs: 'input.product_variation_radio',

    // Pack sizes/variations
    packSizeCell: '.pack_listed_prod .variation_val',

    // Pagination - WooCommerce standard
    nextPage: '.page-numbers[href*="/page/"]', // Links to next pages
    pageLinks: '.page-numbers[href]', // All page links
    currentPage: '.page-numbers.current', // Current page

    // Pagination container and items for max page detection
    paginationContainer: '.wp-pagenavi, .page-numbers', // WooCommerce pagination
    paginationItems: '.page-numbers[href*="/page/"]', // Page links with /page/ in href
};