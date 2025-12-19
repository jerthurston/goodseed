/**
 * Test SunWest Genetics Scrape and Save to Database
 * 
 * Script to test scraping and saving products to database
 * 
 * Usage:
 * npm run tsx scrapers/sunwestgenetics/scripts/test-scrape-and-save.ts
 */

import { ProductListScraper } from '../core/scrape-product-list';
import { SaveDbService } from '../core/save-db-service';
import { CATEGORY_URLS } from '../core/selectors';
import { prisma } from '@/lib/prisma';
import 'dotenv/config';

async function main() {
    console.log('🧪 Testing SunWest Genetics Scrape and Save...');

    const scraper = new ProductListScraper();
    const dbService = new SaveDbService(prisma);

    try {
        // Initialize seller
        console.log('\n🏪 Initializing seller...');
        const sellerId = await dbService.initializeSeller();
        console.log(`✅ Seller ID: ${sellerId}`);

        // Create category metadata
        const categoryMetadata = {
            name: 'All Products',
            slug: 'all-products',
            description: 'All cannabis seeds from SunWest Genetics',
        };

        // Get or create category
        console.log('\n📁 Creating category...');
        const categoryId = await dbService.getOrCreateCategory(sellerId, categoryMetadata);
        console.log(`✅ Category ID: ${categoryId}`);

        // Scrape products (just 1 page for testing)
        console.log('\n🕷️  Scraping products (1 page)...');
        const result = await scraper.scrapeProductList(CATEGORY_URLS.allProducts, 1);
        console.log(`✅ Scraped ${result.totalProducts} products`);

        if (result.products.length === 0) {
            console.log('\n⚠️  No products found! Check selectors in selectors.ts');
            return;
        }

        // Save to database
        console.log('\n💾 Saving to database...');
        const saveResult = await dbService.saveProductsToCategory(categoryId, result.products);
        console.log(`✅ Save Results:`);
        console.log(`   - Saved: ${saveResult.saved}`);
        console.log(`   - Updated: ${saveResult.updated}`);
        console.log(`   - Errors: ${saveResult.errors}`);

        // Get stats
        console.log('\n📊 Getting stats...');
        const stats = await dbService.getScrapingStats(sellerId);
        console.log(`✅ Stats:`);
        console.log(`   - Total Categories: ${stats.totalCategories}`);
        console.log(`   - Total Products: ${stats.totalProducts}`);
        console.log(`   - Last Scraped: ${stats.lastScraped}`);

        console.log('\n✨ Test completed successfully!');

    } catch (error) {
        console.error('\n❌ Error during testing:', error);
        await dbService.updateSellerStatus(await dbService.initializeSeller(), 'error', error instanceof Error ? error.message : 'Unknown error');
    }
}

// Run the test
main().catch(console.error);