/**
 * Test Script for Seed Supreme Product Scraper (Crawlee)
 * 
 * Tests the product detail scraper with sample product URLs
 * 
 * Usage:
 *   pnpm tsx scripts/test/test-seedsupreme-product.ts
 *   pnpm tsx scripts/test/test-seedsupreme-product.ts <product-url>
 */

import { SeedSupremeProductScraper } from '../../scrapers/seedsupreme/product-scraper';

// Sample product URLs for testing
const SAMPLE_PRODUCTS = [
    'https://seedsupreme.com/fruity-pebbles-feminized.html',
    'https://seedsupreme.com/blue-dream-feminized.html',
    'https://seedsupreme.com/godfather-og-feminized.html',
];

async function main() {
    console.log('============================================================');
    console.log('Seed Supreme Product Scraper Test (Crawlee)');
    console.log('============================================================\n');

    // Get product URLs from command line or use samples
    const productUrls = process.argv.slice(2).length > 0
        ? process.argv.slice(2)
        : SAMPLE_PRODUCTS;

    console.log(`Testing with ${productUrls.length} product(s):`);
    productUrls.forEach((url, i) => {
        console.log(`  ${i + 1}. ${url}`);
    });
    console.log('');

    try {
        const scraper = new SeedSupremeProductScraper();
        const startTime = Date.now();

        // Scrape products
        const products = await scraper.scrapeProducts(productUrls);

        const duration = Date.now() - startTime;

        // Display results
        console.log('\n============================================================');
        console.log('=== Results ===');
        console.log('============================================================');
        console.log(`Total Products: ${products.length}`);
        console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
        console.log(`Average per product: ${(duration / products.length / 1000).toFixed(2)}s`);

        // Analytics
        const withPackOptions = products.filter(p => p.packOptions.length > 0);
        const withSpecs = products.filter(p => p.specs.variety || p.specs.thcContent);
        const withDescription = products.filter(p => p.description);

        console.log('\n=== Data Completeness ===');
        console.log(`With Pack Options: ${withPackOptions.length}/${products.length}`);
        console.log(`With Specifications: ${withSpecs.length}/${products.length}`);
        console.log(`With Description: ${withDescription.length}/${products.length}`);

        // Display each product
        products.forEach((product, i) => {
            console.log(`\n=== Product ${i + 1}: ${product.name} ===`);
            console.log(`URL: ${product.url}`);
            console.log(`Slug: ${product.slug}`);

            if (product.basePrice) {
                console.log(`Base Price: ${product.basePrice}`);
            }

            // Pack options
            if (product.packOptions.length > 0) {
                console.log('\nPack Options:');
                product.packOptions.forEach(pack => {
                    const discountText = pack.discount ? ` (${pack.discount}% off from $${pack.originalPrice?.toFixed(2)})` : '';
                    console.log(`  • ${pack.packSize}x seeds: $${pack.totalPrice.toFixed(2)}${discountText}`);
                    console.log(`    Price per seed: $${pack.pricePerSeed.toFixed(2)}`);
                });
            } else {
                console.log('\n⚠️  No pack options found');
            }

            // Specifications
            console.log('\nSpecifications:');
            const specs = product.specs;
            if (specs.variety) console.log(`  Variety: ${specs.variety}`);
            if (specs.thcContent) console.log(`  THC: ${specs.thcContent}`);
            if (specs.cbdContent) console.log(`  CBD: ${specs.cbdContent}`);
            if (specs.floweringType) console.log(`  Flowering: ${specs.floweringType}`);
            if (specs.floweringPeriod) console.log(`  Flowering Period: ${specs.floweringPeriod}`);
            if (specs.geneticProfile) console.log(`  Genetics: ${specs.geneticProfile}`);
            if (specs.yieldIndoor) console.log(`  Yield Indoor: ${specs.yieldIndoor}`);
            if (specs.yieldOutdoor) console.log(`  Yield Outdoor: ${specs.yieldOutdoor}`);

            // Check for missing specs
            const missingSpecs = [];
            if (!specs.variety) missingSpecs.push('Variety');
            if (!specs.thcContent) missingSpecs.push('THC');
            if (!specs.geneticProfile) missingSpecs.push('Genetics');

            if (missingSpecs.length > 0) {
                console.log(`  ⚠️  Missing: ${missingSpecs.join(', ')}`);
            }

            // Description preview
            if (product.description) {
                const preview = product.description.substring(0, 150);
                console.log(`\nDescription: ${preview}${product.description.length > 150 ? '...' : ''}`);
            }

            // Image
            if (product.imageUrl) {
                console.log(`\nImage: ${product.imageUrl}`);
            }
        });

        console.log('\n============================================================');
        console.log('✅ Test Complete!');
        console.log('============================================================');
        console.log('\n💾 Crawlee storage: ./storage/datasets/default/');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

main();
