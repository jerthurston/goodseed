/**
 * Royal Queen Seeds - Hardcoded URLs Scraper
 * 
 * Uses Playwright to handle infinite scroll pagination
 * 
 * Usage:
 *   pnpm tsx scrapers/royalqueenseeds/scripts/scrape-hardcoded-urls.ts [maxPages]
 * 
 * Example:
 *   pnpm tsx scrapers/royalqueenseeds/scripts/scrape-hardcoded-urls.ts 3
 */

import 'dotenv/config';
import { RoyalQueenSeedsCategoryScraper } from '../core/category-scraper-playwright';

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
function extractCategoryFromUrl(url: string) {
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
    const maxPages = parseInt(process.argv[2] || '1');

    console.log('='.repeat(70));
    console.log('🌱 Royal Queen Seeds - Hardcoded URLs Scraper');
    console.log('='.repeat(70));
    console.log(`Max Pages per Category: ${maxPages}`);
    console.log(`Total URLs: ${CATEGORY_URLS.length}`);
    console.log('');

    console.log('📋 Category URLs to scrape:');
    CATEGORY_URLS.forEach((url, i) => {
        const { name, slug } = extractCategoryFromUrl(url);
        console.log(`  ${i + 1}. ${name} (${slug})`);
    });
    console.log('');

    const scraper = new RoyalQueenSeedsCategoryScraper();
    const results = [];
    const startTime = Date.now();

    for (const [index, url] of CATEGORY_URLS.entries()) {
        const { name, slug } = extractCategoryFromUrl(url);

        console.log(`\n[${index + 1}/${CATEGORY_URLS.length}] ${name}`);
        console.log(`   Slug: ${slug}`);
        console.log(`   URL: ${url}`);

        try {
            const result = await scraper.scrapeCategory(url, maxPages);

            console.log(`   ✅ ${result.totalProducts} products (${(result.duration / 1000).toFixed(2)}s)`);

            results.push(result);

            // Delay between categories
            if (index < CATEGORY_URLS.length - 1) {
                const delay = Math.random() * 5000 + 5000; // 5-10s
                console.log(`   ⏳ Waiting ${(delay / 1000).toFixed(1)}s before next category...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

        } catch (error) {
            console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Summary
    const totalDuration = Date.now() - startTime;
    const totalProducts = results.reduce((sum, r) => sum + r.totalProducts, 0);
    const successful = results.length;

    console.log('\n' + '='.repeat(70));
    console.log('📊 SCRAPING SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Categories: ${CATEGORY_URLS.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${CATEGORY_URLS.length - successful}`);
    console.log(`Total Products: ${totalProducts}`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('');

    console.log('📋 Detailed Results:');
    results.forEach((result, i) => {
        const { name } = extractCategoryFromUrl(result.category);
        console.log(`\n✅ [${i + 1}] ${name}`);
        console.log(`   Products: ${result.totalProducts}`);
        console.log(`   Pages: ${result.totalPages}`);
        console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);

        // Show sample products
        if (result.products.length > 0) {
            console.log(`   Sample: ${result.products[0].name}`);
        }
    });

    console.log('\n' + '='.repeat(70));
    console.log('✨ Scraping complete!');
}

main().catch(console.error);
