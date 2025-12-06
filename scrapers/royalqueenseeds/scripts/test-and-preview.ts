/**
 * Royal Queen Seeds - Test Scraper with Data Preview
 * 
 * Usage:
 *   pnpm tsx scrapers/royalqueenseeds/scripts/test-and-preview.ts
 */

import 'dotenv/config';
import { RoyalQueenSeedsCategoryScraper } from '../core/category-scraper';

async function main() {
    console.log('🧪 Royal Queen Seeds - Test & Preview');
    console.log('='.repeat(70));

    const testUrl = 'https://www.royalqueenseeds.com/us/34-autoflowering-cannabis-seeds';

    console.log(`\n📍 Test URL: ${testUrl}`);
    console.log('📄 Scraping 1 page for preview...\n');

    const scraper = new RoyalQueenSeedsCategoryScraper();
    const result = await scraper.scrapeCategory(testUrl, 1);

    console.log('='.repeat(70));
    console.log('📊 SCRAPE RESULTS');
    console.log('='.repeat(70));
    console.log(`Total Products: ${result.totalProducts}`);
    console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log('');

    if (result.products.length > 0) {
        console.log('📦 Sample Products:\n');

        result.products.slice(0, 3).forEach((product, i) => {
            console.log(`\n[${i + 1}] ${product.name}`);
            console.log('─'.repeat(70));
            console.log(`URL: ${product.url}`);
            console.log(`Slug: ${product.slug}`);
            console.log(`Image: ${product.imageUrl?.substring(0, 80)}...`);
            console.log(`Price: ${product.basePrice} (Numeric: $${product.basePriceNum})`);
            console.log(`Original Price: ${product.originalPrice || 'N/A'}`);
            console.log(`Pack Size: ${product.packSize} seeds`);
            console.log(`Price/Seed: $${product.pricePerSeed?.toFixed(2)}`);
            console.log(`THC Level: ${product.thcLevel || 'N/A'}`);
            console.log(`Effects: ${product.effects || 'N/A'}`);
            console.log(`Rating: ${product.rating || 'N/A'} (${product.reviewCount || 0} reviews)`);
        });

        console.log('\n' + '='.repeat(70));
        console.log('📋 DATA QUALITY CHECK');
        console.log('='.repeat(70));

        const stats = {
            withPrice: result.products.filter(p => p.basePriceNum).length,
            withImage: result.products.filter(p => p.imageUrl).length,
            withTHC: result.products.filter(p => p.thcLevel).length,
            withEffects: result.products.filter(p => p.effects).length,
            withRating: result.products.filter(p => p.rating).length,
            withReviews: result.products.filter(p => p.reviewCount).length,
        };

        const total = result.products.length;
        console.log(`✅ Price: ${stats.withPrice}/${total} (${((stats.withPrice / total) * 100).toFixed(0)}%)`);
        console.log(`✅ Image: ${stats.withImage}/${total} (${((stats.withImage / total) * 100).toFixed(0)}%)`);
        console.log(`✅ THC: ${stats.withTHC}/${total} (${((stats.withTHC / total) * 100).toFixed(0)}%)`);
        console.log(`✅ Effects: ${stats.withEffects}/${total} (${((stats.withEffects / total) * 100).toFixed(0)}%)`);
        console.log(`✅ Rating: ${stats.withRating}/${total} (${((stats.withRating / total) * 100).toFixed(0)}%)`);
        console.log(`✅ Reviews: ${stats.withReviews}/${total} (${((stats.withReviews / total) * 100).toFixed(0)}%)`);

        console.log('\n' + '='.repeat(70));
        console.log('✨ Preview complete!');
        console.log('💡 Next: Run full scrape with multiple pages');
        console.log('   pnpm tsx scrapers/royalqueenseeds/scripts/scrape-hardcoded-urls.ts 3');
    }
}

main().catch(console.error);
