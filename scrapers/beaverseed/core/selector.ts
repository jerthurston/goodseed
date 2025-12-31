/**
 * Beaver Seed CSS Selectors
 * 
 * Based on WooCommerce HTML structure - very similar to Vancouver Seed Bank
 * Updated: 2025-12-31
 */

export const BEAVERSEED_PRODUCT_CARD_SELECTORS = {
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

    // Beaver Seed uses jet-smart-filters-pagination (different from Vancouver)
    nextPage: '.jet-filters-pagination__item.prev-next.next', 
    pageLinks: '.jet-filters-pagination__item[data-value]:not(.prev-next)', 
    currentPage: '.jet-filters-pagination__item.jet-filters-pagination__current',

    // Pagination container and items for max page detection
    paginationContainer: '.jet-smart-filters-pagination', 
    paginationItems: '.jet-filters-pagination__item[data-value]:not(.prev-next)', // Page links with data-value
} as const;

export const MAXPAGE_PAGINATION = {
    // Beaver Seed uses jet-smart-filters-pagination
    paginationContainer: '.jet-smart-filters-pagination',
    paginationItems: '.jet-filters-pagination__item[data-value]:not(.prev-next)',
    maxPageFromText: (text: string) => {
        // Extract max page from pagination items
        const matches = text.match(/(\d+)/g);
        if (matches) {
            return Math.max(...matches.map(Number));
        }
        return 1;
    }
} as const;

/**
 * 📋 BEAVER SEED SELECTOR NOTES:
 * 
 * ✅ SIMILARITIES WITH VANCOUVER SEED BANK:
 * - Same WooCommerce product card structure
 * - Identical product data selectors (.prod_titles, .thc-lvl, etc.)
 * - Same custom ACF fields structure (.custom-acf-prod)
 * 
 * ❗ KEY DIFFERENCES:
 * - Uses jet-smart-filters-pagination instead of WooCommerce pagination
 * - Different pagination data attributes (data-value vs href)
 * - Same rating/review structure
 * 
 * 🎯 EXTRACTION STRATEGY:
 * 1. Extract products from product card list
 * 2. Handle jet-smart-filters pagination for page navigation
 * 3. Use WooCommerce structure for product data extraction
 */
