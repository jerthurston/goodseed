/**
 * Script để kiểm tra vấn đề price filter
 */

import { prisma } from '@/lib/prisma';

async function checkPriceFilter() {
    console.log('🔍 Checking Price Filter Logic\n');
    console.log('='.repeat(80));

    // Test case: minPrice=10, maxPrice=15
    const minPrice = 10;
    const maxPrice = 15;

    console.log(`\n📊 Filter: minPrice=${minPrice}, maxPrice=${maxPrice}\n`);

    // Query 1: Current API logic (some)
    const currentLogic = await prisma.seedProduct.findMany({
        where: {
            pricings: {
                some: {
                    pricePerSeed: {
                        gte: minPrice,
                        lte: maxPrice
                    }
                }
            }
        },
        include: {
            pricings: {
                orderBy: { pricePerSeed: 'asc' }
            }
        }
    });

    console.log(`Current Logic (some): Found ${currentLogic.length} products`);
    console.log('\nProducts with pricing details:');
    currentLogic.forEach(product => {
        const prices = product.pricings.map(p => `$${p.pricePerSeed}`).join(', ');
        const minPricePerSeed = product.pricings[0]?.pricePerSeed || 0;
        const inRange = minPricePerSeed >= minPrice && minPricePerSeed <= maxPrice;
        console.log(`  ${product.name}`);
        console.log(`    Prices: ${prices}`);
        console.log(`    Min Price: $${minPricePerSeed} - ${inRange ? '✅ IN RANGE' : '❌ OUT OF RANGE'}`);
    });

    // Query 2: Correct logic - filter by minimum price
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Correct Logic: Filter by MINIMUM price per seed\n');

    // Get all products with their minimum price
    const allProducts = await prisma.seedProduct.findMany({
        include: {
            pricings: {
                orderBy: { pricePerSeed: 'asc' },
                take: 1 // Only get the cheapest pack
            }
        }
    });

    // Filter in memory by minimum price
    const correctResults = allProducts.filter(product => {
        const minPricePerSeed = product.pricings[0]?.pricePerSeed || 0;
        return minPricePerSeed >= minPrice && minPricePerSeed <= maxPrice;
    });

    console.log(`Correct Logic: Found ${correctResults.length} products`);
    console.log('\nProducts that SHOULD be returned:');
    correctResults.forEach(product => {
        const minPricePerSeed = product.pricings[0]?.pricePerSeed || 0;
        console.log(`  ${product.name}`);
        console.log(`    Min Price: $${minPricePerSeed} ✅`);
    });

    // Compare results
    console.log('\n' + '='.repeat(80));
    console.log('\n📈 Comparison:');
    console.log(`  Current API returns: ${currentLogic.length} products`);
    console.log(`  Should return: ${correctResults.length} products`);
    console.log(`  Difference: ${currentLogic.length - correctResults.length} extra products\n`);

    if (currentLogic.length !== correctResults.length) {
        console.log('❌ ISSUE CONFIRMED: API is returning incorrect results!');
        console.log('\n💡 Solution: Update API to filter by minimum pricePerSeed only\n');
    } else {
        console.log('✅ Logic is correct!\n');
    }

    await prisma.$disconnect();
}

checkPriceFilter().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
