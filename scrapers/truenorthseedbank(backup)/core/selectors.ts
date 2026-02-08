import { ManualSelectors } from "@/lib/factories/scraper-factory";

const TRUENORTH_SEEDBANK_PRODUCT_SELECTORS: ManualSelectors = {
    // Core product information (required)
    productName: '.page-title-wrapper.product .page-title .base[itemprop="name"], .page-title h1 .base',
    priceDisplay: '.price-wrapper .price, .price',
    
    // Product structure for category pages
    productCard: 'tbody tr', // Each variant is like a product card
    productLink: '.product-item-name', // Product name acts as link
    productImage: '.fotorama__stage__frame[href], .fotorama__img, .fotorama__stage img, .product-image-main img, .gallery-image img', // Enhanced Fotorama selectors first
    
    // Cannabis-specific selectors
    strainType: '[data-th="Variety"], .col.data[data-th="Variety"]',
    
    // THC & CBD levels  
    thcLevel: '[data-th="THC Content"], .col.data[data-th="THC Content"]',
    cbdLevel: '[data-th="CBD Content"], .col.data[data-th="CBD Content"]',
    
    // Additional Info
    floweringTime: '[data-th="Flowering Time"]',
    growingLevel: '', // Not available in this structure
    
    // Price related
    priceAmount: '[data-price-amount], .price-wrapper[data-price-amount]',
    variationInputs: 'input[name^="super_group"]',
    
    // Product availability
    availability: '.stock span, .stock.available span',
    
    // Cannabis-specific extended info
    seedType: '[data-th="Sex"]',
    yieldInfo: '[data-th="Yield"]',
    genetics: '[data-th="Strain Genetics"]',
    height: '[data-th="Plant Height"]',
    effects: '[data-th="Effect"]',
    aroma: '[data-th="Taste / Flavor"]',
    flavor: '[data-th="Taste / Flavor"]',
    
    // Product versions/variants
    versionsRows: 'tbody tr',
    packSizeCell: '.product-item-name',
    priceCell: '.price',
    
    // Additional selectors for detailed data
    currency: 'span.price', // Contains currency info like "US$"
    description: '[data-th="Flowering Type"]' // Photoperiod, etc.
} as const;

export default TRUENORTH_SEEDBANK_PRODUCT_SELECTORS;