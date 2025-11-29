import { LeaflyScraper } from '../../scrapers/leafly/leafly-scraper';

/**
 * Simple test - chỉ scrape và log ra console
 */
async function main() {
    console.log('=== Starting Leafly Scraper Test ===\n');

    const scraper = new LeaflyScraper();
    const strains = await scraper.run();

    console.log('\n=== Results ===');
    console.log(`Total strains found: ${strains.length}\n`);

    // Log 3 strains đầu tiên
    strains.slice(0, 3).forEach((strain, index) => {
        console.log(`[${index + 1}] ${strain.name}`);
        console.log(`    Type: ${strain.type}`);
        console.log(`    THC: ${strain.thc || 'N/A'}%`);
        console.log(`    Effects: ${strain.effects.join(', ')}`);
        console.log(`    Flavors: ${strain.flavors.join(', ')}`);
        console.log('');
    });

    process.exit(0);
}

main().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
});
