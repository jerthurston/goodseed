/**
 * Check database data quality
 * Run: npx tsx scripts/test/check-seed-data.ts
 */

import { prisma } from '@/lib/prisma';

async function checkDatabaseData() {
    console.log('🔍 Checking Seed Product Data Quality\n');
    console.log('='.repeat(60));

    try {
        // 1. Total count
        const totalSeeds = await prisma.seedProduct.count();
        console.log(`\n📊 Total Seeds: ${totalSeeds}`);

        // 2. Check seedType distribution
        const seedTypeGroups = await prisma.seedProduct.groupBy({
            by: ['seedType'],
            _count: true,
        });
        console.log('\n🌱 Seed Type Distribution:');
        seedTypeGroups.forEach(group => {
            console.log(`   - ${group.seedType || 'NULL'}: ${group._count}`);
        });

        // 3. Check category distribution
        const categories = await prisma.seedProductCategory.findMany({
            select: {
                id: true,
                name: true,
                _count: {
                    select: {
                        seedProducts: true,
                    }
                }
            }
        });
        console.log('\n📁 Category Distribution:');
        categories.forEach(cat => {
            console.log(`   - ${cat.name}: ${cat._count.seedProducts} products`);
        });

        // Check cannabis type on products
        const cannabisTypeGroups = await prisma.seedProduct.groupBy({
            by: ['cannabisType'],
            _count: true,
        });
        console.log('\n🍃 Cannabis Type Distribution:');
        cannabisTypeGroups.forEach(group => {
            console.log(`   - ${group.cannabisType || 'NULL'}: ${group._count}`);
        });

        // 4. Check pricing data
        const seedsWithPricing = await prisma.seedProduct.count({
            where: {
                pricings: {
                    some: {}
                }
            }
        });
        console.log(`\n💰 Seeds with Pricing: ${seedsWithPricing}/${totalSeeds}`);

        // 5. Check THC/CBD data
        const seedsWithTHC = await prisma.seedProduct.count({
            where: {
                OR: [
                    { thcMin: { not: null } },
                    { thcMax: { not: null } },
                ]
            }
        });
        const seedsWithCBD = await prisma.seedProduct.count({
            where: {
                OR: [
                    { cbdMin: { not: null } },
                    { cbdMax: { not: null } },
                ]
            }
        });
        console.log(`\n🧪 Seeds with THC data: ${seedsWithTHC}/${totalSeeds}`);
        console.log(`🧪 Seeds with CBD data: ${seedsWithCBD}/${totalSeeds}`);

        // 6. Check images
        const seedsWithImages = await prisma.seedProduct.count({
            where: {
                productImages: {
                    some: {}
                }
            }
        });
        console.log(`\n🖼️  Seeds with Images: ${seedsWithImages}/${totalSeeds}`);

        // 7. Sample first seed with all relations
        const sampleSeed = await prisma.seedProduct.findFirst({
            include: {
                category: {
                    include: {
                        seller: true,
                    }
                },
                pricings: true,
                productImages: {
                    include: {
                        image: true,
                    }
                }
            }
        });

        console.log('\n📋 Sample Seed Data:');
        if (sampleSeed) {
            console.log(`   Name: ${sampleSeed.name}`);
            console.log(`   Seed Type: ${sampleSeed.seedType || 'NULL'}`);
            console.log(`   Cannabis Type: ${sampleSeed.cannabisType || 'NULL'}`);
            console.log(`   Category: ${sampleSeed.category.name}`);
            console.log(`   Vendor: ${sampleSeed.category.seller.name}`);
            console.log(`   THC: ${sampleSeed.thcMin}-${sampleSeed.thcMax}% (text: ${sampleSeed.thcText})`);
            console.log(`   CBD: ${sampleSeed.cbdMin}-${sampleSeed.cbdMax}% (text: ${sampleSeed.cbdText})`);
            console.log(`   Pricings: ${sampleSeed.pricings.length} packs`);
            console.log(`   Images: ${sampleSeed.productImages.length} images`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Data check completed');

    } catch (error) {
        console.error('❌ Error checking data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabaseData();
