/**
 * Batch Scraper for SunWest Genetics
 * 
 * Script to scrape products in batches and save to database
 * Useful for large-scale scraping with progress tracking
 * 
 * Usage:
 * npm run tsx scrapers/sunwestgenetics/scripts/scrape-batch.ts
 */

import { ProductListScraper } from '../core/product-list-scrapers';
import { SaveDbService } from '../core/save-db-service';
import { CATEGORY_URLS } from '../core/selectors';
import { PrismaClient } from '@prisma/client';

interface BatchConfig {
    categoryUrl: string;
    categoryName: string;
    startPage: number;
    endPage: number;
    batchSize: number; // Pages per batch
}

async function scrapeBatch(
    scraper: ProductListScraper,
    dbService: SaveDbService,
    categoryId: string,
    config: BatchConfig,
    batchStart: number,
    batchEnd: number
): Promise<{ products: number; saved: number; updated: number; errors: number }> {
    
    console.log(`\n🚀 Batch ${Math.ceil(batchStart / config.batchSize)}: Pages ${batchStart}-${batchEnd}`);
    
    try {
        // Scrape this batch
        const result = await scraper.scrapeProductListByBatch(
            config.categoryUrl,
            batchStart,
            batchEnd
        );

        console.log(`   📦 Scraped ${result.totalProducts} products`);

        if (result.products.length === 0) {
            console.log(`   ⚠️  No products found in pages ${batchStart}-${batchEnd}`);
            return { products: 0, saved: 0, updated: 0, errors: 0 };
        }

        // Save to database
        const saveResult = await dbService.saveProductsToCategory(categoryId, result.products);
        
        console.log(`   💾 DB Results: ${saveResult.saved} saved, ${saveResult.updated} updated, ${saveResult.errors} errors`);

        return {
            products: result.totalProducts,
            saved: saveResult.saved,
            updated: saveResult.updated,
            errors: saveResult.errors,
        };

    } catch (error) {
        console.error(`   ❌ Batch error:`, error);
        return { products: 0, saved: 0, updated: 0, errors: 1 };
    }
}

async function main() {
    console.log('🎯 SunWest Genetics Batch Scraper');

    const prisma = new PrismaClient();
    const scraper = new ProductListScraper();
    const dbService = new SaveDbService(prisma);

    // Configuration - adjust as needed
    const config: BatchConfig = {
        categoryUrl: CATEGORY_URLS.allProducts,
        categoryName: 'All Products',
        startPage: 1,
        endPage: 10, // Adjust based on site
        batchSize: 3, // Pages per batch
    };

    try {
        // Initialize seller
        console.log('\n🏪 Initializing seller...');
        const sellerId = await dbService.initializeSeller();
        console.log(`✅ Seller ID: ${sellerId}`);

        // Create category
        const categoryMetadata = {
            name: config.categoryName,
            slug: config.categoryName.toLowerCase().replace(/\s+/g, '-'),
            description: `Cannabis seeds from SunWest Genetics - ${config.categoryName}`,
        };

        console.log('\n📁 Creating category...');
        const categoryId = await dbService.getOrCreateCategory(sellerId, categoryMetadata);
        console.log(`✅ Category ID: ${categoryId}`);

        // Calculate batches
        const totalPages = config.endPage - config.startPage + 1;
        const totalBatches = Math.ceil(totalPages / config.batchSize);
        
        console.log(`\n📊 Batch Plan:`);
        console.log(`   - Total Pages: ${totalPages} (${config.startPage}-${config.endPage})`);
        console.log(`   - Batch Size: ${config.batchSize} pages`);
        console.log(`   - Total Batches: ${totalBatches}`);

        // Track totals
        let totalProducts = 0;
        let totalSaved = 0;
        let totalUpdated = 0;
        let totalErrors = 0;

        // Process batches
        for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
            const batchStart = config.startPage + (batchNum - 1) * config.batchSize;
            const batchEnd = Math.min(batchStart + config.batchSize - 1, config.endPage);

            const batchResult = await scrapeBatch(
                scraper,
                dbService,
                categoryId,
                config,
                batchStart,
                batchEnd
            );

            // Update totals
            totalProducts += batchResult.products;
            totalSaved += batchResult.saved;
            totalUpdated += batchResult.updated;
            totalErrors += batchResult.errors;

            // Progress report
            console.log(`   ✅ Batch ${batchNum}/${totalBatches} completed`);

            // Brief pause between batches to be respectful
            if (batchNum < totalBatches) {
                console.log(`   ⏸️  Pausing 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Final results
        console.log(`\n🎉 Batch Scraping Completed!`);
        console.log(`\n📊 Final Results:`);
        console.log(`   - Total Products: ${totalProducts}`);
        console.log(`   - Saved: ${totalSaved}`);
        console.log(`   - Updated: ${totalUpdated}`);
        console.log(`   - Errors: ${totalErrors}`);

        // Update seller status
        await dbService.updateSellerStatus(sellerId, totalErrors === 0 ? 'success' : 'error');

        // Get final stats
        const stats = await dbService.getScrapingStats(sellerId);
        console.log(`\n📈 Database Stats:`);
        console.log(`   - Total Categories: ${stats.totalCategories}`);
        console.log(`   - Total Products: ${stats.totalProducts}`);
        console.log(`   - Last Scraped: ${stats.lastScraped}`);

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        await dbService.updateSellerStatus(await dbService.initializeSeller(), 'error', 
            error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the batch scraper
main().catch(console.error);