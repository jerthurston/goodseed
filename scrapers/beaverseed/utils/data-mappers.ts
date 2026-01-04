/**
 * Helper functions to map Beaver Seed scraped data to Prisma enums
 * Based on Vancouver Seed Bank mappers but adapted for Beaver Seed patterns
 */

import { CannabisType, SeedType } from '@prisma/client';

/**
 * Parse seed type from product name
 * Examples for Beaver Seed:
 * - "Auto Solomatic Strain Marijuana Seeds" -> AUTOFLOWER
 * - "Amnesia Haze Strain Feminized Marijuana Seeds" -> FEMINIZED
 * - "White Widow Strain Regular Marijuana Seeds" -> REGULAR
 */
export function parseSeedType(productName: string): SeedType | null {
    const nameLower = productName.toLowerCase();

    // Check for autoflowering (highest priority as it's more specific)
    if (nameLower.includes('auto ') || nameLower.includes('autoflower')) {
        return SeedType.AUTOFLOWER;
    }

    // Check for feminized
    if (nameLower.includes('feminized')) {
        return SeedType.FEMINIZED;
    }

    // Check for regular
    if (nameLower.includes('regular')) {
        return SeedType.REGULAR;
    }

    // Check for photoperiod
    if (nameLower.includes('photoperiod')) {
        return SeedType.PHOTOPERIOD;
    }

    return null;
}

/**
 * Map strain type to CannabisType enum
 * Examples for Beaver Seed:
 * - "Indica Dominant Hybrid" -> INDICA
 * - "Sativa Dominant Hybrid" -> SATIVA
 * - "Balanced Hybrid" -> HYBRID
 * - "Sativa" -> SATIVA
 * - "Indica" -> INDICA
 */
export function parseCannabisType(strainType: string | undefined): CannabisType | null {
    if (!strainType) return null;

    const typeLower = strainType.toLowerCase();

    // Check for Indica dominant
    if (typeLower.includes('indica dominant') || typeLower === 'indica') {
        return CannabisType.INDICA;
    }

    // Check for Sativa dominant
    if (typeLower.includes('sativa dominant') || typeLower === 'sativa') {
        return CannabisType.SATIVA;
    }

    // Check for Hybrid (balanced or just "hybrid")
    if (typeLower.includes('hybrid') || typeLower.includes('balanced')) {
        return CannabisType.HYBRID;
    }

    return null;
}

/**
 * Test the parsing functions
 */
export function testParsers() {
    console.log('Testing Beaver Seed parseSeedType:');
    console.log('  Auto:', parseSeedType('Auto Solomatic Strain Marijuana Seeds'));
    console.log('  Feminized:', parseSeedType('Amnesia Haze Strain Feminized Marijuana Seeds'));
    console.log('  Regular:', parseSeedType('White Widow Strain Regular Marijuana Seeds'));
    console.log('  Unknown:', parseSeedType('Some Unknown Strain'));

    console.log('\nTesting parseCannabisType:');
    console.log('  Indica Dominant Hybrid:', parseCannabisType('Indica Dominant Hybrid'));
    console.log('  Sativa Dominant Hybrid:', parseCannabisType('Sativa Dominant Hybrid'));
    console.log('  Balanced Hybrid:', parseCannabisType('Balanced Hybrid'));
    console.log('  Indica:', parseCannabisType('Indica'));
    console.log('  Sativa:', parseCannabisType('Sativa'));
    console.log('  Unknown:', parseCannabisType('Unknown Type'));
}