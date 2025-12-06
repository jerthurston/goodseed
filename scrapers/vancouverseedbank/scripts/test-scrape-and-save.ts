/**
 * Vancouver Seed Bank - Scrape and Save to Database
 * 
 * Complete pipeline: Scrape → Save to PostgreSQL → Verify
 * 
 * Usage:
 *   pnpm tsx scrapers/vancouverseedbank/scripts/scrape-and-save.ts [maxPages]
 * 
 * Example:
 *   pnpm tsx scrapers/vancouverseedbank/scripts/scrape-and-save.ts 2
 *   pnpm tsx scrapers/vancouverseedbank/scripts/scrape-and-save.ts 5
 */

import { prisma } from '@/lib/prisma';
import 'dotenv/config';
import { ProductListScraper } from '../core/product-list-scrapers';
import { SaveDbService } from '../core/save-db-service';
import type { CategoryMetadata } from '../core/types';

// ============================================================================
// HARDCODED LISTING URLS
// ============================================================================
const LISTING_URLS = [
    'https://vancouverseedbank.ca/shop/jsf/epro-archive-products/',
];

/**
 * Extract category metadata from URL
 */
function extractCategoryFromUrl(url: string): CategoryMetadata {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // For main shop page
    if (pathname.includes('epro-archive-products')) {
        return {
            name: 'All Products',
            slug: 'all-products',
            url,
            seedType: undefined,
        };
    }

    // For category pages
    const slug = pathname.replace(/^\//, '').replace(/\/$/, '');
    const name = slug
        .split('/')
        .pop()!
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return { name, slug, url };
}

async function main() {
    const maxPages = parseInt(process.argv[2] || '2');
    const startTime = Date.now();

    console.log('='.repeat(70));
    console.log('🌱 Vancouver Seed Bank - Scrape and Save to Database');
    console.log('='.repeat(70));
    console.log(`Max Pages per Listing: ${maxPages}`);
    console.log(`Total URLs: ${LISTING_URLS.length}`);
    console.log('');

    // Initialize database service
    const dbService = new SaveDbService(prisma);

    try {
        // Step 1: Initialize seller
        console.log('📦 Initializing seller...');
        const sellerId = await dbService.initializeSeller();
        console.log(`✅ Seller ID: ${sellerId}`);
        console.log('');

        // Step 2: Scrape and save each listing
        let totalProducts = 0;
        let totalSaved = 0;
        let totalUpdated = 0;
        let totalErrors = 0;

        for (let i = 0; i < LISTING_URLS.length; i++) {
            const url = LISTING_URLS[i];
            const categoryMeta = extractCategoryFromUrl(url);

            console.log(`[${i + 1}/${LISTING_URLS.length}] Scraping: ${categoryMeta.name}`);
            console.log(`URL: ${url}`);

            // Get or create category
            const categoryId = await dbService.getOrCreateCategory(sellerId, categoryMeta);
            console.log(`📂 Category ID: ${categoryId}`);

            // Scrape products
            const scraper = new ProductListScraper();
            const result = await scraper.scrapeProductList(url, maxPages);

            console.log(`✅ Scraped ${result.totalProducts} products in ${(result.duration / 1000).toFixed(2)}s`);

            // Save to database
            const saveResult = await dbService.saveProductsToCategory(categoryId, result.products);

            console.log(`💾 Saved: ${saveResult.saved} | Updated: ${saveResult.updated} | Errors: ${saveResult.errors}`);
            console.log('');

            totalProducts += result.totalProducts;
            totalSaved += saveResult.saved;
            totalUpdated += saveResult.updated;
            totalErrors += saveResult.errors;
        }

        // Step 3: Log scraping activity
        const duration = Math.round((Date.now() - startTime) / 1000);
        await dbService.logScrapeActivity(
            sellerId,
            totalErrors > 0 ? 'error' : 'success',
            totalProducts,
            duration
        );

        // Step 4: Summary
        console.log('='.repeat(70));
        console.log('✅ SCRAPING COMPLETE');
        console.log('='.repeat(70));
        console.log(`Total Products: ${totalProducts}`);
        console.log(`Saved: ${totalSaved}`);
        console.log(`Updated: ${totalUpdated}`);
        console.log(`Errors: ${totalErrors}`);
        console.log(`Duration: ${duration}s`);
        console.log('');

        // Step 5: Get seller stats
        const stats = await dbService.getSellerStats(sellerId);
        console.log('📊 Database Stats:');
        console.log(`   Categories: ${stats.categories}`);
        console.log(`   Products: ${stats.products}`);
        console.log(`   Last Scraped: ${stats.lastScraped?.toISOString()}`);
        console.log(`   Status: ${stats.status}`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
