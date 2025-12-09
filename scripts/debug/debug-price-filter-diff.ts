/**
 * Debug script - Compare API results vs Prisma query
 */

import { prisma } from '@/lib/prisma';

async function debugPriceFilter() {
    console.log('🔍 Debugging Price Filter Discrepancy\n');
    console.log('='.repeat(80));

    const minPrice = 9;
    const maxPrice = 10;

    // 1. Get ALL seeds with pricings
    const allSeeds = await prisma.seedProduct.findMany({
        include: {
            pricings: {
                orderBy: { pricePerSeed: 'asc' }
            }
        }
    });

    console.log(`\n📊 Total seeds in database: ${allSeeds.length}\n`);

    // 2. Categorize seeds by price
    const seedsInRange: typeof allSeeds = [];
    const seedsBelowRange: typeof allSeeds = [];
    const seedsAboveRange: typeof allSeeds = [];
    const seedsNoPricing: typeof allSeeds = [];

    allSeeds.forEach(seed => {
        if (seed.pricings.length === 0) {
            seedsNoPricing.push(seed);
        } else {
            const minPricePerSeed = seed.pricings[0].pricePerSeed;

            if (minPricePerSeed >= minPrice && minPricePerSeed <= maxPrice) {
                seedsInRange.push(seed);
            } else if (minPricePerSeed < minPrice) {
                seedsBelowRange.push(seed);
            } else {
                seedsAboveRange.push(seed);
            }
        }
    });

    // 3. Display results
    console.log(`✅ Seeds IN range ($${minPrice}-$${maxPrice}): ${seedsInRange.length}`);
    console.log(`⬇️  Seeds BELOW range (<$${minPrice}): ${seedsBelowRange.length}`);
    console.log(`⬆️  Seeds ABOVE range (>$${maxPrice}): ${seedsAboveRange.length}`);
    console.log(`❌ Seeds with NO pricing: ${seedsNoPricing.length}`);
    console.log('\n' + '='.repeat(80));

    // 4. Show details of seeds BELOW range (if any)
    if (seedsBelowRange.length > 0) {
        console.log(`\n⬇️  Seeds BELOW $${minPrice}:\n`);
        seedsBelowRange.forEach(seed => {
            const minPricePerSeed = seed.pricings[0]?.pricePerSeed || 0;
            console.log(`  - ${seed.name}`);
            console.log(`    Min Price: $${minPricePerSeed}`);
        });
    }

    // 5. Show details of seeds ABOVE range (if any)
    if (seedsAboveRange.length > 0) {
        console.log(`\n⬆️  Seeds ABOVE $${maxPrice}:\n`);
        seedsAboveRange.forEach(seed => {
            const minPricePerSeed = seed.pricings[0]?.pricePerSeed || 0;
            console.log(`  - ${seed.name}`);
            console.log(`    Min Price: $${minPricePerSeed}`);
        });
    }

    // 6. Show seeds with no pricing (if any)
    if (seedsNoPricing.length > 0) {
        console.log(`\n❌ Seeds with NO pricing:\n`);
        seedsNoPricing.forEach(seed => {
            console.log(`  - ${seed.name}`);
        });
    }

    // 7. Show seeds IN range
    if (seedsInRange.length > 0) {
        console.log(`\n✅ Seeds IN range ($${minPrice}-$${maxPrice}):\n`);
        seedsInRange.slice(0, 5).forEach(seed => {
            const minPricePerSeed = seed.pricings[0]?.pricePerSeed || 0;
            console.log(`  - ${seed.name}: $${minPricePerSeed}`);
        });
        if (seedsInRange.length > 5) {
            console.log(`  ... and ${seedsInRange.length - 5} more`);
        }
    }

    // 8. Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 Summary:');
    console.log(`  Prisma Studio shows: 16 records (?)`)
    console.log(`  API returns: ${seedsInRange.length} seeds`);
    console.log(`  Total in DB: ${allSeeds.length} seeds`);
    console.log(`  Difference (16 - ${seedsInRange.length}): ${16 - seedsInRange.length} seeds\n`);

    if (16 - seedsInRange.length === seedsBelowRange.length + seedsAboveRange.length + seedsNoPricing.length) {
        console.log('✅ The difference matches seeds outside the price range!');
    }

    await prisma.$disconnect();
}

debugPriceFilter().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
