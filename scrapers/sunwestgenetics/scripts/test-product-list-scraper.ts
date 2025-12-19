/**
 * Test SunWest Genetics Product List Scraper
 * 
 * Script to test scraping product listings from SunWest Genetics
 * 
 * Usage:
 * npm run tsx scrapers/sunwestgenetics/scripts/test-product-list-scraper.ts
 */

import { ProductListScraper } from '../core/scrape-product-list';
import { CATEGORY_URLS } from '../core/selectors';

async function main() {
    const maxPages = parseInt(process.argv[2] || '1');

    console.log('🧪 Testing SunWest Genetics Product List Scraper...');
    console.log(`📋 Max Pages: ${maxPages}`);

    const scraper = new ProductListScraper();

    try {
        // Test with specified number of pages
        console.log(`\n📋 Testing with shop page (max ${maxPages} page${maxPages > 1 ? 's' : ''})...`);
        const result = await scraper.scrapeProductList(CATEGORY_URLS.allProducts, maxPages);
        
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
        const withTHC = result.products.filter(p => p.thcMin !== undefined && p.thcMax !== undefined).length;
        const withCBD = result.products.filter(p => p.cbdMin !== undefined && p.cbdMax !== undefined).length;
        const withStrain = result.products.filter(p => p.strainType).length;
        const withBadge = result.products.filter(p => p.badge).length;
        const withFlowering = result.products.filter(p => p.floweringTime).length;
        const withPricing = result.products.filter(p => p.pricings.length > 0).length;

        console.log(`Images:         ${withImages}/${result.totalProducts} (${((withImages / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`Ratings:        ${withRating}/${result.totalProducts} (${((withRating / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`Reviews:        ${withReviews}/${result.totalProducts} (${((withReviews / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`THC Levels:     ${withTHC}/${result.totalProducts} (${((withTHC / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`CBD Levels:     ${withCBD}/${result.totalProducts} (${((withCBD / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`Strain Types:   ${withStrain}/${result.totalProducts} (${((withStrain / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`Badges:         ${withBadge}/${result.totalProducts} (${((withBadge / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`Flowering Time: ${withFlowering}/${result.totalProducts} (${((withFlowering / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log(`Pricing Data:   ${withPricing}/${result.totalProducts} (${((withPricing / result.totalProducts) * 100).toFixed(1)}%)`);
        console.log('');

        // Sample Products
        console.log('📦 SAMPLE PRODUCTS (First 3):');
        console.log('='.repeat(70));

        if (result.products.length > 0) {
            result.products.slice(0, 3).forEach((product, i) => {
                console.log(`\n[${i + 1}] ${product.name}`);
                console.log(`    URL: ${product.url}`);
                console.log(`    Slug: ${product.slug}`);
                console.log(`    Image: ${product.imageUrl ? '✅ Yes' : '❌ No'}`);
                console.log(`    Strain: ${product.strainType || 'N/A'}`);
                console.log(`    Badge: ${product.badge || 'N/A'}`);
                console.log(`    Rating: ${product.rating ? `⭐ ${product.rating}` : 'N/A'} ${product.reviewCount ? `(${product.reviewCount} reviews)` : ''}`);
                console.log(`    THC: ${product.thcLevel || 'N/A'} ${product.thcMin !== undefined ? `(${product.thcMin}-${product.thcMax}%)` : ''}`);
                console.log(`    CBD: ${product.cbdLevel || 'N/A'} ${product.cbdMin !== undefined ? `(${product.cbdMin}-${product.cbdMax}%)` : ''}`);
                console.log(`    Flowering: ${product.floweringTime || 'N/A'}`);
                console.log(`    Growing Level: ${product.growingLevel || 'N/A'}`);
                console.log(`    Pricings: ${product.pricings.length} variants`);
                product.pricings.forEach((pricing, pIndex) => {
                    console.log(`      ${pIndex + 1}. ${pricing.packSize} seeds: $${pricing.totalPrice} ($${pricing.pricePerSeed.toFixed(2)}/seed)`);
                });
            });
        } else {
            console.log('\n⚠️  No products found! Check selectors in selectors.ts');
        }

        console.log('\n' + '='.repeat(70));
        console.log('✨ Test complete!');

    } catch (error) {
        console.error('\n❌ Error during testing:', error);
        process.exit(1);
    }
}

// Run the test
main().catch(console.error);