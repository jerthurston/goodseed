/**
 * Debug script - Check exactly which 16 seeds Prisma Studio is showing
 */

import { prisma } from '@/lib/prisma';

async function checkPrismaStudioData() {
    console.log('🔍 Checking Prisma Studio Data\n');
    console.log('='.repeat(80));

    // Query exactly as Prisma Studio might show it
    const allSeeds = await prisma.seedProduct.findMany({
        include: {
            pricings: {
                orderBy: { pricePerSeed: 'asc' }
            }
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    console.log(`\n📊 Total seeds in database: ${allSeeds.length}\n`);

    // Categorize by pricing
    let seedsWithPricing = 0;
    let seedsWithoutPricing = 0;
    const priceDistribution: { [key: string]: number } = {};

    allSeeds.forEach(seed => {
        if (seed.pricings.length > 0) {
            seedsWithPricing++;
            const minPrice = seed.pricings[0].pricePerSeed;
            const priceKey = `$${minPrice}`;
            priceDistribution[priceKey] = (priceDistribution[priceKey] || 0) + 1;
        } else {
            seedsWithoutPricing++;
        }
    });

    console.log(`✅ Seeds WITH pricing: ${seedsWithPricing}`);
    console.log(`❌ Seeds WITHOUT pricing: ${seedsWithoutPricing}`);
    console.log('\n📈 Price Distribution (by minimum price per seed):\n');

    Object.entries(priceDistribution)
        .sort(([a], [b]) => parseFloat(a.slice(1)) - parseFloat(b.slice(1)))
        .forEach(([price, count]) => {
            console.log(`  ${price}: ${count} seeds`);
        });

    // Show first 20 seeds with their prices
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 First 20 Seeds (as Prisma Studio might show):\n');

    allSeeds.slice(0, 20).forEach((seed, index) => {
        const minPrice = seed.pricings[0]?.pricePerSeed || 'NO PRICING';
        console.log(`${(index + 1).toString().padStart(2)}. ${seed.name}`);
        console.log(`    Min Price: ${minPrice === 'NO PRICING' ? minPrice : `$${minPrice}`}`);
        console.log(`    Pricings count: ${seed.pricings.length}`);
    });

    // Count seeds in range $9-$10
    console.log('\n' + '='.repeat(80));
    console.log('\n💰 Seeds with minPrice between $9-$10:\n');

    const seedsInRange = allSeeds.filter(seed => {
        const minPrice = seed.pricings[0]?.pricePerSeed || 0;
        return minPrice >= 9 && minPrice <= 10;
    });

    console.log(`Found: ${seedsInRange.length} seeds\n`);
    seedsInRange.slice(0, 5).forEach(seed => {
        const minPrice = seed.pricings[0]?.pricePerSeed;
        console.log(`  - ${seed.name}: $${minPrice}`);
    });
    if (seedsInRange.length > 5) {
        console.log(`  ... and ${seedsInRange.length - 5} more`);
    }

    // Check if there are exactly 16 seeds with any specific filter
    console.log('\n' + '='.repeat(80));
    console.log('\n🔎 Looking for combinations that give 16 results:\n');

    // Try to find what gives 16
    const pricesArray = allSeeds
        .filter(s => s.pricings.length > 0)
        .map(s => s.pricings[0].pricePerSeed);

    const uniquePrices = [...new Set(pricesArray)].sort((a, b) => a - b);

    console.log(`Unique prices found: ${uniquePrices.map(p => `$${p}`).join(', ')}`);

    await prisma.$disconnect();
}

checkPrismaStudioData().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
