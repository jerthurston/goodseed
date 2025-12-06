/**
 * Seed Supreme CSS Selectors
 * 
 * Verified selectors from HTML inspection
 */

/**
 * Category Page Selectors
 * Used for scraping product lists from category pages
 */
export const CATEGORY_SELECTORS = {
    // Product Cards
    productCard: '.product-item', // 40 products per page
    productLink: 'a.product-item-link',
    productName: '.product-name',
    productImage: 'img.product-image-photo',
    productImageAlt: '.product-image-photo',

    // Pricing
    price: '.price',
    specialPrice: '.special-price .price',
    oldPrice: '.old-price .price',

    // Product Info
    variety: '.variety',
    thcContent: '[class*="thc"]',
    stockStatus: '.stock.available, .stock span, [class*="stock"]',
    badges: '.badge, [class*="promo"]',
    rating: '.rating-summary',
    reviewCount: '.reviews-count',

    // Pagination
    nextPage: '.pages-item-next a',
    pageLinks: '.pages-item a',
    currentPage: '.pages-item.current',
} as const;

/**
 * Helper function to build pagination URL with stock sorting
 */
export function getCategoryUrl(baseUrl: string, categorySlug: string, page: number = 1, sortByStock: boolean = true): string {
    const sortParam = sortByStock ? '#product_list_order=quantity_and_stock_status' : '';

    if (page === 1) {
        return `${baseUrl}/${categorySlug}.html${sortParam}`;
    }
    return `${baseUrl}/${categorySlug}.html?p=${page}${sortParam}`;
}

/**
 * Base URL for Seed Supreme
 */
export const BASE_URL = 'https://seedsupreme.com';

