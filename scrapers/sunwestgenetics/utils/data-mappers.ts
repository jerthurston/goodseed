/**
 * Helper functions to map scraped data to Prisma enums for SunWest Genetics
 */

import { CannabisType, SeedType } from '@prisma/client';

/**
 * Parse seed type from product name for SunWest Genetics
 * Examples:
 * - "Blue Dream Autoflower Seeds" -> AUTOFLOWER
 * - "OG Kush Feminized Seeds" -> FEMINIZED
 * - "White Widow Regular Seeds" -> REGULAR
 * - "Gorilla Glue Photoperiod Seeds" -> PHOTOPERIOD
 */
export function parseSeedType(productName: string): SeedType | null {
    const nameLower = productName.toLowerCase();

    // Check for autoflowering (highest priority as it's more specific)
    if (nameLower.includes('autoflower') || nameLower.includes('auto flower') || nameLower.includes('auto-flower')) {
        return SeedType.AUTOFLOWER;
    }

    // Check for feminized
    if (nameLower.includes('feminized') || nameLower.includes('fem ')) {
        return SeedType.FEMINIZED;
    }

    // Check for regular
    if (nameLower.includes('regular') || nameLower.includes('reg ')) {
        return SeedType.REGULAR;
    }

    // Check for photoperiod
    if (nameLower.includes('photoperiod') || nameLower.includes('photo period')) {
        return SeedType.PHOTOPERIOD;
    }

    return null;
}

/**
 * Map strain type to CannabisType enum for SunWest Genetics
 * Examples:
 * - "Hybrid" -> HYBRID
 * - "Indica Dominant" -> INDICA
 * - "Sativa Dominant" -> SATIVA
 * - "Balanced Hybrid" -> HYBRID
 * - "Pure Sativa" -> SATIVA
 * - "Pure Indica" -> INDICA
 */
export function parseCannabisType(strainType: string | undefined): CannabisType | null {
    if (!strainType) return null;

    const typeLower = strainType.toLowerCase().trim();

    // Check for Indica patterns
    if (typeLower.includes('indica dominant') || 
        typeLower.includes('indica-dominant') ||
        typeLower === 'indica' ||
        typeLower === 'pure indica') {
        return CannabisType.INDICA;
    }

    // Check for Sativa patterns
    if (typeLower.includes('sativa dominant') || 
        typeLower.includes('sativa-dominant') ||
        typeLower === 'sativa' ||
        typeLower === 'pure sativa') {
        return CannabisType.SATIVA;
    }

    // Check for Hybrid patterns
    if (typeLower.includes('hybrid') ||
        typeLower.includes('balanced') ||
        typeLower.includes('50/50')) {
        return CannabisType.HYBRID;
    }

    return null;
}

/**
 * Parse flowering time from text
 * Examples:
 * - "8-10 weeks" -> "8-10 weeks"
 * - "60-70 days" -> "60-70 days"
 * - "9 weeks" -> "9 weeks"
 */
export function parseFloweringTime(floweringText: string | undefined): string | null {
    if (!floweringText) return null;

    const text = floweringText.trim();
    
    // Common flowering time patterns
    const patterns = [
        /(\d+[-–]\d+)\s*(weeks?|days?)/i,
        /(\d+)\s*(weeks?|days?)/i,
        /(\d+[-–]\d+)\s*(w|d)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[0];
        }
    }

    return text.length > 0 ? text : null;
}

/**
 * Parse growing difficulty level
 * Examples:
 * - "Easy" -> "Easy"
 * - "Beginner" -> "Beginner"
 * - "Intermediate" -> "Intermediate"
 * - "Advanced" -> "Advanced"
 */
export function parseGrowingLevel(levelText: string | undefined): string | null {
    if (!levelText) return null;

    const level = levelText.trim().toLowerCase();

    // Standardize common terms
    if (level.includes('easy') || level.includes('beginner') || level.includes('novice')) {
        return 'Beginner';
    }
    
    if (level.includes('medium') || level.includes('intermediate') || level.includes('moderate')) {
        return 'Intermediate';
    }
    
    if (level.includes('hard') || level.includes('advanced') || level.includes('expert') || level.includes('difficult')) {
        return 'Advanced';
    }

    // Return original if no match
    return levelText.trim();
}

/**
 * Clean and validate price
 */
export function parsePrice(priceText: string): number | null {
    if (!priceText) return null;

    // Remove currency symbols and extra spaces
    const cleanPrice = priceText.replace(/[$£€¥,\s]/g, '');
    const price = parseFloat(cleanPrice);

    return isNaN(price) || price <= 0 ? null : price;
}

/**
 * Parse THC/CBD levels from text
 * Examples:
 * - "THC: 20%" -> { min: 20, max: 20 }
 * - "THC 15-20%" -> { min: 15, max: 20 }
 * - "20-25% THC" -> { min: 20, max: 25 }
 */
export function parsePotencyLevel(levelText: string): { min: number; max: number } | null {
    if (!levelText) return null;

    // Remove THC/CBD labels and % symbols
    const cleanText = levelText.replace(/(?:thc|cbd)[:\s]*/gi, '').replace(/%/g, '');
    
    // Match range pattern (e.g., "15-20", "20-25")
    const rangeMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
        return {
            min: parseFloat(rangeMatch[1]),
            max: parseFloat(rangeMatch[2]),
        };
    }

    // Match single value pattern (e.g., "20")
    const singleMatch = cleanText.match(/(\d+(?:\.\d+)?)/);
    if (singleMatch) {
        const value = parseFloat(singleMatch[1]);
        return { min: value, max: value };
    }

    return null;
}