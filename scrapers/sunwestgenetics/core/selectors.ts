/**
 * SunWest Genetics CSS Selectors
 * 
 * Selectors for scraping SunWest Genetics website
 * Updated: 2025-12-19 - Based on actual HTML structure analysis
 */

export const SUNWESTGENETICS_SELECTORS = {
    // Product Cards - Based on actual SunWest Genetics HTML structure
    productCard: 'li.product',
    productLink: 'h3.prod_titles a',
    productName: 'h3.prod_titles a',
    productImage: 'figure.main_img img',

    // Cannabis Type / Strain - in .icatztop .elementor-icon-list-text
    strainType: '.icatztop .elementor-icon-list-text',

    // Rating & Reviews - .star-rating with aria-label, rating value in .rating
    rating: '.star-rating .rating',
    reviewCount: '.star-rating .rating', // Second .rating element contains count

    // THC & CBD - .elementor-icon-list-text containing THC: or CBD:
    thcLevel: '.elementor-icon-list-text:contains("THC:")',
    cbdLevel: '.elementor-icon-list-text:contains("CBD:")',

    // Growing Level - .elementor-icon-list-text containing "Growing Level:" (if exists)
    growingLevel: '.elementor-icon-list-text:contains("Growing Level:")',
    
    // Flowering Time - .elementor-icon-list-text containing "Flowering:"
    floweringTime: '.elementor-icon-list-text:contains("Flowering:")',

    // Badges - from product classes like product_tag-new-strains, product_tag-sale
    // Note: These are CSS classes on the main product li element
    badge: '.product_tag-new-strains, .product_tag-sale, .product_tag-latest',

    // Price variations - input.product_variation_radio with item-price attribute
    variationInputs: 'input.product_variation_radio',
    priceDisplay: '.product_price_dfn',

    // Pagination - Custom Jet Smart Filters pagination (NOT standard WooCommerce)
    paginationContainer: '.jet-smart-filters-pagination',
    paginationItems: '.jet-filters-pagination__item',
    nextPage: '.jet-filters-pagination__item.next',
    currentPage: '.jet-filters-pagination__current',
    
    // Fallback selectors for other pagination patterns
    pageLinks: '.page-numbers, .pagination a',
    
    // WooCommerce Result Count - for calculating total pages
    resultCount: '.woocommerce-result-count',
} as const;

/**
 * Helper function to build pagination URL for SunWest Genetics
 * 
 * SunWest Genetics uses Jet Smart Filters with query parameters
 * Format: 
 * - Page 1: /shop/
 * - Page 2+: /shop/?jsf=epro-archive-products&pagenum=N
 */
export function getCategoryUrl(baseUrl: string, page: number = 1): string {
    if (page === 1) {
        // Remove any existing query params for page 1
        return baseUrl.split('?')[0];
    }

    // For page 2+, use Jet Smart Filters format
    const cleanUrl = baseUrl.split('?')[0]; // Remove existing query params
    return `${cleanUrl}?jsf=epro-archive-products&pagenum=${page}`;
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