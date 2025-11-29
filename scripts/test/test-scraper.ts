import { runAllScrapers, runScraper } from '@/scrapers';
import 'dotenv/config';

/**
 * Script để test scraper
 * Chạy: pnpm scraper hoặc pnpm scraper:leafly
 */
async function main() {
    const scraperName = process.argv[2] || 'all';

    console.log(`Running scraper: ${scraperName}`);

    if (scraperName === 'all') {
        await runAllScrapers();
    } else {
        await runScraper(scraperName);
    }

    process.exit(0);
}

main().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
});
