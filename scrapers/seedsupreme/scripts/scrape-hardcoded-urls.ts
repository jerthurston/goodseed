/**
 * Scrape Products from Hardcoded Category URLs
 * 
 * Instead of extracting categories from navigation, this script uses
 * a predefined list of category URLs to scrape products.
 * 
 * Usage:
 *   pnpm tsx scrapers/seedsupreme/scripts/scrape-hardcoded-urls.ts [maxPages]
 * 
 * Example:
 *   pnpm tsx scrapers/seedsupreme/scripts/scrape-hardcoded-urls.ts 5
 */

import { prisma } from '@/lib/prisma';
import 'dotenv/config';
import { SeedSupremeCategoryDbService } from '../core/category-db-service';
import { SeedSupremeCategoryScraper } from '../core/category-scraper';

// ============================================================================
// HARDCODED CATEGORY URLS
// ============================================================================
const CATEGORY_URLS = [
    'https://seedsupreme.com/feminized-seeds.html',
    'https://seedsupreme.com/autoflowering-seeds.html',
    'https://seedsupreme.com/cannabis-seeds/high-yield-seeds.html',
];

/**
 * Extract category metadata from URL
 */
function extractCategoryFromUrl(url: string) {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Extract slug from pathname (remove .html and leading slash)
    const slug = pathname.replace(/^\//, '').replace(/\.html$/, '');

    // Generate name from slug (capitalize words)
    const name = slug
        .split('/')
        .pop()!
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return {
        name,
        slug,
        url,
        level: 0,
        seedType: undefined as undefined,
    };
}

/**
 * Main scraping function
 */
async function main() {
    const maxPages = parseInt(process.argv[2]) || 5;

    console.log('='.repeat(70));
    console.log('🌱 Seed Supreme - Hardcoded URLs Scraper');
    console.log('='.repeat(70));
    console.log(`Max Pages per Category: ${maxPages}`);
    console.log(`Total URLs: ${CATEGORY_URLS.length}\n`);

    // Display URLs to scrape
    console.log('📋 Category URLs to scrape:');
    CATEGORY_URLS.forEach((url, i) => {
        const category = extractCategoryFromUrl(url);
        console.log(`  ${i + 1}. ${category.name} (${category.slug})`);
    });
    console.log('');

    // Initialize database service
    const dbService = new SeedSupremeCategoryDbService(prisma);
    const sellerId = await dbService.initializeSeller();
    console.log(`✅ Initialized Seller: ${sellerId}\n`);

    // Initialize scraper
    const scraper = new SeedSupremeCategoryScraper();

    // Track results
    const results: Array<{
        category: ReturnType<typeof extractCategoryFromUrl>;
        totalProducts: number;
        saved: number;
        updated: number;
        errors: number;
        duration: number;
        success: boolean;
        error?: string;
    }> = [];

    let totalProducts = 0;
    const startTime = Date.now();

    // Scrape each category
    for (let i = 0; i < CATEGORY_URLS.length; i++) {
        const url = CATEGORY_URLS[i];
        const category = extractCategoryFromUrl(url);

        console.log(`\n[${i + 1}/${CATEGORY_URLS.length}] ${category.name}`);
        console.log(`   Slug: ${category.slug}`);
        console.log(`   URL: ${url}`);

        try {
            const categoryStartTime = Date.now();

            // Scrape products from category
            const result = await scraper.scrapeCategory(category.slug, maxPages);

            // Get or create category in database
            const categoryId = await dbService.getOrCreateCategory(sellerId, category);

            // Save products to database (will handle duplicate slugs automatically via upsert)
            const dbResult = await dbService.saveProductsToCategory(categoryId, result.products);

            const duration = Date.now() - categoryStartTime;

            console.log(`   ✅ ${result.totalProducts} products (${(duration / 1000).toFixed(2)}s)`);
            console.log(`      💾 Saved: ${dbResult.saved}, Updated: ${dbResult.updated}, Errors: ${dbResult.errors}`);

            results.push({
                category,
                totalProducts: result.totalProducts,
                saved: dbResult.saved,
                updated: dbResult.updated,
                errors: dbResult.errors,
                duration,
                success: true,
            });

            totalProducts += result.totalProducts;

            // Wait between categories to avoid rate limiting
            if (i < CATEGORY_URLS.length - 1) {
                const waitTime = Math.floor(Math.random() * 5000) + 5000; // 5-10s
                console.log(`   ⏳ Waiting ${(waitTime / 1000).toFixed(1)}s before next category...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }

        } catch (error) {
            console.error(`   ❌ Error scraping category:`, error);
            results.push({
                category,
                totalProducts: 0,
                saved: 0,
                updated: 0,
                errors: 0,
                duration: 0,
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    const totalDuration = Date.now() - startTime;

    // Log scraping activity
    await dbService.logScrapeActivity(
        sellerId,
        'success',
        totalProducts,
        totalDuration / 1000
    );

    // Display summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SCRAPING SUMMARY');
    console.log('='.repeat(70));

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Total Categories: ${CATEGORY_URLS.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Total Products: ${totalProducts}`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('');

    // Display detailed results
    console.log('📋 Detailed Results:');
    results.forEach((result, i) => {
        const icon = result.success ? '✅' : '❌';
        console.log(`\n${icon} [${i + 1}] ${result.category.name}`);
        if (result.success) {
            console.log(`   Products: ${result.totalProducts}`);
            console.log(`   Saved: ${result.saved}, Updated: ${result.updated}, Errors: ${result.errors}`);
            console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
        } else {
            console.log(`   Error: ${result.error}`);
        }
    });

    // Display database stats
    console.log('\n' + '='.repeat(70));
    console.log('💾 DATABASE STATS');
    console.log('='.repeat(70));
    const stats = await dbService.getSellerStats(sellerId);
    console.log(`Categories: ${stats.categories}`);
    console.log(`Products: ${stats.products}`);
    console.log(`Last Scraped: ${stats.lastScraped?.toLocaleString()}`);
    console.log(`Status: ${stats.status}`);

    // Cleanup
    await prisma.$disconnect();

    console.log('\n✨ Scraping complete!\n');
}

// Run the script
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
