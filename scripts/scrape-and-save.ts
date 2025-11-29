import 'dotenv/config';
import { LeaflyScraper } from '../scrapers/leafly/leafly-scraper';

// Import Prisma trực tiếp thay vì qua lib
import { PrismaClient, StrainType } from '@prisma/client';

const prisma = new PrismaClient({
    log: ['error', 'warn'],
});

/**
 * Test scraper và lưu vào database
 */
async function main() {
    console.log('=== Starting Leafly Scraper with DB Save ===\n');

    try {
        // 1. Scrape data
        const scraper = new LeaflyScraper();
        const strains = await scraper.run();

        console.log(`\n=== Scraped ${strains.length} strains ===`);

        // 2. Save to database
        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const strain of strains) {
            try {
                // Kiểm tra strain đã tồn tại chưa
                const existing = await prisma.cannabisStrain.findUnique({
                    where: { slug: strain.slug },
                });

                if (existing) {
                    // Update
                    await prisma.cannabisStrain.update({
                        where: { slug: strain.slug },
                        data: {
                            name: strain.name,
                            type: strain.type,
                            thc: strain.thc,
                            updatedAt: new Date(),
                        },
                    });
                    updated++;
                    console.log(`✓ Updated: ${strain.name}`);
                } else {
                    // Create
                    await prisma.cannabisStrain.create({
                        data: {
                            name: strain.name,
                            slug: strain.slug,
                            type: strain.type || StrainType.HYBRID,
                            thc: strain.thc,
                            flavors: strain.flavors || [],
                        },
                    });
                    created++;
                    console.log(`✓ Created: ${strain.name}`);
                }
            } catch (error: any) {
                console.error(`✗ Error saving ${strain.name}:`, error.message);
                skipped++;
            }
        }

        console.log('\n=== Database Results ===');
        console.log(`✓ Created: ${created}`);
        console.log(`✓ Updated: ${updated}`);
        console.log(`✗ Skipped: ${skipped}`);

    } catch (error) {
        console.error('Script failed:', error);
    } finally {
        await prisma.$disconnect();
    }

    process.exit(0);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
