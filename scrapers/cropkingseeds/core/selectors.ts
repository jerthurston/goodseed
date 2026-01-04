import { ManualSelectors } from "@/lib/factories/scraper-factory";

export const CROPKINGSEEDS_PRODUCT_CARD_SELECTORS: ManualSelectors = {
    // Product Cards - Main container structure
    productCard: '.product-item, .product, .woocommerce-product',  // Common WooCommerce product container
    productLink: '.prod_titles a',                                  // Link in product title h3
    productName: '.prod_titles a',                                  // Product name from h3 link text
    productImage: '.main_img img.wp-post-image',                    // Main product image

    // Cannabis Type / Strain - extract from .itype div
    strainType: '.itype .elementor-icon-list-text',                 // Cannabis type from .itype div (Sativa Dominant Hybrid)

    // Badge / Tag - may not be present in current structure
    badge: '.product-tag, .product-badge',                          // Generic product badge selectors

    // Rating & Reviews - may not exist in Crop King structure
    rating: '.star-rating, .rating',
    ratingAriaLabel: '.star-rating',
    reviewCount: '.review-count, .woocommerce-review-link',

    // THC & CBD levels - specific Crop King structure
    thcLevel: '.thc-lvl',                                           // THC level in dedicated div
    cbdLevel: '.custom-acf-prod .elementor-icon-list-text:contains("CBD")', // CBD from custom ACF list

    // Growing information from custom-acf-prod list
    floweringTime: '.custom-acf-prod .elementor-icon-list-text:contains("Flowering")', // Flowering time
    growingLevel: '.custom-acf-prod .elementor-icon-list-text:contains("Growing Level")', // Growing level

    // Price and variations - Crop King specific structure
    priceDisplay: '.pack_listed_prod .product_variation_radio',     // Radio inputs with price data
    priceAmount: '.product_variation_radio[item-price]',           // Specific price attribute
    variationInputs: '.product_variation_radio',                   // All variation radio inputs

    // Pagination - Support both Jet Smart Filters AND WooCommerce standard pagination
    nextPage: '.jet-filters-pagination__item.next .jet-filters-pagination__link, .page-numbers.next', // Both Jet Smart & WooCommerce next
    pageLinks: '.jet-filters-pagination__item:not(.jet-filters-pagination__current) .jet-filters-pagination__link, .page-numbers:not(.current)', // All page links
    currentPage: '.jet-filters-pagination__item.jet-filters-pagination__current .jet-filters-pagination__link, .page-numbers.current', // Current page

    // Pagination container and items for max page detection  
    paginationContainer: '.jet-smart-filters-pagination, .jet-filters-pagination, .woocommerce-pagination', // Support all pagination types
    paginationItems: '.jet-filters-pagination__item, .page-numbers',                                         // All pagination items
} as const;

/**
 * 📋 CROP KING SEEDS SELECTOR NOTES:
 * 
 * ✅ UNIQUE STRUCTURE ELEMENTS:
 * - .main_img: Product image container
 * - .prod_titles: Product name in h3 with link
 * - .thc-lvl: Dedicated THC level display (e.g., "THC 18-25%")
 * - .custom-acf-prod: Custom ACF field container with icon list
 * - .pack_listed_prod: Package selection with radio inputs
 * - .product_variation_radio: Radio inputs with item-price attribute
 * 
 * 🎯 KEY EXTRACTION POINTS:
 * 1. Product Name: .prod_titles a (text content)
 * 2. Product Image: .main_img img.wp-post-image (src attribute)
 * 3. Product URL: .prod_titles a (href attribute)
 * 4. THC Level: .thc-lvl (text content, format: "THC 18-25%")
 * 5. CBD Level: .custom-acf-prod list item containing "CBD" (text parsing)
 * 6. Cannabis Type: .itype .elementor-icon-list-text (format: "Sativa Dominant Hybrid")
 * 7. Flowering Time: .custom-acf-prod list item containing "Flowering" (text parsing)
 * 8. Growing Level: .custom-acf-prod list item containing "Growing Level" (text parsing)
 * 9. Pricing: .product_variation_radio inputs with item-price attribute
 * 10. Pagination: Jet Smart Filters pagination system
 * 
 * 📄 PAGINATION STRUCTURE (Jet Smart Filters):
 * - Container: .jet-smart-filters-pagination, .jet-filters-pagination
 * - Page Items: .jet-filters-pagination__item with data-value attributes
 * - Current Page: .jet-filters-pagination__current class
 * - Page Numbers: .jet-filters-pagination__link (text content)
 * - Next Button: .jet-filters-pagination__item.next data-value="next"
 * - Max Page: Highest numbered .jet-filters-pagination__link before dots/next
 * 
 * 📊 PRICING STRUCTURE:
 * - Radio inputs with data attributes: data-variation-id, item-price, value
 * - Pack sizes in .variation_val_num: 5, 10, 25 seeds
 * - Prices in item-price attribute: 65, 120, 240 (dollars)
 * 
 * 🌿 CANNABIS DATA EXTRACTION:
 * - Seed Type: Extract from product name (Autoflower, Feminized, Regular)
 * - THC: Direct from .thc-lvl (range format: "18-25%")
 * - CBD: Parse from icon list text (format: "0.5-1%")
 * - Cannabis Type: Direct from .itype (format: "Sativa Dominant Hybrid")
 * - Flowering: Parse from icon list text (format: "8-10 weeks")
 * 
 * 🔧 TECHNICAL CONSIDERATIONS:
 * - Uses WooCommerce variation system with radio inputs
 * - Custom ACF fields in icon list format
 * - Image lazy loading with data-src attributes
 * - Jet Smart Filters for AJAX pagination (data-value attributes)
 * - Standard WordPress pagination expected
 * - Price stored as item-price attribute on radio inputs
 */