/**
 * Seed Supreme CSS Selectors
 * 
 * Verified selectors from HTML inspection (2025-11-28)
 * Source: scripts/test/inspect-seedsupreme-html.ts
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
 * Product Detail Page Selectors
 * Used for scraping full product details
 */
export const PRODUCT_SELECTORS = {
    // Basic Info
    name: 'h1',
    mainPrice: '.price',

    // Pack Options (Table-based layout, NOT dropdown)
    packOptionsTable: 'table tr:contains("x")', // Rows with pack sizes
    packOptionsRow: 'tr:has(td:contains("x"))', // Alternative selector
    packCell: 'td:contains("Special Price")',

    // Specifications (using sibling selector to get values)
    specs: {
        variety: 'td:contains("Variety") + td',
        varietyLabel: 'td:contains("Variety")',

        thc: 'td:contains("THC") + td',
        thcLabel: 'td:contains("THC")',

        cbd: 'td:contains("CBD") + td',
        cbdLabel: 'td:contains("CBD")',

        flowering: 'td:contains("Flowering") + td',
        floweringLabel: 'td:contains("Flowering")',

        genetic: 'td:contains("Genetic") + td',
        geneticLabel: 'td:contains("Genetic")',
        geneticAlt: 'td:contains("heritage") + td',
    },

    // Images
    mainImage: '.product-image-photo',
    galleryImages: '.gallery-image img',
    thumbnails: '.product-image-thumbs img',

    // Description
    description: '.product-description',
    shortDescription: '.product.attribute.overview',
    additionalInfo: '.additional-attributes',

    // Reviews
    reviewsSection: '#reviews',
    reviewCount: '.reviews-count',
    rating: '.rating-summary',
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
 * Helper function to resolve relative URLs
 */
export function resolveUrl(baseUrl: string, url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${baseUrl}${url}`;
    return `${baseUrl}/${url}`;
}

/**
 * Base URL for Seed Supreme
 */
export const BASE_URL = 'https://seedsupreme.com';

/**
 * Common categories to scrape
 */
export const CATEGORIES = {
    feminized: 'feminized-seeds',
    autoflower: 'autoflowering-seeds',
    bestSellers: 'best-sellers',
    highTHC: 'cannabis-seeds/highest-thc-seeds',
    highYield: 'cannabis-seeds/high-yield-seeds',
    beginner: 'cannabis-seeds/beginner-seeds',
    indoor: 'cannabis-seeds/indoor-seeds',
    outdoor: 'cannabis-seeds/outdoor-marijuana-seeds',
} as const;
