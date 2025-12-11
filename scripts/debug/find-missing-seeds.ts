/**
 * Compare API response vs Database
 * Find the 3 missing seeds
 */

import { prisma } from '@/lib/prisma';

async function findMissingSeeds() {
    console.log('🔍 Finding Missing Seeds\n');
    console.log('='.repeat(80));

    // 1. Get all 16 seeds from database (with pricing)
    const dbSeeds = await prisma.seedProduct.findMany({
        where: {
            pricings: {
                some: {}
            }
        },
        include: {
            pricings: {
                orderBy: { pricePerSeed: 'asc' }
            }
        },
        orderBy: {
            name: 'asc'
        }
    });

    console.log(`\n📊 Database: ${dbSeeds.length} seeds with pricing\n`);

    // 2. Simulate API filter logic
    const apiFilteredSeeds = dbSeeds.filter(seed => {
        const minPricePerSeed = seed.pricings[0]?.pricePerSeed || 0;
        return minPricePerSeed >= 9 && minPricePerSeed <= 10;
    });

    console.log(`💰 After price filter ($9-$10): ${apiFilteredSeeds.length} seeds\n`);

    // 3. Make actual API call
    console.log('🌐 Making API call to localhost:3000...\n');

    try {
        const response = await fetch('http://localhost:3000/api/seed?minPrice=9&maxPrice=10');
        const apiData = await response.json();

        console.log(`📡 API Response: ${apiData.seeds.length} seeds\n`);
        console.log(`Pagination: Page ${apiData.pagination.page}/${apiData.pagination.totalPages}, Total: ${apiData.pagination.total}\n`);

        // 4. Compare
        const apiSeedIds = new Set(apiData.seeds.map((s: any) => s.id));
        const dbSeedIds = new Set(apiFilteredSeeds.map(s => s.id));

        // Find missing seeds
        const missingSeedIds = [...dbSeedIds].filter(id => !apiSeedIds.has(id));

        if (missingSeedIds.length === 0) {
            console.log('✅ No missing seeds! API matches database.\n');
        } else {
            console.log(`❌ Found ${missingSeedIds.length} MISSING seeds:\n`);

            missingSeedIds.forEach(id => {
                const seed = apiFilteredSeeds.find(s => s.id === id);
                if (seed) {
                    const minPrice = seed.pricings[0]?.pricePerSeed;
                    console.log(`  - ${seed.name}`);
                    console.log(`    ID: ${seed.id}`);
                    console.log(`    Min Price: $${minPrice}`);
                    console.log(`    Pricings count: ${seed.pricings.length}`);
                    console.log(`    Created: ${seed.createdAt}`);
                    console.log('');
                }
            });
        }

        // 5. Show all 16 seeds from DB
        console.log('='.repeat(80));
        console.log('\n📋 All 16 seeds in database (ordered by name):\n');

        apiFilteredSeeds.forEach((seed, index) => {
            const inAPI = apiSeedIds.has(seed.id);
            const minPrice = seed.pricings[0]?.pricePerSeed;
            console.log(`${(index + 1).toString().padStart(2)}. ${inAPI ? '✅' : '❌'} ${seed.name} ($${minPrice})`);
        });

    } catch (error) {
        console.error('❌ Error calling API:', error);
        console.log('\nMake sure dev server is running: pnpm dev\n');
    }

    await prisma.$disconnect();
}

findMissingSeeds().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
