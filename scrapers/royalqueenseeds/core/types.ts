/**
 * Royal Queen Seeds Scraper Types
 */

export interface ProductCardData {
    name: string;
    url: string;
    slug: string;
    imageUrl?: string;
    basePrice?: string;
    basePriceNum?: number;
    packSize?: number;          // Default: 5 seeds (RQS standard)
    pricePerSeed?: number;      // Calculated: basePriceNum / packSize
    stockStatus?: string;
    originalPrice?: string;
    thcLevel?: string;          // "25%"
    genetics?: string;          // "OG Kush x Strawberry Diesel"
    effects?: string;           // "Creative, Euphoric, Uplifting"
    badges?: string[];          // Awards, features
    rating?: number;
    reviewCount?: number;
}

export interface CategoryMetadata {
    name: string;
    slug: string;
    url: string;
    seedType?: string;          // FEMINIZED, AUTOFLOWERING, CBD, etc.
}

export interface CategoryScrapeResult {
    category: string;
    totalProducts: number;
    totalPages: number;
    products: ProductCardData[];
    timestamp: Date;
    duration: number;
}
