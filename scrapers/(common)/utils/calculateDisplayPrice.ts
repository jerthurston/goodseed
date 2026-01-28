import { Pricing } from "@prisma/client";

/**
 * Calculate displayPrice from pricings array
 * displayPrice = pricePerSeed of the smallest pack size
 * @example
 * calculateDisplayPrice([
 *   { packSize: 5, totalPrice: 65, pricePerSeed: 13 },
 *   { packSize: 10, totalPrice: 200, pricePerSeed: 20 }
 * ]) // Returns 13
 */

export function calculateDisplayPrice(pricings: Array<Pick<Pricing, 'packSize' | 'pricePerSeed' | 'totalPrice'>>): number | null {
    if (!pricings || pricings.length === 0) {
        return null;
    }

    // Find the pricing with smallest packSize
    const smallestPack = pricings.reduce((smallest, current) => 
        current.packSize < smallest.packSize ? current : smallest
    );

    return smallestPack.pricePerSeed;
}