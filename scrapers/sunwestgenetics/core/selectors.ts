/**
 * SunWest Genetics CSS Selectors
 * 
 * Selectors for scraping SunWest Genetics website
 * Updated: 2025-12-12
 */

export const PRODUCT_CARD_SELECTORS = {
    // Product Cards - Based on actual SunWest Genetics HTML structure
    productCard: 'li.product',
    productLink: 'h3.prod_titles a',
    productName: 'h3.prod_titles a',
    productImage: 'figure.main_img img',

    // Cannabis Type / Strain - in .icatztop .elementor-icon-list-text
    strainType: '.icatztop .elementor-icon-list-text',

    // Rating & Reviews - .star-rating with aria-label
    rating: '.star-rating',
    reviewCount: '.star-rating .rating',

    // THC & CBD - .elementor-icon-list-text containing THC: or CBD:
    thcLevel: '.elementor-icon-list-text:contains("THC:")',
    cbdLevel: '.elementor-icon-list-text:contains("CBD:")',

    // Price variations - input.product_variation_radio with item-price attribute
    variationInputs: 'input.product_variation_radio',
    priceDisplay: '.product_price_dfn',

    // Pagination - Standard WooCommerce pagination
    nextPage: '.next, .page-numbers.next',
    pageLinks: '.page-numbers, .pagination a',
    currentPage: '.current, .page-numbers.current',
} as const;

/**
 * Helper function to build pagination URL for SunWest Genetics
 * 
 * Based on analysis, SunWest Genetics uses standard WooCommerce pagination
 * Format: /shop/page/2/, /shop/page/3/, etc.
 */
export function getCategoryUrl(baseUrl: string, page: number = 1): string {
    if (page === 1) {
        return baseUrl;
    }

    // SunWest Genetics pagination format: /shop/page/N/
    const cleanUrl = baseUrl.replace(/\/$/, '');
    
    // If baseUrl already contains /page/, replace it
    if (cleanUrl.includes('/page/')) {
        return cleanUrl.replace(/\/page\/\d+/, `/page/${page}`);
    }
    
    // Otherwise, append /page/N/
    return `${cleanUrl}/page/${page}/`;
}

/**
 * Base URL for SunWest Genetics
 */
export const BASE_URL = 'https://sunwestgenetics.com';

/**
 * Common category URLs for SunWest Genetics
 * Based on website analysis and footer links
 */
export const CATEGORY_URLS = {
    allProducts: `${BASE_URL}/shop/`,
    marijuanaSeeds: `${BASE_URL}/marijuana-seeds/`,
    feminized: `${BASE_URL}/feminized/`,
    autoflower: `${BASE_URL}/autoflower/`,
    bestSelling: `${BASE_URL}/best-selling-seeds/`,
} as const;