/**
 * Database Service for Vancouver Seed Bank Product List Scraper
 * 
 * Handles saving product data to PostgreSQL using Prisma ORM
 * Implements schema: Seller → SeedProductCategory → SeedProduct
 * 
 * @usage
 * ```typescript
 * const dbService = new VancouverSeedBankDbService(prisma);
 * const sellerId = await dbService.initializeSeller();
 * const categoryId = await dbService.getOrCreateCategory(sellerId, metadata);
 * await dbService.saveProductsToCategory(categoryId, products);
 * ```
 */

import type { CategoryMetadataFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { CannabisType, PrismaClient, StockStatus } from '@prisma/client';
const SELLER_NAME = 'Vancouver Seed Bank';
const SELLER_URL = 'https://vancouverseedbank.ca';

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
     * Upserts products and handles images
     */
    async saveProductsToCategory(
        categoryId: string,
        products: ProductCardDataFromCrawling[]
    ): Promise<{ saved: number; updated: number; errors: number }> {
        let saved = 0;
        let updated = 0;
        let errors = 0;

        console.log(`sample initial products data with length = 3:`, products.slice(0, 3));

        for (const product of products) {
            try {
                // Kiểm tra slug của product đã tồn tại chưa, nếu chưa thì tạo mới, nếu đã có thì update bằng upsert
                const existing = await this.prisma.seedProduct.findUnique({
                    where: {
                        categoryId_slug: {
                            categoryId,
                            slug: product.slug,
                        },
                    },
                });

                // product đã tồn tại - Upsert product
                const savedProduct = await this.prisma.seedProduct.upsert({
                    where: {
                        categoryId_slug: {
                            categoryId,
                            slug: product.slug,
                        },
                    },
                    update: {
                        name: product.name,
                        url: product.url,
                        description: product.strainType || null,
                        stockStatus: StockStatus.IN_STOCK,
                        variety: product.strainType || null,
                        thcMin: product.thcMin,
                        thcMax: product.thcMax,
                        thcText: product.thcLevel || null,
                        cbdMin: product.cbdMin,
                        cbdMax: product.cbdMax,
                        cbdText: product.cbdLevel || null,
                        updatedAt: new Date(),
                    },
                    create: {
                        categoryId,
                        name: product.name,
                        slug: product.slug,
                        url: product.url,
                        description: product.strainType || null,
                        stockStatus: StockStatus.IN_STOCK,
                        variety: product.strainType || null,
                        thcMin: product.thcMin,
                        thcMax: product.thcMax,
                        thcText: product.thcLevel || null,
                        cbdMin: product.cbdMin,
                        cbdMax: product.cbdMax,
                        cbdText: product.cbdLevel || null,
                    },
                });

                // Upsert all pricing variations (5 seeds, 10 seeds, 25 seeds)
                if (product.pricings && product.pricings.length > 0) {
                    for (const pricing of product.pricings) {
                        const existingPricing = await this.prisma.pricing.findFirst({
                            where: {
                                seedProductId: savedProduct.id,
                                packSize: pricing.packSize,
                            }
                        });

                        if (existingPricing) {
                            await this.prisma.pricing.update({
                                where: { id: existingPricing.id },
                                data: {
                                    totalPrice: pricing.totalPrice,
                                    packSize: pricing.packSize,
                                    pricePerSeed: pricing.pricePerSeed,
                                }
                            });
                        } else {
                            await this.prisma.pricing.create({
                                data: {
                                    seedProductId: savedProduct.id,
                                    totalPrice: pricing.totalPrice,
                                    packSize: pricing.packSize,
                                    pricePerSeed: pricing.pricePerSeed,
                                }
                            });
                        }
                    }
                }

                // Handle image
                if (product.imageUrl) {
                    await this.saveProductImage(savedProduct.id, product.imageUrl);
                }

                if (existing) {
                    updated++;
                } else {
                    saved++;
                }
            } catch (error) {
                console.error(`Error saving product ${product.name}:`, error);
                errors++;
            }
        }

        return { saved, updated, errors };
    }

    /**
     * Save or link product image
     */
    private async saveProductImage(
        productId: string,
        imageUrl: string
    ): Promise<void> {
        // Upsert image
        const image = await this.prisma.image.upsert({
            where: { url: imageUrl },
            update: {},
            create: {
                url: imageUrl,
                alt: null,
            },
        });

        // Create product-image link if not exists
        await this.prisma.seedProductImage.upsert({
            where: {
                seedProductId_imageId: {
                    seedProductId: productId,
                    imageId: image.id,
                },
            },
            update: {},
            create: {
                seedProductId: productId,
                imageId: image.id,
                order: 0,
                isPrimary: true,
            },
        });
    }

    /**
     * Log scraping activity
     */
    async logScrapeActivity(
        sellerId: string,
        status: 'success' | 'error',
        productsFound: number,
        duration: number,
        errors?: Record<string, unknown>
    ): Promise<void> {
        await this.prisma.scrapeLog.create({
            data: {
                sellerId,
                status,
                productsFound,
                duration,
                errors: errors ? JSON.parse(JSON.stringify(errors)) : null,
            },
        });
    }

    /**
     * Map strain type to cannabis type enum
     */
    private mapCannabisType(strainType: string | undefined): CannabisType | null {
        if (!strainType) return null;

        const typeLower = strainType.toLowerCase();
        if (typeLower.includes('sativa')) return CannabisType.SATIVA;
        if (typeLower.includes('indica')) return CannabisType.INDICA;
        if (typeLower.includes('hybrid')) return CannabisType.HYBRID;

        return null;
    }

    /**
     * Get summary statistics for a seller
     */
    async getSellerStats(sellerId: string) {
        const [categoryCount, productCount, lastScrape] = await Promise.all([
            this.prisma.seedProductCategory.count({
                where: { sellerId },
            }),
            this.prisma.seedProduct.count({
                where: {
                    category: {
                        sellerId,
                    },
                },
            }),
            this.prisma.seller.findUnique({
                where: { id: sellerId },
                select: { lastScraped: true, status: true },
            }),
        ]);

        return {
            categories: categoryCount,
            products: productCount,
            lastScraped: lastScrape?.lastScraped,
            status: lastScrape?.status,
        };
    }
}
