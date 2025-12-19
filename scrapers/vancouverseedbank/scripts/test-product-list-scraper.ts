/**
 * Vancouver Seed Bank - Test Product List Scraper
 * 
 * Test script to verify scraper works correctly
 * 
 * Usage:
 *   pnpm tsx scrapers/vancouverseedbank/scripts/test-product-list-scraper.ts [maxPages]
 * 
 * Example:
 *   pnpm tsx scrapers/vancouverseedbank/scripts/test-product-list-scraper.ts 2
 */

import 'dotenv/config';
import { vancouverProductListScraper } from '../core/vancouver-product-list-scraper';

async function main() {
    const maxPages = parseInt(process.argv[2] || '1');

    console.log('='.repeat(70));
    console.log('🌱 Vancouver Seed Bank - Product List Scraper Test');
    console.log('='.repeat(70));
    console.log(`Max Pages: ${maxPages}`);
    console.log('');

    // Test URL
    const testUrl = 'https://vancouverseedbank.ca/shop/jsf/epro-archive-products/';

    console.log('📋 Testing URL:');
    console.log(`   ${testUrl}`);
    console.log('');

    

    const scraper = new vancouverProductListScraper({siteConfig});
    const startTime = Date.now();

    try {
        console.log('🚀 Starting scraper...\n');

        const result = await scraper.scrapeProductList(testUrl, maxPages);

        const duration = (result.duration / 1000).toFixed(2);
        console.log('\n' + '='.repeat(70));
        console.log('✅ SCRAPING COMPLETE');
        console.log('='.repeat(70));
        console.log(`Total Products: ${result.totalProducts}`);
        console.log(`Total Pages: ${result.totalPages}`);
        console.log(`Duration: ${duration}s`);
        console.log('');

        // Data Quality Analysis
        console.log('📊 DATA QUALITY:');
        console.log('='.repeat(70));

        const withImages = result.products.filter(p => p.imageUrl).length;
        const withRating = result.products.filter(p => p.rating).length;
        const withReviews = result.products.filter(p => p.reviewCount && p.reviewCount > 0).length;
        const withTHC = result.products.filter(p => p.thcLevel).length;
        const withCBD = result.products.filter(p => p.cbdLevel).length;
        const withStrain = result.products.filter(p => p.strainType).length;
        const withBadge = result.products.filter(p => p.badge).length;
        const withFlowering = result.products.filter(p => p.floweringTime).length;

        console.log(`Images:         ${withImages}/${result.totalProducts} (${((withImages / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`Ratings:        ${withRating}/${result.totalProducts} (${((withRating / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`Reviews:        ${withReviews}/${result.totalProducts} (${((withReviews / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`THC Levels:     ${withTHC}/${result.totalProducts} (${((withTHC / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`CBD Levels:     ${withCBD}/${result.totalProducts} (${((withCBD / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`Strain Types:   ${withStrain}/${result.totalProducts} (${((withStrain / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`Badges:         ${withBadge}/${result.totalProducts} (${((withBadge / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`Flowering Time: ${withFlowering}/${result.totalProducts} (${((withFlowering / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log('');

        // Sample Products
        console.log('📦 SAMPLE PRODUCTS (First 3):');
        console.log('='.repeat(70));

        result.products.slice(0, 3).forEach((product, i) => {
            console.log(`\n[${i + 1}] ${product.name}`);
            console.log(`    URL: ${product.url}`);
            console.log(`    Slug: ${product.slug}`);
            console.log(`    Image: ${product.imageUrl ? '✅ Yes' : '❌ No'}`);
            console.log(`    Strain: ${product.strainType || 'N/A'}`);
            console.log(`    Badge: ${product.badge || 'N/A'}`);
            console.log(`    Rating: ${product.rating ? `⭐ ${product.rating}` : 'N/A'} ${product.reviewCount ? `(${product.reviewCount} reviews)` : ''}`);
            console.log(`    THC: ${product.thcLevel || 'N/A'} ${product.thcMin ? `(${product.thcMin}-${product.thcMax}%)` : ''}`);
            console.log(`    CBD: ${product.cbdLevel || 'N/A'} ${product.cbdMin ? `(${product.cbdMin}-${product.cbdMax}%)` : ''}`);
            console.log(`    Flowering: ${product.floweringTime || 'N/A'}`);
            console.log(`    Growing Level: ${product.growingLevel || 'N/A'}`);
        });

        console.log('\n' + '='.repeat(70));
        console.log('✨ Test complete!');

    } catch (error) {
        console.error('\n❌ ERROR:', error);
        throw error;
    }
}

main().catch(console.error);
