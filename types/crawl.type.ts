
/**
 * Pricing data for a single variation (pack size)
 */
export interface PricingData {
    totalPrice: number;     // 65.00
    packSize: number;       // 5, 10, or 25 seeds
    pricePerSeed: number;   // Computed: totalPrice / packSize
}

export interface ProductCardDataFromCrawling {
    name: string;
    url: string;
    slug: string;
    imageUrl?: string;
    // strainType?: string;        // "Balanced Hybrid", "Indica Dominant", etc.
    seedType?: string;          // "FEMINIZED", "AUTOFLOWER", "REGULAR", "PHOTOPERIOD"
    cannabisType?: string;      // "INDICA", "SATIVA", "HYBRID"
    badge?: string;             // "New Strain 2025", "BOGO", etc.
    rating?: number;            // 5.00
    reviewCount?: number;       // 4
    thcLevel?: string;          // "THC 17%"
    thcMin?: number;            // 17
    thcMax?: number;            // 17
    cbdLevel?: string;          // "CBD : 1%"
    cbdMin?: number;            // 1
    cbdMax?: number;            // 1
    floweringTime?: string;     // "Flowering : 8-9 weeks"
    growingLevel?: string;      // "Beginner", "Intermediate", etc.
    pricings: PricingData[];    // Array of pricing variations (5, 10, 25 seeds)
}

export interface CategoryMetadataFromCrawling {
    name: string;
    slug: string;
    seedType?: string;          // FEMINIZED, AUTOFLOWERING, CBD, etc.
}

// export interface CategoryResultFromCrawling {
export interface ProductsDataResultFromCrawling {
    // category: string;
    totalProducts: number;
    totalPages: number;
    products: ProductCardDataFromCrawling[];
    timestamp: Date;
    duration: number;
}
