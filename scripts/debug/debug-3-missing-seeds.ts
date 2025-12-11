/**
 * Debug the 3 missing seeds
 */

import { prisma } from '@/lib/prisma';

async function debugMissingSeeds() {
    console.log('🔍 Debugging 3 Missing Seeds\n');
    console.log('='.repeat(80));

    const missingIds = [
        'cmiqi5ggj000354sbcgixp7ub', // 2090 Strain
        'cmiqi5gis000r54sbij2d5oy2', // A La Mode
        'cmiqi5gix000t54sbjjc64qlj', // Acai Cookies
    ];

    const seeds = await prisma.seedProduct.findMany({
        where: {
            id: { in: missingIds }
        },
        include: {
            pricings: true,
            category: true
        }
    });

    console.log('\n📋 Missing Seeds Details:\n');

    seeds.forEach(seed => {
        console.log(`\n🌱 ${seed.name}`);
        console.log(`   ID: ${seed.id}`);
        console.log(`   THC: ${seed.thcMin} - ${seed.thcMax}% (${seed.thcText})`);
        console.log(`   CBD: ${seed.cbdMin} - ${seed.cbdMax}% (${seed.cbdText})`);
        console.log(`   SeedType: ${seed.seedType}`);
        console.log(`   CannabisType: ${seed.cannabisType}`);
        console.log(`   Category: ${seed.category.name}`);
        console.log(`   Pricings:`);
        seed.pricings.forEach(p => {
            console.log(`     - Pack ${p.packSize}: $${p.totalPrice} ($${p.pricePerSeed}/seed)`);
        });
    });

    // Test with default filter values
    console.log('\n' + '='.repeat(80));
    console.log('\n🧪 Testing with default API filter values:\n');

    const defaultMinTHC = 0;
    const defaultMaxTHC = 100;
    const defaultMinCBD = 0;
    const defaultMaxCBD = 100;

    seeds.forEach(seed => {
        const passThcFilter =
            (seed.thcMin !== null && seed.thcMin >= defaultMinTHC && seed.thcMin <= defaultMaxTHC) ||
            (seed.thcMax !== null && seed.thcMax >= defaultMinTHC && seed.thcMax <= defaultMaxTHC);

        const passCbdFilter =
            (seed.cbdMin !== null && seed.cbdMin >= defaultMinCBD && seed.cbdMin <= defaultMaxCBD) ||
            (seed.cbdMax !== null && seed.cbdMax >= defaultMinCBD && seed.cbdMax <= defaultMaxCBD);

        console.log(`\n${seed.name}:`);
        console.log(`   THC Filter: ${passThcFilter ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   CBD Filter: ${passCbdFilter ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Overall: ${passThcFilter && passCbdFilter ? '✅ SHOULD BE INCLUDED' : '❌ SHOULD BE EXCLUDED'}`);
    });

    // Check if nulls are causing issues
    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 Checking for NULL values:\n');

    seeds.forEach(seed => {
        console.log(`\n${seed.name}:`);
        console.log(`   thcMin is null: ${seed.thcMin === null}`);
        console.log(`   thcMax is null: ${seed.thcMax === null}`);
        console.log(`   cbdMin is null: ${seed.cbdMin === null}`);
        console.log(`   cbdMax is null: ${seed.cbdMax === null}`);
        console.log(`   seedType is null: ${seed.seedType === null}`);
        console.log(`   cannabisType is null: ${seed.cannabisType === null}`);
    });

    await prisma.$disconnect();
}

debugMissingSeeds().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
