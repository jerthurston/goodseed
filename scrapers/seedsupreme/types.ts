/**
 * Seed Supreme Scraper Types
 * 
 * Type definitions for scraped data from seedsupreme.com
 */

/**
 * Product card data from category pages
 * Lightweight data for product listings
 */
export interface ProductCardData {
    name: string;
    url: string;
    slug: string;
    imageUrl?: string;
    basePrice?: string;
    basePriceNum?: number;
    originalPrice?: string;
    variety?: string;
    thcLevel?: string;
    badges?: string[];
    rating?: number;
    reviewCount?: number;
}

/**
 * Pack option with pricing details
 * Seed Supreme offers multiple pack sizes per product
 */
export interface PackOption {
    packSize: number; // 6, 12, 24, 36
    totalPrice: number; // Total price for the pack
    originalPrice?: number; // Original price before discount
    pricePerSeed: number; // Calculated: totalPrice / packSize
    discount?: number; // Percentage discount (if originalPrice exists)
    label?: string; // "POPULAR", "BEST VALUE", etc.
}

/**
 * Product specifications
 */
export interface ProductSpecs {
    variety?: string; // "Hybrid", "Indica", "Sativa"
    thcContent?: string; // "Up to 30%", "Very High (over 20%)"
    cbdContent?: string; // "Low (0-1%)", "High (over 4%)"
    floweringType?: string; // "Photoperiod", "Autoflower"
    floweringPeriod?: string; // "8-10 weeks"
    geneticProfile?: string; // "OG Kush x Alpha OG"
    yieldIndoor?: string;
    yieldOutdoor?: string;
    height?: string;
    difficulty?: string; // "Beginner", "Intermediate", "Advanced"
}

/**
 * Full product detail data
 * Includes all information from product page
 */
export interface ProductDetailData extends ProductCardData {
    packOptions: PackOption[];
    specs: ProductSpecs;
    description?: string;
    shortDescription?: string;
    strainNames?: string[]; // For mix packs (e.g., "Blue Dream", "GG4")
    images?: string[];
    scrapedAt?: Date;
}

/**
 * Scraper configuration
 */
export interface ScraperConfig {
    baseUrl?: string;
    maxPages?: number;
    delayMin?: number; // Minimum delay in ms (default: 2000)
    delayMax?: number; // Maximum delay in ms (default: 5000)
    headless?: boolean;
    userAgent?: string;
    timeout?: number; // Page load timeout (default: 30000)
}

/**
 * Scraper result with metadata
 */
export interface ScrapeResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    url: string;
    timestamp: Date;
    duration?: number; // Scrape duration in ms
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

/**
 * Batch scrape progress
 */
export interface ScrapeProgress {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    currentUrl?: string;
    errors: Array<{ url: string; error: string }>;
}
