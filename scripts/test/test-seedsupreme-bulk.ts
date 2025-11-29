/**
 * Test Seed Supreme Bulk Scraping
 * 
 * Tests scraping multiple categories with more products
 * 
 * Usage:
 *   pnpm tsx scripts/test/test-seedsupreme-bulk.ts
 */

import { SeedSupremeDbService } from '../../scrapers/seedsupreme/db-service';
import { SeedSupremeFullScraper } from '../../scrapers/seedsupreme/full-scraper';

async function main() {
    console.log('\n========================================');
    console.log('🚀 Seed Supreme Bulk Scraping Test');
    console.log('========================================\n');

    // Categories to scrape
    const categories = [
        { slug: 'feminized-seeds', maxPages: 1, maxProducts: 10, name: 'Feminized Seeds' },
        { slug: 'autoflowering-seeds', maxPages: 1, maxProducts: 10, name: 'Autoflowering Seeds' },
        { slug: 'regular-seeds', maxPages: 1, maxProducts: 5, name: 'Regular Seeds' },
    ];

    const scraper = new SeedSupremeFullScraper();
    const dbService = new SeedSupremeDbService();

    const startTime = Date.now();
    let totalProducts = 0;
    let totalSeeds = 0;
    let totalSaved = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    try {
        // Initialize seller
        console.log('🏪 Initializing Seed Supreme seller...\n');
        const sellerId = await dbService.initializeSeller();
        console.log(`   ✓ Seller ID: ${sellerId}\n`);

        // Scrape each category
        for (let i = 0; i < categories.length; i++) {
            const category = categories[i];

            console.log('\n' + '═'.repeat(80));
            console.log(`📂 Category ${i + 1}/${categories.length}: ${category.name}`);
            console.log('═'.repeat(80));

            const categoryStartTime = Date.now();

            // Scrape category
            const products = await scraper.scrapeCategory(
                category.slug,
                category.maxPages,
                category.maxProducts
            );

            // Save to database
            console.log(`\n💾 Saving ${products.length} products to database...`);
            const saveResult = await dbService.saveProducts(products);

            const categoryTime = Date.now() - categoryStartTime;
            const seedCount = products.reduce((sum, p) => sum + (p.packOptions.length || 1), 0);

            totalProducts += products.length;
            totalSeeds += seedCount;
            totalSaved += saveResult.saved;
            totalUpdated += saveResult.updated;
            totalErrors += saveResult.errors;

            console.log('\n📊 Category Summary:');
            console.log(`   Products: ${products.length}`);
            console.log(`   Seeds: ${seedCount}`);
            console.log(`   Saved: ${saveResult.saved}`);
            console.log(`   Updated: ${saveResult.updated}`);
            console.log(`   Errors: ${saveResult.errors}`);
            console.log(`   Time: ${(categoryTime / 1000).toFixed(2)}s`);
            console.log(`   Avg: ${(categoryTime / products.length / 1000).toFixed(2)}s per product`);

            // Wait 2 seconds between categories to be polite
            if (i < categories.length - 1) {
                console.log('\n⏳ Waiting 2s before next category...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        const totalTime = Date.now() - startTime;

        // Final summary
        console.log('\n\n' + '═'.repeat(80));
        console.log('✅ BULK SCRAPING COMPLETE');
        console.log('═'.repeat(80));
        console.log(`\n📈 Overall Statistics:`);
        console.log(`   Categories: ${categories.length}`);
        console.log(`   Products Scraped: ${totalProducts}`);
        console.log(`   Seeds in Database: ${totalSeeds}`);
        console.log(`   New Seeds Saved: ${totalSaved}`);
        console.log(`   Seeds Updated: ${totalUpdated}`);
        console.log(`   Errors: ${totalErrors}`);
        console.log(`   Success Rate: ${((totalSeeds - totalErrors) / totalSeeds * 100).toFixed(1)}%`);

        console.log(`\n⏱️  Performance:`);
        console.log(`   Total Time: ${(totalTime / 1000).toFixed(2)}s`);
        console.log(`   Avg per Product: ${(totalTime / totalProducts / 1000).toFixed(2)}s`);
        console.log(`   Avg per Seed: ${(totalTime / totalSeeds / 1000).toFixed(2)}s`);

        console.log(`\n💰 Price Statistics:`);
        // We'll query the database for price stats

        // Log session
        await dbService.logScrapeSession(totalProducts, totalTime);
        console.log('\n✅ Session logged to database');

    } catch (error) {
        console.error('\n❌ Bulk scraping failed:', error);
        throw error;
    } finally {
        await dbService.disconnect();
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✨ Test Complete\n');
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
