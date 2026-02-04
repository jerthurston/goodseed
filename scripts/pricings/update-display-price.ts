/**
 * Script to update displayPrice for all existing SeedProducts
 * Calculates displayPrice from smallest pack size's pricePerSeed
 * 
 * Usage:
 * pnpm tsx scripts/update-display-price.ts
 */

import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';
import { Pricing } from '@prisma/client';

/**
 * Calculate displayPrice from pricings array
 * displayPrice = pricePerSeed of the smallest pack size
 */
type PricingLite = { packSize: number; pricePerSeed: number };

function calculateDisplayPrice(pricings: Pricing[] | PricingLite[]): number | null {
    if (!pricings || pricings.length === 0) {
        return null;
    }

    // Find the pricing with smallest packSize
    const smallestPack = pricings.reduce((smallest, current) =>
        current.packSize < smallest.packSize ? current : smallest
    );

    return smallestPack.pricePerSeed;
}

async function updateDisplayPrices() {
    console.log('🚀 Starting displayPrice update...\n');

    try {
        // Fetch all seed products with their pricings
        const seedProducts = await prisma.seedProduct.findMany({
            select: {
                id: true,
                name: true,
                displayPrice: true, // Current displayPrice
                pricings: {
                    select: {
                        id:true,
                        seedProductId:true,
                        packSize: true,
                        pricePerSeed: true,
                        totalPrice:true
                    },
                    orderBy: {
                        packSize: 'asc', // Order by smallest first
                    },
                },
            },
        });

        console.log(`📦 Found ${seedProducts.length} seed products to process\n`);

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        for (const product of seedProducts) {
            try {
                // Calculate new displayPrice
                const newDisplayPrice = calculateDisplayPrice(product.pricings  );

                // Skip if no pricings available
                if (newDisplayPrice === null) {
                    console.log(`⏭️  Skipped: ${product.name} (no pricings)`);
                    skipped++;
                    continue;
                }

                // Update if displayPrice changed or was null
                if (product.displayPrice !== newDisplayPrice) {
                    await prisma.seedProduct.update({
                        where: { id: product.id },
                        data: { displayPrice: newDisplayPrice },
                    });

                    console.log(`✅ Updated: ${product.name}`);
                    console.log(`   Old: ${product.displayPrice || 'null'} → New: ${newDisplayPrice}`);
                    console.log(`   Smallest pack: ${product.pricings[0]?.packSize} seeds @ $${newDisplayPrice}/seed\n`);
                    updated++;
                } else {
                    console.log(`✓ Unchanged: ${product.name} (already $${newDisplayPrice})`);
                    skipped++;
                }
            } catch (error) {
                console.error(`❌ Error updating ${product.name}:`, error);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 Summary:');
        console.log(`   Total products: ${seedProducts.length}`);
        console.log(`   ✅ Updated: ${updated}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   ❌ Errors: ${errors}`);
        console.log('='.repeat(50) + '\n');

        if (updated > 0) {
            console.log('✨ DisplayPrice update completed successfully!');
        } else {
            console.log('ℹ️  All products already have correct displayPrice.');
        }

    } catch (error) {
        console.error('❌ Fatal error:', error);
        apiLogger.logError('Script update-display-price failed', error as Error);
        process.exit(1);
    }
}

// Run the script
updateDisplayPrices().catch(console.error);
