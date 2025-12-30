/**
 * Test script for Sonoma Seeds save database functionality
 * 
 * Tests the SaveDbService by saving sample scraped data to database
 * Usage: pnpm tsx scrapers/sonomaseeds/script/test-save-db.ts
 */

import { SaveDbService } from '@/scrapers/sonomaseeds/core/save-db-service';
import { sonomaSeedsProductListScraper } from '@/scrapers/sonomaseeds/core/sonomaseeds-product-list-scraper';
import { ScraperFactory } from '@/lib/factories/scraper-factory';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';

const SONOMA_SEEDS_SELLER_ID = 'cmjqvc2hl0000d8sbuxobwjst'; // Assuming this exists in database

async function testSaveDatabase() {
    console.log('🧪 Testing Sonoma Seeds Save Database...');
    console.log('');

    try {
        // 1. Initialize database service
        const dbService = new SaveDbService(prisma);
        await dbService.initializeSeller(SONOMA_SEEDS_SELLER_ID);
        
        console.log('✅ Database service initialized');
        console.log('📊 Current seller:', dbService.getSeller().name);
        console.log('');

        // 2. Get scraper config
        const scraperFactory = new ScraperFactory(prisma);
        const siteConfig = scraperFactory.getSiteInfo('sonomaseeds');
        if (!siteConfig) {
            throw new Error('Sonoma Seeds config not found');
        }

        console.log('✅ Scraper config loaded');
        console.log('🌐 Base URL:', siteConfig.baseUrl);
        console.log('');

        // 3. Run scraper to get sample data (limit to 1 page for testing)
        console.log('🕷️ Running scraper (limited to 1 page for testing)...');
        const scrapeResult = await sonomaSeedsProductListScraper(siteConfig, 1);
        
        console.log('✅ Scraping completed');
        console.log(`📦 Products found: ${scrapeResult.totalProducts}`);
        console.log(`⏱️ Duration: ${scrapeResult.duration}ms`);
        console.log('');

        if (scrapeResult.products.length === 0) {
            console.log('⚠️ No products found to save');
            return;
        }

        // 4. Save products to database
        console.log('💾 Saving products to database...');
        const saveResult = await dbService.saveProductsToDatabase(scrapeResult.products);
        
        console.log('✅ Database save completed');
        console.log(`📈 Results:`);
        console.log(`   - New products saved: ${saveResult.saved}`);
        console.log(`   - Existing products updated: ${saveResult.updated}`);
        console.log(`   - Errors: ${saveResult.errors}`);
        console.log('');

        // 5. Update seller status
        await dbService.updateSellerStatus('success', 'Test scraping completed successfully');
        console.log('✅ Seller status updated');
        console.log('');

        // 6. Log scrape activity
        await dbService.logScrapeActivity(
            SONOMA_SEEDS_SELLER_ID,
            'success',
            scrapeResult.totalProducts,
            scrapeResult.duration,
            saveResult.errors > 0 ? { saveErrors: saveResult.errors } : undefined
        );
        console.log('✅ Scrape activity logged');
        console.log('');

        // 7. Get seller statistics
        const stats = await dbService.getSellerStats(SONOMA_SEEDS_SELLER_ID);
        console.log('📊 Seller Statistics:');
        console.log(`   - Categories: ${stats.categories}`);
        console.log(`   - Products: ${stats.products}`);
        console.log(`   - Last scraped: ${stats.lastScraped}`);
        console.log(`   - Status: ${stats.status}`);

    } catch (error) {
        console.error('❌ Test failed:', error);
        apiLogger.logError('Test Save Database', error as Error, {
            message: 'Error during database save test'
        });

        // Try to update seller status to error
        try {
            const dbService = new SaveDbService(prisma);
            await dbService.initializeSeller(SONOMA_SEEDS_SELLER_ID);
            await dbService.updateSellerStatus('error', `Test failed: ${(error as Error).message}`);
        } catch (statusError) {
            console.error('Failed to update seller status:', statusError);
        }
    }
}

// Run the test
testSaveDatabase()
    .then(() => {
        console.log('🏁 Test script finished');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Test script failed:', error);
        process.exit(1);
    });