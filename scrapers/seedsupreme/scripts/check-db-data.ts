/**
 * Check Database Data
 * 
 * Query and display data from SeedCategory and SeedProduct tables
 * 
 * Usage:
 *   pnpm tsx scrapers/seedsupreme/scripts/check-db-data.ts
 */

import { prisma } from '@/lib/prisma';
import 'dotenv/config';

async function main() {
    console.log('='.repeat(70));
    console.log('🔍 Checking Database Data');
    console.log('='.repeat(70));
    console.log('');

    try {
        // Check Seller
        console.log('📊 Seller Information:');
        console.log('-'.repeat(70));
        const seller = await prisma.seller.findFirst({
            where: { name: 'Seed Supreme' },
        });

        if (!seller) {
            console.log('❌ No Seed Supreme seller found in database');
            return;
        }

        console.log(`✅ Seller: ${seller.name}`);
        console.log(`   ID: ${seller.id}`);
        console.log(`   URL: ${seller.url}`);
        console.log(`   Last Scraped: ${seller.lastScraped?.toLocaleString() || 'N/A'}`);
        console.log(`   Status: ${seller.status || 'N/A'}`);
        console.log('');

        // Check SeedProductCategory
        console.log('📂 SeedProductCategory Table:');
        console.log('-'.repeat(70));
        const categories = await prisma.seedProductCategory.findMany({
            include: {
                _count: {
                    select: { seedProducts: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        console.log(`Total Categories: ${categories.length}\n`);

        if (categories.length === 0) {
            console.log('❌ No categories found');
        } else {
            categories.forEach((cat, i: number) => {
                console.log(`${i + 1}. ${cat.name}`);
                console.log(`   Slug: ${cat.slug}`);
                console.log(`   URL: ${cat.url}`);
                console.log(`   Products: ${cat._count.seedProducts}`);
                console.log(`   Created: ${cat.createdAt.toLocaleDateString()}`);
                console.log('');
            });
        }

        // Check SeedProduct
        console.log('📦 SeedProduct Table:');
        console.log('-'.repeat(70));
        const totalProducts = await prisma.seedProduct.count();
        console.log(`Total Products: ${totalProducts}\n`);

        // Sample products from each category
        console.log('Sample Products (first 3 from each category):');
        console.log('-'.repeat(70));

        for (const category of categories.slice(0, 5)) { // First 5 categories
            const products = await prisma.seedProduct.findMany({
                where: { categoryId: category.id },
                take: 3,
                orderBy: { pricePerSeed: 'asc' },
            });

            if (products.length > 0) {
                console.log(`\n📁 ${category.name}:`);
                products.forEach((p, i) => {
                    console.log(`   ${i + 1}. ${p.name}`);
                    console.log(`      Price: $${p.basePrice.toFixed(2)} (${p.packSize} seeds, $${p.pricePerSeed.toFixed(2)}/seed)`);
                    console.log(`      Variety: ${p.variety || 'N/A'}`);
                    console.log(`      Cannabis Type: ${p.cannabisType || 'N/A'}`);
                    console.log(`      THC: ${p.thcText || 'N/A'}`);
                    console.log(`      Stock: ${p.stockStatus}`);
                });
            }
        }

        // Statistics by CannabisType
        console.log('\n📊 Statistics by Cannabis Type:');
        console.log('-'.repeat(70));
        const productsByType = await prisma.seedProduct.groupBy({
            by: ['cannabisType'],
            _count: true,
        });

        productsByType.forEach((stat) => {
            console.log(`${stat.cannabisType || 'N/A'}: ${stat._count} products`);
        });

        // Price statistics
        console.log('\n💰 Price Statistics:');
        console.log('-'.repeat(70));
        const priceStats = await prisma.seedProduct.aggregate({
            _avg: { pricePerSeed: true, basePrice: true },
            _min: { pricePerSeed: true, basePrice: true },
            _max: { pricePerSeed: true, basePrice: true },
        });

        console.log(`Average Price per Seed: $${priceStats._avg.pricePerSeed?.toFixed(2) || 'N/A'}`);
        console.log(`Min Price per Seed: $${priceStats._min.pricePerSeed?.toFixed(2) || 'N/A'}`);
        console.log(`Max Price per Seed: $${priceStats._max.pricePerSeed?.toFixed(2) || 'N/A'}`);
        console.log(`Average Base Price: $${priceStats._avg.basePrice?.toFixed(2) || 'N/A'}`);

        // Check Images
        console.log('\n🖼️  Image Statistics:');
        console.log('-'.repeat(70));
        const imageCount = await prisma.image.count();
        const productImageLinks = await prisma.seedProductImage.count();
        console.log(`Total Unique Images: ${imageCount}`);
        console.log(`Total Product-Image Links: ${productImageLinks}`);

        // Check ScrapeLog
        console.log('\n📝 Recent Scrape Logs:');
        console.log('-'.repeat(70));
        const logs = await prisma.scrapeLog.findMany({
            where: { sellerId: seller.id },
            orderBy: { timestamp: 'desc' },
            take: 5,
        });

        if (logs.length === 0) {
            console.log('No scrape logs found');
        } else {
            logs.forEach((log, i) => {
                console.log(`${i + 1}. ${log.timestamp.toLocaleString()}`);
                console.log(`   Status: ${log.status}`);
                console.log(`   Products Found: ${log.productsFound}`);
                console.log(`   Duration: ${log.duration ? (log.duration / 1000).toFixed(2) + 's' : 'N/A'}`);
            });
        }

        console.log('\n' + '='.repeat(70));
        console.log('✅ Database Check Complete!');
        console.log('='.repeat(70));

        console.log('\n📝 Summary:');
        console.log(`   Seller: ${seller.name}`);
        console.log(`   Categories: ${categories.length}`);
        console.log(`   Products: ${totalProducts}`);
        console.log(`   Images: ${imageCount}`);
        console.log(`   Scrape Logs: ${logs.length}`);

    } catch (error) {
        console.error('\n❌ Error:');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
