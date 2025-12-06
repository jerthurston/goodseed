/**
 * Royal Queen Seeds CSS Selectors
 * 
 * Based on actual PrestaShop HTML structure
 * Updated: 2025-11-29
 */

export const CATEGORY_SELECTORS = {
    // Product Cards - PrestaShop structure
    productCard: '.ajax_block_product',
    productLink: 'a.product-link, a.product-image-link',
    productName: '.product-title, h3.product-title',
    productImage: 'img.product-image',

    // Pricing
    price: '.prices-block .price',
    specialPrice: '.prices-block .price',
    oldPrice: '.prices-block .discount',

    // Product Info
    thcLevel: '.atd-filter-feature-prop-val',  // THC is in feature props
    effects: '.atd-filter-feature-prop',      // Effect, Flavor in feature props
    rating: '.gsr-rating .star-rating-control',
    reviewCount: '.ratings-amount',

    // Pack sizes (seed count options)
    packSizes: '.atdevshowattribute-wrapper .dropdown li',
    packSizeDefault: '.atdevshowattribute a strong',

    // Pagination
    nextPage: '.pagination .next a, ul.pagination li.pagination_next a',
    pageLinks: '.pagination a, ul.pagination a',
    currentPage: '.pagination .current, ul.pagination li.current',
} as const;

/**
 * Helper function to build pagination URL
 * 
 * PrestaShop uses ?p=N format for pagination
 */
export function getCategoryUrl(baseUrl: string, page: number = 1): string {
    if (page === 1) {
        return baseUrl;
    }

    // PrestaShop pagination format: ?p=2
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}p=${page}`;
}

/**
 * Base URL for Royal Queen Seeds
 */
export const BASE_URL = 'https://www.royalqueenseeds.com';
