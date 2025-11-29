/**
 * Test script for scraping Leafly Shop seeds (MVP version)
 * Usage: pnpm tsx scripts/test/test-mvp-scraper.ts <sellerId> <startPage> <endPage> [--save]
 * Example: pnpm tsx scripts/test/test-mvp-scraper.ts cmii2ai2x0000assboe1156dg 300 300 --save
 */
import 'dotenv/config';

async function testMVPScraper() {
    const sellerId = process.argv[2];
    const startPage = parseInt(process.argv[3] || '1');
    const endPage = parseInt(process.argv[4] || '1');
    const shouldSave = process.argv.includes('--save');

    if (!sellerId) {
        console.error('❌ Error: sellerId is required');
        console.log('\nUsage: pnpm tsx scripts/test/test-mvp-scraper.ts <sellerId> <startPage> <endPage> [--save]');
        console.log('Example: pnpm tsx scripts/test/test-mvp-scraper.ts cmii2ai2x0000assboe1156dg 300 300 --save');
        console.log('\nTo get sellerId, run: pnpm tsx scripts/seed/seed-sellers.ts');
        process.exit(1);
    }

    console.log(`\n=== Testing Leafly Shop Scraper (MVP) ===`);
    console.log(`Seller ID: ${sellerId}`);
    console.log(`Pages: ${startPage} to ${endPage}`);
    console.log(`Save to DB: ${shouldSave ? 'YES' : 'NO'}\n`);

    // Import scraper (dynamic to avoid early initialization)
    const { LeaflySeedScraper } = await import('../../scrapers/leafly/leafly-seed-scraper');

    const scraper = new LeaflySeedScraper({
        startPage,
        endPage,
        // No location = global shop with more products
    });

    try {
        console.log('🔄 Scraping...\n');
        const seeds = await scraper.scrape();

        console.log(`\n=== Scraping Results ===`);
        console.log(`Total seeds found: ${seeds.length}`);

        // Count seeds with images
        const withImages = seeds.filter(s => s.imageUrl).length;
        console.log(`Seeds with images: ${withImages}`);
        console.log(`Seeds without images: ${seeds.length - withImages}`);

        // Show sample seeds
        console.log(`\n=== Sample Seeds (first 5) ===`);
        seeds.slice(0, 5).forEach((s, i) => {
            console.log(`${i + 1}. ${s.name}`);
            console.log(`   URL: ${s.url}`);
            console.log(`   Price: $${s.totalPrice} (${s.packSize} seeds)`);
            console.log(`   Price per seed: $${(s.totalPrice / s.packSize).toFixed(2)}`);
            console.log(`   Stock: ${s.stockStatus || 'IN_STOCK'}`);
            console.log(`   Seed Type: ${s.seedType || 'N/A'}`);
            console.log(`   Cannabis Type: ${s.cannabisType || 'N/A'}`);
            console.log(`   THC: ${s.thcMin || 'N/A'}${s.thcMax ? `-${s.thcMax}` : ''}%`);
            console.log(`   CBD: ${s.cbdMin || 'N/A'}${s.cbdMax ? `-${s.cbdMax}` : ''}%`);
            console.log(`   Image: ${s.imageUrl ? '✅ ' + s.imageUrl.substring(0, 60) + '...' : '❌ No image'}`);
            console.log('');
        });

        // Save to DB if requested
        if (shouldSave && seeds.length > 0) {
            console.log(`\n💾 Saving ${seeds.length} seeds to database...`);
            const { saveSeedsToDB } = await import('../../scrapers');
            await saveSeedsToDB(seeds, sellerId);
            console.log('✅ Seeds saved to database!');
        }

    } catch (error) {
        console.error('\n❌ Error during scraping:', error);
        process.exit(1);
    }
}

testMVPScraper()
    .then(() => {
        console.log('\n✅ Test complete!');
        process.exit(0);
    })
    .catch((e) => {
        console.error('❌ Fatal error:', e);
        process.exit(1);
    });