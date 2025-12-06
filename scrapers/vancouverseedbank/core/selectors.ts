/**
 * Vancouver Seed Bank CSS Selectors
 * 
 * Based on WooCommerce HTML structure
 * Updated: 2025-12-03
 */

export const PRODUCT_CARD_SELECTORS = {
    // Product Cards - WooCommerce structure
    productCard: 'li.product.type-product',
    productLink: 'h3.prod_titles a',
    productName: 'h3.prod_titles a',
    productImage: 'figure.main_img img',

    // Cannabis Type / Strain
    strainType: '.itype .elementor-icon-list-text',

    // Badge / Tag
    badge: '.bogo_wrapper li',

    // Rating & Reviews
    rating: '.star-rating strong.rating',
    ratingAriaLabel: '.star-rating',  // aria-label contains full rating info
    reviewCount: '.raiting-and-review-count div:last-child',

    // THC & CBD
    thcLevel: '.thc-lvl',
    cbdLevel: '.custom-acf-prod li:contains("CBD") .elementor-icon-list-text',

    // Additional Info
    floweringTime: '.custom-acf-prod li:contains("Flowering") .elementor-icon-list-text',
    growingLevel: '.custom-acf-prod li:contains("Growing Level") .elementor-icon-list-text',

    // Price
    priceDisplay: '.product_price_dfn',
    priceAmount: '.product_price_dfn .woocommerce-Price-amount',
    variationInputs: 'input.product_variation_radio',

    // Pagination - WooCommerce standard
    nextPage: '.woocommerce-pagination .next',
    pageLinks: '.woocommerce-pagination a.page-numbers',
    currentPage: '.woocommerce-pagination span.current',
} as const;

/**
 * Helper function to build pagination URL
 * 
 * Vancouver Seed Bank uses /pagenum/N/ format for pagination
 */
export function getCategoryUrl(baseUrl: string, page: number = 1): string {
    if (page === 1) {
        return baseUrl;
    }

    // Vancouver Seed Bank pagination format: /pagenum/2/
    // Remove trailing slash if exists
    const cleanUrl = baseUrl.replace(/\/$/, '');

    return `${cleanUrl}/pagenum/${page}/`;
}

/**
 * Base URL for Vancouver Seed Bank
 */
export const BASE_URL = 'https://vancouverseedbank.ca';
