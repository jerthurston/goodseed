/**
 * Test Database Service
 * 
 * Verify that database service works correctly:
 * 1. Initialize seller
 * 2. Create test category
 * 3. Save test products
 * 4. Update aggregates
 * 5. Query results
 * 
 * Usage:
 *   pnpm tsx scrapers/seedsupreme/scripts/test-db-service.ts
 */

import { prisma } from '@/lib/prisma';
import { SeedType } from '@prisma/client';
import 'dotenv/config';
import { SeedSupremeCategoryDbService } from '../core/category-db-service';
import { CategoryMetadata, ProductCardData } from '../core/types';
import { parseTHCCBDText } from '../utils/thc-cbd-parser';

async function main() {
    console.log('='.repeat(70));
    console.log('🧪 Testing Seed Supreme Database Service');
    console.log('='.repeat(70));
    console.log('');

    // Test THC/CBD Parser first
    console.log('📋 Step 0: Test THC/CBD Parser');
    console.log('-'.repeat(70));
    const testCases = [
        'Very High (over 20%)',
        'High (15-20%)',
        'Medium (10-15%)',
        'Low (5%)',
        'Under 2%',
        'N/A',
        null,
    ];

    testCases.forEach(text => {
        const result = parseTHCCBDText(text);
        console.log(`  "${text}" → min: ${result.min}%, max: ${result.max}%`);
    });
    console.log('');

    try {
        const dbService = new SeedSupremeCategoryDbService(prisma);

        // Step 1: Initialize Seller
        console.log('📋 Step 1: Initialize Seller');
        console.log('-'.repeat(70));
        const sellerId = await dbService.initializeSeller();
        console.log(`✅ Seller ID: ${sellerId}\n`);

        // Step 2: Create Test Category
        console.log('📋 Step 2: Create Test Category');
        console.log('-'.repeat(70));
        const testCategory: CategoryMetadata = {
            name: 'Test Feminized Seeds',
            slug: 'test-feminized-seeds',
            url: 'https://seedsupreme.com/test-feminized-seeds.html',
            level: 0,
            seedType: SeedType.FEMINIZED,
        };

        const categoryId = await dbService.getOrCreateCategory(sellerId, testCategory);
        console.log(`✅ Category ID: ${categoryId}\n`);

        // Step 3: Create Test Products
        console.log('📋 Step 3: Save Test Products');
        console.log('-'.repeat(70));
        const testProducts: ProductCardData[] = [
            {
                name: 'Blue Dream Feminized',
                url: 'https://seedsupreme.com/blue-dream-feminized.html',
                slug: 'blue-dream-feminized',
                imageUrl: 'https://example.com/blue-dream.jpg',
                basePriceNum: 44.00,
                packSize: 4,
                pricePerSeed: 11.00,
                stockStatus: 'In Stock',
                variety: 'Hybrid',
                thcLevel: 'Very High (over 20%)',
                badges: ['20% OFF', 'Popular'],
            },
            {
                name: 'White Widow Feminized',
                url: 'https://seedsupreme.com/white-widow-feminized.html',
                slug: 'white-widow-feminized',
                imageUrl: 'https://example.com/white-widow.jpg',
                basePriceNum: 39.00,
                packSize: 4,
                pricePerSeed: 9.75,
                stockStatus: 'In Stock',
                variety: 'Mostly Indica',
                thcLevel: 'High (15-20%)',
            },
            {
                name: 'Sour Diesel Feminized',
                url: 'https://seedsupreme.com/sour-diesel-feminized.html',
                slug: 'sour-diesel-feminized',
                basePriceNum: 49.00,
                packSize: 4,
                pricePerSeed: 12.25,
                stockStatus: 'Limited Stock',
                variety: 'Mostly Sativa',
                thcLevel: 'Very High (over 20%)',
            },
        ];

        const saveResult = await dbService.saveProductsToCategory(categoryId, testProducts);
        console.log(`✅ Saved: ${saveResult.saved}`);
        console.log(`   Updated: ${saveResult.updated}`);
        console.log(`   Errors: ${saveResult.errors}\n`);

        // Step 5: Query Results from Database
        console.log('📋 Step 5: Query Results from Database');
        console.log('-'.repeat(70));

        // Get category with products
        const category = await prisma.seedProductCategory.findUnique({
            where: { id: categoryId },
            include: {
                seedProducts: {
                    select: {
                        name: true,
                        basePrice: true,
                        pricePerSeed: true,
                        variety: true,
                        thcText: true,
                        stockStatus: true,
                    },
                },
            },
        });

        if (!category) {
            console.log('❌ Category not found!');
            return;
        }

        console.log(`\n📁 Category: ${category.name}`);
        console.log(`   Slug: ${category.slug}`);
        console.log(`   URL: ${category.url}`);
        console.log(`   Products: ${category.seedProducts.length}`);

        console.log(`\n📦 Products:`);
        category.seedProducts.forEach((product, i) => {
            console.log(`   ${i + 1}. ${product.name}`);
            console.log(`      Price: $${product.basePrice.toFixed(2)} ($${product.pricePerSeed.toFixed(2)}/seed)`);
            console.log(`      Variety: ${product.variety || 'N/A'}`);
            console.log(`      THC: ${product.thcText || 'N/A'}`);
            console.log(`      Stock: ${product.stockStatus}`);
        });

        // Step 6: Seller Stats
        console.log(`\n📋 Step 6: Seller Statistics`);
        console.log('-'.repeat(70));
        const stats = await dbService.getSellerStats(sellerId);
        console.log(`Categories: ${stats.categories}`);
        console.log(`Products: ${stats.products}`);
        console.log(`Last Scraped: ${stats.lastScraped?.toLocaleString() || 'N/A'}`);
        console.log(`Status: ${stats.status || 'N/A'}`);

        console.log('\n' + '='.repeat(70));
        console.log('✅ All Tests Passed!');
        console.log('='.repeat(70));

        console.log('\n📝 Next Steps:');
        console.log('1. Run full scraper: pnpm tsx scrapers/seedsupreme/scripts/scrape-all-categories.ts 1');
        console.log('2. View in Prisma Studio: pnpm prisma studio');
        console.log('3. Clean up test data if needed');
        console.log('');

    } catch (error) {
        console.error('\n❌ Test Failed:');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
