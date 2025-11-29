import { prisma } from '@/lib/prisma';
import { log, slugify } from '@/lib/utils';
import { LeaflyScraper } from './leafly/leafly-scraper';
import { LeaflyShopScraper } from './leafly/leafly-shop-scraper';

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
 * Save products to database with upsert logic
 */
export async function saveProductsToDB(products: DispensaryProductData[], dispensaryId?: string) {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const productData of products) {
        try {
            // Use provided dispensaryId or from product data
            const finalDispensaryId = dispensaryId || productData.dispensaryId;

            if (!finalDispensaryId) {
                log(`⚠️  Skipping product ${productData.name}: No dispensary ID`);
                skipped++;
                continue;
            }

            // Try to match with existing strain
            let strainId: string | undefined;
            if (productData.strainName) {
                const strain = await prisma.cannabisStrain.findFirst({
                    where: {
                        OR: [
                            { slug: slugify(productData.strainName) },
                            { name: { contains: productData.strainName, mode: 'insensitive' } },
                        ],
                    },
                });
                strainId = strain?.id;
            }

            // Prepare product data
            const productPayload = {
                dispensaryId: finalDispensaryId,
                name: productData.name,
                slug: productData.slug,
                brand: productData.brand,
                type: productData.type as ProductType,
                thc: productData.thc,
                cbd: productData.cbd,
                weight: productData.weight,
                price: productData.price,
                compareAtPrice: productData.compareAtPrice,
                quantity: productData.quantity,
                isAvailable: productData.isAvailable,
                description: productData.description,
                effects: productData.effects || [],
                flavors: productData.flavors || [],
                terpenes: productData.terpenes || [],
                strainId,
                updatedAt: new Date(),
            };

            // Upsert product
            const product = await prisma.dispensaryProduct.upsert({
                where: {
                    dispensaryId_slug: {
                        dispensaryId: finalDispensaryId,
                        slug: productData.slug,
                    },
                },
                update: productPayload,
                create: productPayload,
            });

            // Handle image if provided
            if (productData.imageUrl) {
                try {
                    // Check if image already exists
                    let image = await prisma.image.findFirst({
                        where: { url: productData.imageUrl },
                    });

                    // Create image if not exists
                    if (!image) {
                        image = await prisma.image.create({
                            data: {
                                url: productData.imageUrl,
                                alt: `${productData.name} product image`,
                            },
                        });
                    }

                    // Check if ProductImage relation already exists
                    const existingProductImage = await prisma.productImage.findUnique({
                        where: {
                            productId_imageId: {
                                productId: product.id,
                                imageId: image.id,
                            },
                        },
                    });

                    // Create ProductImage relation if not exists
                    if (!existingProductImage) {
                        await prisma.productImage.create({
                            data: {
                                productId: product.id,
                                imageId: image.id,
                                isPrimary: true, // First image is primary
                                order: 0,
                            },
                        });
                    }
                } catch (imageError: unknown) {
                    const errorMessage = imageError instanceof Error ? imageError.message : 'Unknown error';
                    console.error(`Error saving image for ${productData.name}:`, errorMessage);
                }
            }

            // Check if it was an update or create
            const existing = await prisma.product.findFirst({
                where: {
                    sellerId,
                    slug: productData.slug,
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
            console.error(`Error saving product ${productData.name}:`, errorMessage);
            skipped++;
        }
    }

    log(`Product DB Results: ${created} created, ${updated} updated, ${skipped} skipped`);
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
 * Run product scraper
 * @param sellerId - Seller ID from database
 * @param startPage - Starting page number
 * @param endPage - Ending page number
 * @param location - Optional location parameter for Leafly
 */
export async function runProductScraper(
    sellerId: string,
    startPage?: number,
    endPage?: number,
    location?: string
) {
    log(`=== Starting Leafly Shop Product Scraper ===`);

    const scraper = new LeaflyShopScraper({
        startPage: startPage || 1,
        endPage: endPage || 5,
        location, // Optional - global shop if not provided
    });

    const products = await scraper.run();
    await saveProductsToDB(products, sellerId);

    log(`=== Product scraping completed ===`);
}
