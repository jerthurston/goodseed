/**
 * Test Leafly Strains Scraper
 * Usage: pnpm tsx scripts/test/test-leafly-strains.ts [startPage] [endPage] [--save]
 * Example: pnpm tsx scripts/test/test-leafly-strains.ts 1 2 --save
 */
import 'dotenv/config';

async function testLeaflyStrains() {
    const startPage = parseInt(process.argv[2] || '1');
    const endPage = parseInt(process.argv[3] || '1');
    const shouldSave = process.argv.includes('--save');

    console.log(`\n=== Testing Leafly Strains Scraper ===`);
    console.log(`Pages: ${startPage} to ${endPage}`);
    console.log(`Save to DB: ${shouldSave ? 'YES' : 'NO'}\n`);

    // Import scraper
    const { LeaflyStrainScraper } = await import('../../scrapers/leafly/leafly-strain-scraper');

    const scraper = new LeaflyStrainScraper({
        startPage,
        endPage,
        strainType: 'all', // Can be: 'all', 'indica', 'sativa', 'hybrid'
    });

    try {
        console.log('🔄 Scraping Leafly Strains...\n');
        const seeds = await scraper.scrape();

        console.log(`\n=== Scraping Results ===`);
        console.log(`Total strains found: ${seeds.length}`);

        // Count seeds with images
        const withImages = seeds.filter(s => s.imageUrl).length;
        console.log(`Strains with images: ${withImages}`);
        console.log(`Strains without images: ${seeds.length - withImages}`);

        // Group by cannabis type
        const byType = {
            INDICA: seeds.filter(s => s.cannabisType === 'INDICA').length,
            SATIVA: seeds.filter(s => s.cannabisType === 'SATIVA').length,
            HYBRID: seeds.filter(s => s.cannabisType === 'HYBRID').length,
            UNKNOWN: seeds.filter(s => !s.cannabisType).length,
        };
        console.log(`\nBy Type:`);
        console.log(`  Indica: ${byType.INDICA}`);
        console.log(`  Sativa: ${byType.SATIVA}`);
        console.log(`  Hybrid: ${byType.HYBRID}`);
        console.log(`  Unknown: ${byType.UNKNOWN}`);

        // Show sample strains
        console.log(`\n=== Sample Strains (first 10) ===`);
        seeds.slice(0, 10).forEach((s, i) => {
            console.log(`${i + 1}. ${s.name}`);
            console.log(`   Type: ${s.cannabisType || 'N/A'}`);
            console.log(`   THC: ${s.thcMin || 'N/A'}${s.thcMax ? `-${s.thcMax}` : ''}%`);
            console.log(`   CBD: ${s.cbdMin || 'N/A'}${s.cbdMax ? `-${s.cbdMax}` : ''}%`);
            console.log(`   Image: ${s.imageUrl ? '✅' : '❌'}`);
            console.log(`   URL: ${s.url}`);
            console.log('');
        });

        // Save to DB if requested
        if (shouldSave && seeds.length > 0) {
            console.log(`\n💾 Saving ${seeds.length} strains to database...`);
            console.log('⚠️  Note: You need to provide a sellerId first');
            console.log('Run: pnpm tsx scripts/seed/seed-sellers.ts');
            console.log('Then use the seller ID with --seller-id flag\n');

            // Check if seller ID provided
            const sellerIdIndex = process.argv.indexOf('--seller-id');
            if (sellerIdIndex !== -1 && process.argv[sellerIdIndex + 1]) {
                const sellerId = process.argv[sellerIdIndex + 1];
                const { saveSeedsToDB } = await import('../../scrapers');
                await saveSeedsToDB(seeds, sellerId);
                console.log('✅ Strains saved to database as seeds!');
            } else {
                console.log('❌ No --seller-id provided. Data not saved.');
            }
        }

    } catch (error) {
        console.error('\n❌ Error during scraping:', error);
        process.exit(1);
    }
}

testLeaflyStrains()
    .then(() => {
        console.log('\n✅ Test complete!');
        process.exit(0);
    })
    .catch((e) => {
        console.error('❌ Fatal error:', e);
        process.exit(1);
    });
