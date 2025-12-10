/**
 * Check current scraping progress
 */

import { prisma } from '@/lib/prisma';

async function checkProgress() {
    console.log('📊 Checking Vancouver Seed Bank Scraping Progress\n');
    console.log('='.repeat(70));

    try {
        // Get seller
        const seller = await prisma.seller.findFirst({
            where: {
                name: { contains: 'Vancouver', mode: 'insensitive' }
            }
        });

        if (!seller) {
            console.log('❌ Vancouver Seed Bank seller not found');
            return;
        }

        // Get category
        const category = await prisma.seedProductCategory.findFirst({
            where: { sellerId: seller.id }
        });

        if (!category) {
            console.log('❌ Category not found');
            return;
        }

        // Count products
        const totalProducts = await prisma.seedProduct.count({
            where: { categoryId: category.id }
        });

        // Count products with pricing
        const productsWithPricing = await prisma.seedProduct.count({
            where: {
                categoryId: category.id,
                pricings: { some: {} }
            }
        });

        // Get latest scrape activity
        const latestActivity = await prisma.scrapeLog.findFirst({
            where: { sellerId: seller.id },
            orderBy: { timestamp: 'desc' }
        });

        console.log(`\n📦 Seller: ${seller.name}`);
        console.log(`📁 Category: ${category.name}`);
        console.log(`\n📊 Statistics:`);
        console.log(`   Total Products: ${totalProducts}`);
        console.log(`   With Pricing: ${productsWithPricing}`);
        console.log(`   Without Pricing: ${totalProducts - productsWithPricing}`);

        if (latestActivity) {
            console.log(`\n🕐 Latest Scrape:`);
            console.log(`   Date: ${latestActivity.timestamp.toLocaleString()}`);
            console.log(`   Status: ${latestActivity.status}`);
            console.log(`   Products: ${latestActivity.productsFound}`);
            console.log(`   Duration: ${latestActivity.duration ? Math.round(latestActivity.duration / 1000) : 0}s`);
        }

        // Sample products
        const sampleProducts = await prisma.seedProduct.findMany({
            where: { categoryId: category.id },
            take: 5,
            include: {
                pricings: true
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`\n📝 Recent Products (Latest 5):`);
        sampleProducts.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.name}`);
            console.log(`      Pricings: ${p.pricings.length}`);
        });

        console.log('\n' + '='.repeat(70));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProgress();
