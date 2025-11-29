import { prisma } from '@/lib/prisma';
import { log } from '@/lib/utils';
import { runProductScraper } from '@/scrapers';
import 'dotenv/config';

/**
 * Test script for product scraper
 * Usage: pnpm test:products [dispensaryId] [startPage] [endPage]
 */

async function main() {
    try {
        // Get dispensary ID from args or use default
        const dispensaryArg = process.argv[2];
        const startPage = parseInt(process.argv[3] || '1');
        const endPage = parseInt(process.argv[4] || '2');

        let dispensaryId: string;

        if (dispensaryArg) {
            // Try to find dispensary by slug or ID
            const dispensary = await prisma.dispensary.findFirst({
                where: {
                    OR: [
                        { id: dispensaryArg },
                        { slug: dispensaryArg },
                    ],
                },
            });

            if (!dispensary) {
                console.error(`\u274c Dispensary not found: ${dispensaryArg}`);
                console.log('\nAvailable dispensaries:');
                const all = await prisma.dispensary.findMany({
                    select: { id: true, slug: true, name: true },
                });
                all.forEach((d) => {
                    console.log(`  - ${d.slug} (${d.name}) [ID: ${d.id}]`);
                });
                process.exit(1);
            }

            dispensaryId = dispensary.id;
            log(`Using dispensary: ${dispensary.name} (${dispensary.slug})`);
        } else {
            // Use first dispensary
            const firstDispensary = await prisma.dispensary.findFirst();
            if (!firstDispensary) {
                console.error('\u274c No dispensaries found. Please run: pnpm db:seed:dispensaries');
                process.exit(1);
            }
            dispensaryId = firstDispensary.id;
            log(`Using default dispensary: ${firstDispensary.name}`);
        }

        log(`Scraping pages ${startPage} to ${endPage}...`);

        // Run product scraper
        await runProductScraper(dispensaryId, startPage, endPage);

        // Show results
        log('\n=== Scraping Results ===');
        const productCount = await prisma.dispensaryProduct.count({
            where: { dispensaryId },
        });
        log(`Total products for this dispensary: ${productCount}`);

        // Show recent products
        const recentProducts = await prisma.dispensaryProduct.findMany({
            where: { dispensaryId },
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
                name: true,
                brand: true,
                type: true,
                price: true,
                thc: true,
                isAvailable: true,
            },
        });

        log('\nRecent products:');
        recentProducts.forEach((p) => {
            log(`  - ${p.name} (${p.brand || 'No brand'}) - $${p.price} - THC: ${p.thc || 'N/A'}% - ${p.isAvailable ? '\u2705 In Stock' : '\u274c Out of Stock'}`);
        });

    } catch (error) {
        console.error('\u274c Error:', error);
        process.exit(1);
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
