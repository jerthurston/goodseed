/**
 * Test Seed Supreme Database Integration
 * 
 * Tests full pipeline: Scrape → Transform → Save to DB
 * 
 * Usage:
 *   pnpm tsx scripts/test/test-seedsupreme-db.ts [categorySlug] [maxPages] [maxProducts]
 * 
 * Examples:
 *   pnpm tsx scripts/test/test-seedsupreme-db.ts feminized-seeds 1 3
 *   pnpm tsx scripts/test/test-seedsupreme-db.ts autoflowering-seeds 1 5
 */

import { SeedSupremeDbService } from '../../scrapers/seedsupreme/db-service';
import { SeedSupremeFullScraper } from '../../scrapers/seedsupreme/full-scraper';

async function main() {
    const categorySlug = process.argv[2] || 'feminized-seeds';
    const maxPages = parseInt(process.argv[3]) || 1;
    const maxProducts = parseInt(process.argv[4]) || 3;

    console.log('\n========================================');
    console.log('🧪 Seed Supreme Database Integration Test');
    console.log('========================================');
    console.log(`Category: ${categorySlug}`);
    console.log(`Max Pages: ${maxPages}`);
    console.log(`Max Products: ${maxProducts}`);
    console.log('');

    const scraper = new SeedSupremeFullScraper();
    const dbService = new SeedSupremeDbService();

    const startTime = Date.now();

    try {
        // Step 1: Scrape products
        console.log('📡 Step 1: Scraping products...\n');
        const products = await scraper.scrapeCategory(categorySlug, maxPages, maxProducts);

        const scrapeTime = Date.now() - startTime;
        console.log(`\n⏱️  Scraping completed in ${(scrapeTime / 1000).toFixed(2)}s`);
        console.log(`   Products found: ${products.length}`);

        // Step 2: Initialize seller
        console.log('\n🏪 Step 2: Initializing seller...\n');
        const sellerId = await dbService.initializeSeller();
        console.log(`   Seller ID: ${sellerId}`);

        // Step 3: Save to database
        console.log('\n💾 Step 3: Saving to database...');
        const saveResult = await dbService.saveProducts(products);

        const totalTime = Date.now() - startTime;

        // Step 4: Display results
        console.log('\n========================================');
        console.log('✅ Database Integration Test Complete');
        console.log('========================================');
        console.log(`Products scraped: ${products.length}`);
        console.log(`Seeds saved: ${saveResult.saved}`);
        console.log(`Seeds updated: ${saveResult.updated}`);
        console.log(`Errors: ${saveResult.errors}`);
        console.log(`\nTotal time: ${(totalTime / 1000).toFixed(2)}s`);
        console.log('');

        // Detailed breakdown
        console.log('\n📊 Product Breakdown:');
        console.log('─────────────────────────────────────────');
        let totalSeeds = 0;
        for (const product of products) {
            const seedCount = product.packOptions.length || 1;
            totalSeeds += seedCount;
            console.log(`\n${product.name}`);
            console.log(`  URL: ${product.url}`);
            console.log(`  Slug: ${product.slug}`);
            console.log(`  Pack Options: ${seedCount}`);

            if (product.packOptions.length > 0) {
                product.packOptions.forEach(pack => {
                    console.log(`    - ${pack.packSize}x: $${pack.totalPrice} ($${pack.pricePerSeed}/seed)`);
                });
            }

            console.log(`  Specifications:`);
            console.log(`    - Variety: ${product.specs.variety || 'N/A'}`);
            console.log(`    - THC: ${product.specs.thcContent || 'N/A'}`);
            console.log(`    - CBD: ${product.specs.cbdContent || 'N/A'}`);
            console.log(`    - Flowering: ${product.specs.floweringType || 'N/A'}`);
        }

        console.log('\n─────────────────────────────────────────');
        console.log(`Total Seeds in DB: ${totalSeeds}`);
        console.log(`(${products.length} products × ${(totalSeeds / products.length).toFixed(1)} avg packs)\n`);

        // Performance metrics
        console.log('\n⚡ Performance Metrics:');
        console.log('─────────────────────────────────────────');
        console.log(`Scraping time: ${(scrapeTime / 1000).toFixed(2)}s`);
        console.log(`Database time: ${((totalTime - scrapeTime) / 1000).toFixed(2)}s`);
        console.log(`Time per product: ${(totalTime / products.length / 1000).toFixed(2)}s`);
        console.log(`Time per seed: ${(totalTime / totalSeeds / 1000).toFixed(2)}s`);
        console.log('');

        // Log to database
        await dbService.logScrapeSession(products.length, totalTime);
        console.log('✅ Session logged to database\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error);

        // Log error to database
        const errorTime = Date.now() - startTime;
        await dbService.logScrapeSession(0, errorTime, [
            { url: categorySlug, error: error instanceof Error ? error.message : String(error) }
        ]);

        throw error;
    } finally {
        await dbService.disconnect();
    }
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
