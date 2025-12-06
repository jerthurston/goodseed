/**
 * Seed Supreme Scraper Types
 * 
 * Type definitions for scraped data from seedsupreme.com
 */

/**
 * Product card data from category pages
 * Scraped from product listing cards (not full product pages)
 */
export interface ProductCardData {
    name: string;
    url: string;
    slug: string;
    imageUrl?: string;
    basePrice?: string;
    basePriceNum?: number;
    packSize?: number; // Default: 4 seeds
    pricePerSeed?: number; // Calculated: basePriceNum / packSize
    stockStatus?: string; // "In Stock", "Out of Stock", etc.
    originalPrice?: string;
    variety?: string;
    thcLevel?: string;
    badges?: string[];
    rating?: number;
    reviewCount?: number;
}

/**
 * Category metadata from URL
 */
export interface CategoryMetadata {
    name: string;
    slug: string;
    url: string;
    level: number;
    seedType?: string; // "FEMINIZED", "AUTOFLOWERING", etc.
}

/**
 * Category scrape result
 */
export interface CategoryScrapeResult {
    category: string;
    totalProducts: number;
    totalPages: number;
    products: ProductCardData[];
    timestamp: Date;
    duration: number;
}
