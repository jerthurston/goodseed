/**
 * Mary Jane's Garden CSS Selectors
 * 
 * Based on real HTML structure from maryjanesgarden.com
 * Uses WordPress standard pagination format (/page/N/)
 * Updated: 2025-12-31
 */

import { ManualSelectors } from "@/lib/factories/scraper-factory";

export const MARYJANESGARDEN_PRODUCT_CARD_SELECTORS: ManualSelectors = {
    // Product Cards - Real structure
    productCard: 'li.product.type-product',
    productLink: '.prod_titles a',
    productName: '.prod_titles a',
    productImage: '.main_img img',

    // Cannabis Type / Strain
    strainType: '.itype .elementor-icon-list-text',

    // Badge / Tag
    badge: '.bogo_wrapper',

    // Rating & Reviews - may not exist
    rating: '.star-rating .rating',
    ratingAriaLabel: '.star-rating',
    reviewCount: '.review-count',

    // THC & CBD - in custom-acf-prod
    thcLevel: '.custom-acf-prod .elementor-icon-list-text',
    cbdLevel: '.custom-acf-prod .elementor-icon-list-text',

    // Additional Info
    floweringTime: '.custom-acf-prod .elementor-icon-list-text',
    growingLevel: '.custom-acf-prod .elementor-icon-list-text',

    // Price
    priceDisplay: '.product_price_dfn',
    priceAmount: '.woocommerce-Price-amount',
    variationInputs: 'input.product_variation_radio',

    // Pagination - WordPress Standard
    nextPage: '.page-numbers.next',
    pageLinks: '.page-numbers:not(.prev):not(.next):not(.current)',
    currentPage: '.page-numbers.current',

    // Pagination container and items for max page detection
    paginationContainer: '.page-numbers',
    paginationItems: '.page-numbers:not(.prev):not(.next):not(.current)',
} as const;

export const MAXPAGE_PAGINATION = {
    // Mary Jane's Garden uses WordPress standard pagination
    paginationContainer: '.page-numbers',
    paginationItems: '.page-numbers:not(.prev):not(.next):not(.current)',
    maxPageFromText: (text: string) => {
        // Extract max page from pagination page numbers
        const matches = text.match(/(\d+)/g);
        if (matches) {
            const pages = matches.map(Number).filter(page => page > 0);
            return Math.max(...pages);
        }
        return 1;
    }
} as const;