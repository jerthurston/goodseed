import { prisma } from '@/lib/prisma';
import { log } from '@/lib/utils';
import { StockStatus, StrainType } from '@prisma/client';
import { LeaflyScraper } from './leafly/leafly-scraper';
import { LeaflySeedScraper } from './leafly/leafly-seed-scraper';
import { LeaflyStrainScraper } from './leafly/leafly-strain-scraper';
import type { SeedData } from './types';

// Export scrapers for direct use
export { LeaflySeedScraper, LeaflyStrainScraper };

/**
 * Main function để chạy tất cả scrapers
 */
export async function runAllScrapers() {
    log('=== Starting all scrapers ===');

    const scrapers = [
        new LeaflyScraper(),
        // Thêm scrapers khác ở đây
    ];

    for (const scraper of scrapers) {
        try {
            const strains = await scraper.run();
            await saveStrainsToDB(strains);
        } catch (error: any) {
            console.error(`Scraper failed:`, error.message);
        }
    }

    log('=== All scrapers completed ===');
}

/**
 * Save hoặc update strains vào database
 */
async function saveStrainsToDB(strains: any[]) {
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
                // Update nếu đã tồn tại
                await prisma.cannabisStrain.update({
                    where: { slug: strain.slug },
                    data: {
                        thcRange: strain.thcRange,
                        cbdRange: strain.cbdRange,
                        description: strain.description,
                        flavors: strain.flavors,
                        thc: strain.thc,
                        updatedAt: new Date(),
                    },
                });
                updated++;
            } else {
                // Tạo mới
                await prisma.cannabisStrain.create({
                    data: {
                        name: strain.name,
                        slug: strain.slug,
                        type: strain.type || StrainType.HYBRID,
                        thcRange: strain.thcRange,
                        cbdRange: strain.cbdRange,
                        description: strain.description,
                        flavors: strain.flavors || [],
                        thc: strain.thc,
                    },
                });
                created++;
            }
        } catch (error: any) {
            console.error(`Error saving strain ${strain.name}:`, error.message);
            skipped++;
        }
    }

    log(`DB Results: ${created} created, ${updated} updated, ${skipped} skipped`);
}

/**
 * Save seeds to database from scraper (MVP version for GoodSeed)
 * @param seeds - Array of seed data from scraper
 * @param sellerId - Seller ID (required)
 */
export async function saveSeedsToDB(
    seeds: SeedData[],
    sellerId: string
) {
    log(`Saving ${seeds.length} seeds to database...`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const seedData of seeds) {
        try {
            if (!sellerId) {
                console.warn(`Skipping seed ${seedData.name}: No seller ID`);
                skipped++;
                continue;
            }

            // Calculate price per seed if not provided
            const pricePerSeed = seedData.pricePerSeed ||
                (seedData.totalPrice / seedData.packSize);

            // Prepare seed data
            const seedPayload = {
                sellerId,
                name: seedData.name,
                slug: seedData.slug,
                url: seedData.url,
                totalPrice: seedData.totalPrice,
                packSize: seedData.packSize,
                pricePerSeed,
                stockStatus: seedData.stockStatus || StockStatus.IN_STOCK,
                seedType: seedData.seedType,
                cannabisType: seedData.cannabisType,
                photoperiodType: seedData.photoperiodType,
                thcMin: seedData.thcMin,
                thcMax: seedData.thcMax,
                cbdMin: seedData.cbdMin,
                cbdMax: seedData.cbdMax,
                updatedAt: new Date(),
            };

            // Upsert seed
            const seed = await prisma.seed.upsert({
                where: {
                    sellerId_slug: {
                        sellerId,
                        slug: seedData.slug,
                    },
                },
                update: seedPayload,
                create: seedPayload,
            });

            // Handle image if provided
            if (seedData.imageUrl) {
                try {
                    // Check if image already exists
                    let image = await prisma.image.findFirst({
                        where: { url: seedData.imageUrl },
                    });

                    // Create image if not exists
                    if (!image) {
                        image = await prisma.image.create({
                            data: {
                                url: seedData.imageUrl,
                                alt: `${seedData.name} seed image`,
                            },
                        });
                    }

                    // Check if SeedImage relation already exists
                    const existingSeedImage = await prisma.seedImage.findUnique({
                        where: {
                            seedId_imageId: {
                                seedId: seed.id,
                                imageId: image.id,
                            },
                        },
                    });

                    // Create SeedImage relation if not exists
                    if (!existingSeedImage) {
                        await prisma.seedImage.create({
                            data: {
                                seedId: seed.id,
                                imageId: image.id,
                                isPrimary: true, // First image is primary
                                order: 0,
                            },
                        });
                    }
                } catch (imageError: unknown) {
                    const errorMessage = imageError instanceof Error ? imageError.message : 'Unknown error';
                    console.error(`Error saving image for ${seedData.name}:`, errorMessage);
                }
            }

            // Check if it was an update or create
            const existing = await prisma.seed.findFirst({
                where: {
                    sellerId,
                    slug: seedData.slug,
                    createdAt: { lt: new Date(Date.now() - 1000) }, // Created more than 1 second ago
                },
            });

            if (existing) {
                updated++;
            } else {
                created++;
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Error saving seed ${seedData.name}:`, errorMessage);
            skipped++;
        }
    }

    log(`Seed DB Results: ${created} created, ${updated} updated, ${skipped} skipped`);
}

/**
 * Run a specific scraper by name
 */
export async function runScraper(name: string, startPage?: number, endPage?: number) {
    const scrapers: Record<string, any> = {
        leafly: LeaflyScraper,
        // Thêm scrapers khác
    };

    const ScraperClass = scrapers[name.toLowerCase()];
    if (!ScraperClass) {
        throw new Error(`Scraper "${name}" not found`);
    }

    const scraper = new ScraperClass(startPage, endPage);
    const strains = await scraper.run();
    await saveStrainsToDB(strains);
}

/**
 * Run seed scraper (MVP version for GoodSeed)
 * @param sellerId - Seller ID from database
 * @param startPage - Starting page number
 * @param endPage - Ending page number
 * @param location - Optional location parameter for Leafly
 */
export async function runSeedScraper(
    sellerId: string,
    startPage?: number,
    endPage?: number,
    location?: string
) {
    log(`=== Starting Leafly Seed Scraper (MVP) ===`);

    const scraper = new LeaflySeedScraper({
        startPage: startPage || 1,
        endPage: endPage || 5,
        location, // Optional - global shop if not provided
    });

    const seeds = await scraper.run();
    await saveSeedsToDB(seeds, sellerId);

    log(`=== Seed scraping completed ===`);
}
