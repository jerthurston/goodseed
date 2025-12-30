/**
 * Helper functions to map scraped data to Prisma enums for Sonoma Seeds
 */

import { CannabisType, SeedType } from '@prisma/client';

/**
 * Parse seed type from product name
 * Examples:
 * - "3 Kings Strain Autoflowering Feminized Marijuana Seeds" -> AUTOFLOWER
 * - "10th Planet Strain Feminized Marijuana Seeds" -> FEMINIZED
 * - "Regular BCBD Marijuana Seeds" -> REGULAR
 */
export function parseSeedType(productName: string): SeedType | null {
    const nameLower = productName.toLowerCase();

    // Check for autoflowering (highest priority as it's more specific)
    if (nameLower.includes('autoflower') || nameLower.includes('auto')) {
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
 * Map strain type to CannabisType enum for Sonoma Seeds
 * Examples:
 * - "Balanced Hybrid" -> HYBRID
 * - "Indica Dominant Hybrid" -> INDICA
 * - "Sativa Dominant Hybrid" -> SATIVA
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
 * Test the parsing functions for Sonoma Seeds data
 */
export function testParsers() {
    console.log('Testing Sonoma Seeds parseSeedType:');
    console.log('  Autoflowering Feminized:', parseSeedType('3 Kings Strain Autoflowering Feminized Marijuana Seeds'));
    console.log('  Feminized:', parseSeedType('10th Planet Strain Feminized Marijuana Seeds'));
    console.log('  Regular:', parseSeedType('Some Regular BCBD Marijuana Seeds'));
    console.log('  Unknown:', parseSeedType('Some Unknown Strain'));

    console.log('\nTesting Sonoma Seeds parseCannabisType:');
    console.log('  Indica Dominant Hybrid:', parseCannabisType('Indica Dominant Hybrid'));
    console.log('  Sativa Dominant Hybrid:', parseCannabisType('Sativa Dominant Hybrid'));
    console.log('  Balanced Hybrid:', parseCannabisType('Balanced Hybrid'));
    console.log('  Sativa:', parseCannabisType('Sativa'));
    console.log('  Indica:', parseCannabisType('Indica'));
    console.log('  Unknown:', parseCannabisType('Unknown Type'));
}