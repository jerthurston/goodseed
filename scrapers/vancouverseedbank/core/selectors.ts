/**
 * Vancouver Seed Bank CSS Selectors
 * 
 * Based on WooCommerce HTML structure
 * Updated: 2025-12-03
 */

export const VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS = {
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

    // Option1: khi scrape đến khi không có trang tiếp theo nữa - Pagination - WooCommerce standard
    nextPage: '.woocommerce-pagination .next',
    pageLinks: '.woocommerce-pagination a.page-numbers',
    currentPage: '.woocommerce-pagination span.current',

    //Option2: Phục vụ tìm maxPage - trang cuối của pagination - dựa vào đó scrape function sẽ biết được tổng số phân trang cần crawl dữ liệu
    paginationContainer: '.jet-filters-pagination',
    paginationItems: '.jet-filters-pagination__item[data-value]',
} as const;

// export const MAXPAGE_PAGINATION = {
//     // Vancouver Seed Bank uses jet-smart-filters-pagination
//     paginationContainer: '.jet-filters-pagination',
//     paginationItems: '.jet-filters-pagination__item[data-value]',
//     // data-value contains page numbers like "1", "2", "154" (ignore "next", "prev")
// } as const;



/**
 * Base URL for Vancouver Seed Bank
 */
