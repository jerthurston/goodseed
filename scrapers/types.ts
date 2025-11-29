/**
 * Types for MVP GoodSeed Scrapers
 */

import { CannabisType, PhotoperiodType, SeedType, StockStatus } from '@prisma/client';

/**
 * Seed data structure for scrapers
 * Based on MVP requirements
 */
export interface SeedData {
    // Basic Info (required)
    name: string;
    url: string;
    slug: string;

    // Pricing (required)
    totalPrice: number;         // Total price for the pack
    packSize: number;           // Number of seeds in pack
    pricePerSeed?: number;      // Will be calculated if not provided

    // Stock Status
    stockStatus?: StockStatus;

    // Seed Classification (optional but recommended)
    seedType?: SeedType;        // REGULAR, FEMINIZED, AUTOFLOWER
    cannabisType?: CannabisType; // SATIVA, INDICA, HYBRID
    photoperiodType?: PhotoperiodType; // AUTOFLOWER, PHOTOPERIOD

    // Cannabinoids (optional)
    thcMin?: number;
    thcMax?: number;
    cbdMin?: number;
    cbdMax?: number;

    // Image (optional)
    imageUrl?: string;
}

/**
 * Seller data structure
 */
export interface SellerData {
    name: string;
    url: string;
    affiliateTag?: string;
    isActive?: boolean;
}
