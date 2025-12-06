/**
 * Check Royal Queen Seeds data in database
 * 
 * Usage:
 *   pnpm tsx scrapers/royalqueenseeds/scripts/check-db.ts
 */

import { prisma } from '@/lib/prisma';
import 'dotenv/config';

async function main() {
    console.log('🔍 Checking Royal Queen Seeds data in database...\n');

    try {
        // Check for Royal Queen Seeds seller
        const seller = await prisma.seller.findFirst({
            where: {
                OR: [
                    { name: { contains: 'Royal Queen', mode: 'insensitive' } },
                    { name: { contains: 'RoyalQueen', mode: 'insensitive' } },
                    { name: { contains: 'RQS', mode: 'insensitive' } },
                    { url: { contains: 'royalqueenseeds.com', mode: 'insensitive' } },
                ],
            },
        });

        if (!seller) {
            console.log('❌ Royal Queen Seeds seller NOT found in database');
            console.log('\n💡 You need to:');
            console.log('   1. Create seller record in database');
            console.log('   2. Create database service for scraper');
            console.log('   3. Integrate scraper with database service');

            // Show all sellers
            const allSellers = await prisma.seller.findMany();
            console.log(`\n📋 Existing sellers in database: ${allSellers.length}`);
            allSellers.forEach((s, i) => {
                console.log(`   ${i + 1}. ${s.name} (${s.url})`);
            });

            return;
        }

        console.log('✅ Seller found:');
        console.log(`   ID: ${seller.id}`);
        console.log(`   Name: ${seller.name}`);
        console.log(`   URL: ${seller.url}`);
        console.log('');

        // Note: Categories don't have sellerId yet (commented in schema)
        // So we check all categories
        const allCategories = await prisma.seedProductCategory.findMany({
            where: {
                OR: [
                    { url: { contains: 'royalqueenseeds.com', mode: 'insensitive' } },
                    { name: { contains: 'feminized', mode: 'insensitive' } },
                    { name: { contains: 'autoflower', mode: 'insensitive' } },
                ],
            },
            include: {
                seedProducts: {
                    take: 1,
                },
            },
        });

        console.log(`📁 Royal Queen Seeds categories: ${allCategories.length}`);

        if (allCategories.length > 0) {
            console.log('\n📂 Categories found:\n');
            for (const cat of allCategories) {
                const productCount = await prisma.seedProduct.count({
                    where: { categoryId: cat.id },
                });
                console.log(`   ${cat.name}: ${productCount} products`);
            }

            // Show sample products
            const totalProducts = await prisma.seedProduct.count({
                where: {
                    categoryId: { in: allCategories.map(c => c.id) },
                },
            });

            console.log(`\n📦 Total products: ${totalProducts}`);

            if (totalProducts > 0) {
                const sampleProducts = await prisma.seedProduct.findMany({
                    where: {
                        categoryId: { in: allCategories.map(c => c.id) },
                    },
                    include: {
                        productImages: {
                            include: {
                                image: true,
                            },
                        },
                    },
                    take: 3,
                });

                console.log('\n📋 Sample products:\n');
                sampleProducts.forEach((product, i) => {
                    console.log(`[${i + 1}] ${product.name}`);
                    console.log(`    Price: $${product.basePrice}`);
                    console.log(`    THC: ${product.thcText || 'N/A'}`);
                    console.log(`    URL: ${product.url}`);
                    console.log('');
                });
            }
        } else {
            console.log('\n⚠️  No Royal Queen Seeds data found in database');
            console.log('\n💡 Next steps:');
            console.log('   1. Create database service');
            console.log('   2. Run scraper with database integration');
            console.log('   3. pnpm tsx scrapers/royalqueenseeds/scripts/scrape-and-save.ts');
        }

    } catch (error) {
        console.error('❌ Error checking database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
