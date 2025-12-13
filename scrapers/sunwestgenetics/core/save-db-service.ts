/**
 * Database Service for SunWest Genetics Product List Scraper
 * 
 * Handles saving product data to PostgreSQL using Prisma ORM
 * Implements schema: Seller → SeedProductCategory → SeedProduct
 * 
 * @usage
 * ```typescript
 * const dbService = new SunWestGeneticsDbService(prisma);
 * const sellerId = await dbService.initializeSeller();
 * const categoryId = await dbService.getOrCreateCategory(sellerId, metadata);
 * await dbService.saveProductsToCategory(categoryId, products);
 * ```
 */

import type { CategoryMetadataFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { CannabisType, PrismaClient, StockStatus } from '@prisma/client';
import { parseCannabisType, parseSeedType } from '../utils/data-mappers';

const SELLER_NAME = 'SunWest Genetics';
const SELLER_URL = 'https://sunwestgenetics.com';
const SCRAPING_SOURCE_URL = 'https://sunwestgenetics.com/shop/';

export class SaveDbService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Initialize or get Seller record
     * Returns seller ID for use in subsequent operations
     */
    async initializeSeller(): Promise<string> {
        const seller = await this.prisma.seller.upsert({
            where: { name: SELLER_NAME },
            update: {
                lastScraped: new Date(),
                status: 'success',
                updatedAt: new Date(),
            },
            create: {
                name: SELLER_NAME,
                url: SELLER_URL,
                scrapingSourceUrl: SCRAPING_SOURCE_URL,
                isActive: true,
                lastScraped: new Date(),
                status: 'success',
            },
        });

        return seller.id;
    }

    /**
     * Get or create SeedProductCategory from CategoryMetadata
     * Returns category ID for saving products
     */
    async getOrCreateCategory(
        sellerId: string,
        metadata: CategoryMetadataFromCrawling
    ): Promise<string> {
        // Try to find existing category by slug
        let category = await this.prisma.seedProductCategory.findFirst({
            where: {
                sellerId,
                slug: metadata.slug
            },
        });

        if (!category) {
            // Create new category if not found
            category = await this.prisma.seedProductCategory.create({
                data: {
                    sellerId,
                    name: metadata.name,
                    slug: metadata.slug,
                },
            });
        } else {
            // Update existing category
            category = await this.prisma.seedProductCategory.update({
                where: { id: category.id },
                data: {
                    name: metadata.name,
                    updatedAt: new Date(),
                },
            });
        }

        return category.id;
    }

    /**
     * Save scraped products to a category
     * Upserts products and handles images and pricing
     */
    async saveProductsToCategory(
        categoryId: string,
        products: ProductCardDataFromCrawling[]
    ): Promise<{ saved: number; updated: number; errors: number }> {
        let saved = 0;
        let updated = 0;
        let errors = 0;

        console.log(`[SunWest DB] Processing ${products.length} products for category ${categoryId}`);

        for (const product of products) {
            try {
                // Parse seed type and cannabis type
                const seedType = parseSeedType(product.name);
                const cannabisType = parseCannabisType(product.strainType);

                // Prepare data matching Prisma SeedProduct schema exactly
                const productData = {
                    name: product.name,
                    slug: product.slug,
                    url: product.url,
                    description: undefined, // Could extract from product page later
                    seedType,
                    cannabisType,
                    thcMin: product.thcMin,
                    thcMax: product.thcMax,
                    thcText: product.thcLevel,
                    cbdMin: product.cbdMin,
                    cbdMax: product.cbdMax,
                    cbdText: product.cbdLevel,
                    stockStatus: StockStatus.IN_STOCK,
                };

                // Check if product exists
                const existingProduct = await this.prisma.seedProduct.findFirst({
                    where: {
                        categoryId,
                        slug: product.slug,
                    },
                });

                let seedProductId: string;

                if (existingProduct) {
                    // Update existing product
                    await this.prisma.seedProduct.update({
                        where: { id: existingProduct.id },
                        data: productData,
                    });
                    seedProductId = existingProduct.id;
                    updated++;
                    console.log(`[SunWest DB] Updated: ${product.name}`);
                } else {
                    // Create new product
                    const newProduct = await this.prisma.seedProduct.create({
                        data: {
                            ...productData,
                            categoryId,
                        },
                    });
                    seedProductId = newProduct.id;
                    saved++;
                    console.log(`[SunWest DB] Created: ${product.name}`);
                }

                // Handle pricing (delete old ones and create new)
                await this.prisma.pricing.deleteMany({
                    where: { seedProductId },
                });

                for (const pricing of product.pricings) {
                    await this.prisma.pricing.create({
                        data: {
                            seedProductId,
                            totalPrice: pricing.totalPrice,
                            packSize: pricing.packSize,
                            pricePerSeed: pricing.pricePerSeed,
                        },
                    });
                }

                // Handle product images
                if (product.imageUrl) {
                    await this.handleProductImage(seedProductId, product.imageUrl);
                }

            } catch (error) {
                console.error(`[SunWest DB] Error processing product ${product.name}:`, error);
                errors++;
            }
        }

        console.log(`[SunWest DB] Results: ${saved} saved, ${updated} updated, ${errors} errors`);
        return { saved, updated, errors };
    }

    /**
     * Handle product image saving using the correct schema
     */
    private async handleProductImage(seedProductId: string, imageUrl: string): Promise<void> {
        try {
            // First, create or get the image
            let image = await this.prisma.image.findUnique({
                where: { url: imageUrl },
            });

            if (!image) {
                image = await this.prisma.image.create({
                    data: {
                        url: imageUrl,
                        alt: `SunWest Genetics product image`,
                    },
                });
            }

            // Check if the seed product already has this image
            const existingProductImage = await this.prisma.seedProductImage.findUnique({
                where: {
                    seedProductId_imageId: {
                        seedProductId,
                        imageId: image.id,
                    },
                },
            });

            if (!existingProductImage) {
                await this.prisma.seedProductImage.create({
                    data: {
                        seedProductId,
                        imageId: image.id,
                        order: 0,
                        isPrimary: true,
                    },
                });
            }
        } catch (error) {
            console.error(`[SunWest DB] Error saving image for product ${seedProductId}:`, error);
        }
    }

    /**
     * Get scraping statistics for a seller
     */
    async getScrapingStats(sellerId: string): Promise<{
        totalCategories: number;
        totalProducts: number;
        lastScraped?: Date;
    }> {
        const [categoriesCount, productsCount, seller] = await Promise.all([
            this.prisma.seedProductCategory.count({
                where: { sellerId },
            }),
            this.prisma.seedProduct.count({
                where: {
                    category: { sellerId },
                },
            }),
            this.prisma.seller.findUnique({
                where: { id: sellerId },
                select: { lastScraped: true },
            }),
        ]);

        return {
            totalCategories: categoriesCount,
            totalProducts: productsCount,
            lastScraped: seller?.lastScraped || undefined,
        };
    }

    /**
     * Clean up old/inactive products
     */
    async cleanupOldProducts(categoryId: string, maxAge: number = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAge);

        const result = await this.prisma.seedProduct.updateMany({
            where: {
                categoryId,
                updatedAt: {
                    lt: cutoffDate,
                },
            },
            data: {
                stockStatus: StockStatus.OUT_OF_STOCK,
            },
        });

        console.log(`[SunWest DB] Marked ${result.count} old products as out of stock`);
        return result.count;
    }

    /**
     * Update seller status after scraping
     */
    async updateSellerStatus(sellerId: string, status: 'success' | 'error', message?: string): Promise<void> {
        await this.prisma.seller.update({
            where: { id: sellerId },
            data: {
                status,
                lastScraped: new Date(),
                updatedAt: new Date(),
                // Add message to notes if error
                ...(status === 'error' && message && { notes: message }),
            },
        });
    }
}