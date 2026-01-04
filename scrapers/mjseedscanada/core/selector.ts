import { ManualSelectors } from "@/lib/factories/scraper-factory";

/**
 * MJ Seeds Canada CSS Selectors
 * Based on WooCommerce structure from mjseedscanada.ca
 * Updated: 2025-12-31
 */

export const MJSEEDSCANADA_PRODUCT_CARD_SELECTORS: ManualSelectors = {
  // Core product information - Improved priority order based on test results
  productName: 'h1.product_title, h1.entry-title, .woocommerce-Reviews-title span, .prod_titles a, .woocommerce-loop-product__title, h2.woocommerce-loop-product__title, h1, h2:contains("specifications"), h2:contains("strain specifications")',
  priceDisplay: '.product_price_dfn, .price, .woocommerce-Price-amount, .price .woocommerce-Price-amount, .product-price, .elementor-price',

  // Product structure
  productCard: 'li.product.type-product, .product-item, .product',
  productLink: '.prod_titles a, .woocommerce-loop-product__link, .product-title a',
  productImage: 'img.wp-post-image, .woocommerce-product-gallery__image img, .main_img img, .product-image img',  // Prioritize wp-post-image first

  // Cannabis-specific selectors - Improved based on structure analysis
  strainType: '.product-meta .strain-type, .strain-info, .cannabis-type, .product-category, .itype .elementor-icon-list-text, .specifications-table tr:contains("Type") td:last-child',
  badge: '.bogo_wrapper, .product-badge, .sale-badge',

  // Rating & Reviews (based on archive HTML structure)
  rating: '.star-rating strong.rating, .star-rating .rating',
  ratingAriaLabel: '.star-rating',
  reviewCount: '.review-count, .woocommerce-review-link',

  // Cannabis details from specifications section - Table-only extraction
  thcLevel: '.specifications-table tr:contains("THC Level") td:last-child',
  cbdLevel: '.specifications-table tr:contains("CBD Level") td:last-child',

  // Additional cannabis info - Table-only selectors
  floweringTime: '.specifications-table tr:contains("Flowering Period") td:last-child',
  growingLevel: '.specifications-table tr:contains("Growing Difficulty") td:last-child',
  
  // Genetics and other specs
  genetics: 'p:contains("Genetics Parents"), .genetics-info, p:contains("genetics")',
  height: 'p:contains("Height"), .plant-height',
  effects: 'h2:contains("Effects") + p, .effects-info, p:contains("effects")',
  aroma: 'p:contains("Flavours"), .aroma-info, p:contains("aroma")',
  flavor: 'p:contains("Flavours"), .flavor-info, p:contains("flavor")',
  yieldInfo: 'p:contains("Yield"), .yield-info, p:contains("yield")',

  // Price related
  priceAmount: '.woocommerce-Price-amount bdi, .price .amount',
  variationInputs: 'input.product_variation_radio, .variation-selector input',

  // Pagination - WordPress/WooCommerce standard
  nextPage: '.page-numbers.next, .next.page-numbers',
  pageLinks: '.page-numbers:not(.prev):not(.next):not(.current)',
  currentPage: '.page-numbers.current',
  paginationContainer: '.page-numbers, .wp-pagenavi',
  paginationItems: '.page-numbers:not(.prev):not(.next):not(.current)',

  // WooCommerce result count for page calculation
  resultCount: '.woocommerce-result-count, .showing-results',

  // Additional fields
  currency: 'CAD', // Canadian site
  description: '#tab-description p, .product-description, .woocommerce-Tabs-panel--description, .woocommerce-Tabs-panel--description',
  availability: '.stock, .availability',
  seedType: '.seed-type, .product-type',

  // Tags and links - Added missing selector
  tagsLinks: '.product_meta .tagged_as a, .product-tags a, .tags a',

  // Variation/pricing table selectors - Enhanced for better extraction
  versionsRows: '.pvtfw_variant_table_block .variant tbody tr, .vartable tbody tr, .variations tr, .variation-table tr',
  packSizeCell: 'td[data-title="Pack Size"], .variation-pack-size, .pack-size, td:first-child',
  priceCell: 'td[data-title="Price"], .variation-price, .pack-price, td:last-child'
};
