/**
 * Royal Queen Seeds - Scrape and Save to Database
 * 
 * Complete pipeline: Scrape → Save to PostgreSQL → Verify
 * Uses Playwright for infinite scroll + Cheerio for fast extraction
 * 
 * Usage:
 *   pnpm tsx scrapers/royalqueenseeds/scripts/scrape-and-save.ts [maxPages]
 * 
 * Example:
 *   pnpm tsx scrapers/royalqueenseeds/scripts/scrape-and-save.ts 3
 *   pnpm tsx scrapers/royalqueenseeds/scripts/scrape-and-save.ts 10
 */

import { prisma } from '@/lib/prisma';
import 'dotenv/config';
import { RoyalQueenSeedsCategoryDbService } from '../core/category-db-service';
import { RoyalQueenSeedsCategoryScraper } from '../core/category-scraper-playwright';
import type { CategoryMetadata } from '../core/types';

// ============================================================================
// HARDCODED CATEGORY URLS
// ============================================================================
const CATEGORY_URLS = [
    'https://www.royalqueenseeds.com/us/33-feminized-cannabis-seeds',
    'https://www.royalqueenseeds.com/us/34-autoflowering-cannabis-seeds',
];

/**
 * Extract category metadata from URL
 */
function extractCategoryFromUrl(url: string): CategoryMetadata {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    const slug = pathname.replace(/^\//, '').replace(/\.html$/, '');

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
    console.log('🌱 Royal Queen Seeds - Scrape and Save to Database');
    console.log('='.repeat(70));
    console.log(`Max Pages per Category: ${maxPages}`);
    console.log(`Total URLs: ${CATEGORY_URLS.length}`);
    console.log('');

    // Initialize database service with singleton prisma
    const dbService = new RoyalQueenSeedsCategoryDbService(prisma);

    try {
        // Step 1: Initialize seller
        console.log('📦 Initializing seller...');
        const sellerId = await dbService.initializeSeller();
        console.log(`✅ Seller ID: ${sellerId}`);
        console.log('');

        // Step 2: Scrape and save each category
        let totalProducts = 0;
        let totalSaved = 0;
        let totalUpdated = 0;
        let totalErrors = 0;

        for (let i = 0; i < CATEGORY_URLS.length; i++) {
            const url = CATEGORY_URLS[i];
            const categoryMeta = extractCategoryFromUrl(url);

            console.log(`[${i + 1}/${CATEGORY_URLS.length}] Scraping: ${categoryMeta.name}`);
            console.log(`URL: ${url}`);

            // Get or create category
            const categoryId = await dbService.getOrCreateCategory(sellerId, categoryMeta);
            console.log(`📂 Category ID: ${categoryId}`);

            // Scrape products with Playwright + Cheerio
            const scraper = new RoyalQueenSeedsCategoryScraper();
            const result = await scraper.scrapeCategory(url, maxPages);

            console.log(`✅ Scraped ${result.totalProducts} products in ${result.duration}s`);

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
