import { log } from '@/lib/utils';
import { saveProductsToDB } from '@/scrapers';
import { LeaflyShopScraper } from '@/scrapers/leafly/leafly-shop-scraper';
import 'dotenv/config';

async function testGlobalShop() {
    const startPage = parseInt(process.argv[2] || '300');
    const endPage = parseInt(process.argv[3] || '300');

    console.log(`\n=== Testing Leafly Global Shop (No Location) ===`);
    console.log(`Pages: ${startPage} to ${endPage}\n`);

    const scraper = new LeaflyShopScraper({
        startPage,
        endPage,
        dispensaryId: '', // Will be set per product if needed
        // No location parameter = global shop
    });

    try {
        const products = await scraper.scrape();

        console.log(`\n=== Scraping Results ===`);
        console.log(`Total products found: ${products.length}`);

        // Count products with images
        const withImages = products.filter(p => p.imageUrl).length;
        console.log(`Products with images: ${withImages}`);
        console.log(`Products without images: ${products.length - withImages}`);

        // Show sample products
        console.log(`\n=== Sample Products ===`);
        products.slice(0, 5).forEach((p, i) => {
            console.log(`${i + 1}. ${p.name}`);
            console.log(`   Brand: ${p.brand}`);
            console.log(`   Price: $${p.price}`);
            console.log(`   Image: ${p.imageUrl ? '✅ ' + p.imageUrl.substring(0, 60) + '...' : '❌ No image'}`);
            console.log('');
        });

        // Optional: Save to DB with a test dispensary
        if (process.argv.includes('--save')) {
            const { prisma } = await import('@/lib/prisma');
            const dispensary = await prisma.dispensary.findFirst();
            if (dispensary && products.length > 0) {
                log(`Saving ${products.length} products to DB for testing...`);
                await saveProductsToDB(products, dispensary.id);
            }
        }

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testGlobalShop()
    .then(() => {
        console.log('\n✅ Test complete!');
        process.exit(0);
    })
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    });
