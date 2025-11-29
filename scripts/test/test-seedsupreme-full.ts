/**
 * Test Script for Seed Supreme Full Scraper
 * 
 * Tests the complete pipeline: Category → Product Details
 * 
 * Usage:
 *   # Scrape 1 category page (default: feminized-seeds)
 *   pnpm tsx scripts/test/test-seedsupreme-full.ts
 * 
 *   # Scrape specific category with 2 pages
 *   pnpm tsx scripts/test/test-seedsupreme-full.ts best-sellers 2
 * 
 *   # Scrape category with limit on products
 *   pnpm tsx scripts/test/test-seedsupreme-full.ts feminized-seeds 1 10
 * 
 *   # Multi-category scraping
 *   pnpm tsx scripts/test/test-seedsupreme-full.ts --multi
 */

import { SeedSupremeFullScraper } from '../../scrapers/seedsupreme/full-scraper';

async function testSingleCategory() {
    const categorySlug = process.argv[2] || 'feminized-seeds';
    const maxPages = parseInt(process.argv[3] || '1');
    const maxProducts = parseInt(process.argv[4] || '0');

    const scraper = new SeedSupremeFullScraper();

    const products = await scraper.scrapeCategory(categorySlug, maxPages, maxProducts);

    // Display sample products
    console.log('=== Sample Products (first 5) ===\n');
    products.slice(0, 5).forEach((product, i) => {
        console.log(`${i + 1}. ${product.name}`);
        console.log(`   URL: ${product.url}`);
        console.log(`   Variety: ${product.variety || 'N/A'}`);
        console.log(`   THC: ${product.thcLevel || 'N/A'}`);

        if (product.packOptions.length > 0) {
            const bestPack = product.packOptions.reduce((best, current) =>
                current.pricePerSeed < best.pricePerSeed ? current : best
            );
            console.log(`   Best Value: ${bestPack.packSize}x @ $${bestPack.pricePerSeed.toFixed(2)}/seed`);

            if (bestPack.discount) {
                console.log(`   Discount: ${bestPack.discount}% off`);
            }
        }

        console.log('');
    });

    // Analytics by variety
    const varietyMap = new Map<string, number>();
    products.forEach(p => {
        if (p.variety) {
            varietyMap.set(p.variety, (varietyMap.get(p.variety) || 0) + 1);
        }
    });

    if (varietyMap.size > 0) {
        console.log('=== Variety Distribution ===');
        Array.from(varietyMap.entries())
            .sort((a, b) => b[1] - a[1])
            .forEach(([variety, count]) => {
                console.log(`  ${variety}: ${count} products`);
            });
        console.log('');
    }

    // Price analysis
    const pricesPerSeed = products
        .flatMap(p => p.packOptions)
        .map(pack => pack.pricePerSeed)
        .filter(price => price > 0);

    if (pricesPerSeed.length > 0) {
        const avgPrice = pricesPerSeed.reduce((sum, p) => sum + p, 0) / pricesPerSeed.length;
        const minPrice = Math.min(...pricesPerSeed);
        const maxPrice = Math.max(...pricesPerSeed);

        console.log('=== Price Analysis (per seed) ===');
        console.log(`  Average: $${avgPrice.toFixed(2)}`);
        console.log(`  Range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`);
        console.log('');
    }
}

async function testMultiCategory() {
    console.log('🔥 Testing Multi-Category Scraping\n');

    const categories = [
        { slug: 'feminized-seeds', maxPages: 1 },
        { slug: 'best-sellers', maxPages: 1 },
        { slug: 'autoflowering-seeds', maxPages: 1 },
    ];

    const scraper = new SeedSupremeFullScraper();

    const results = await scraper.scrapeMultipleCategories(categories, 5); // Limit to 5 products per category

    // Summary
    console.log('\n=== Multi-Category Results ===\n');

    results.forEach((products, category) => {
        console.log(`\n📦 ${category}:`);
        console.log(`   Total Products: ${products.length}`);

        const withFullData = products.filter(p =>
            p.packOptions.length > 0 &&
            p.specs.variety &&
            p.specs.thcContent
        );

        console.log(`   Complete Data: ${withFullData.length}/${products.length}`);

        // Top 3 products by best price per seed
        if (products.length > 0) {
            const top3 = products
                .filter(p => p.packOptions.length > 0)
                .map(p => ({
                    name: p.name,
                    bestPrice: Math.min(...p.packOptions.map(pack => pack.pricePerSeed)),
                }))
                .sort((a, b) => a.bestPrice - b.bestPrice)
                .slice(0, 3);

            if (top3.length > 0) {
                console.log('   Best Deals:');
                top3.forEach((item, i) => {
                    console.log(`     ${i + 1}. ${item.name} - $${item.bestPrice.toFixed(2)}/seed`);
                });
            }
        }
    });
}

async function main() {
    try {
        // Check for multi-category flag
        if (process.argv[2] === '--multi') {
            await testMultiCategory();
        } else {
            await testSingleCategory();
        }

        console.log('\n✅ Test Complete!');
        console.log('💾 Check: ./storage/datasets/default/\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

main();
