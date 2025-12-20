/**
 * Database Service for SunWest Genetics Product List Scraper
 * 
 * Handles saving product data to PostgreSQL using Prisma ORM
 * Implements schema: Seller → SeedProductCategory → SeedProduct
 * 
 * @usage
 * ```typescript
 * const dbService = new SaveDbService(prisma);
 * await dbService.initializeSeller(sellerId);
 * const categoryId = await dbService.getOrCreateCategory(metadata);
 * await dbService.saveProductsToDatabase(products);
 * ```
 */

import type { CategoryMetadataFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { PrismaClient, Seller, StockStatus } from '@prisma/client';
import { parseCannabisType, parseSeedType } from '../utils/data-mappers';
import { apiLogger } from '@/lib/helpers/api-logger';
import { ISaveDbService } from '@/lib/factories/scraper-factory';

export class SaveDbService implements ISaveDbService {
    private seller: Seller | null = null;

    constructor(private prisma: PrismaClient) {}

    /**
     * Initialize service with seller data from database
     * @param sellerId
     */
    async initializeSeller(sellerId: string): Promise<void> {
        // Vì prisma là singleton nên cần dùng this.prisma nếu muốn lưu status cho seller
        try {
            const seller = await this.prisma.seller.findUnique({
                where: { id: sellerId },
                select: {
                    id: true,
                    name: true,
                    url: true,
                    isActive: true,
                    status: true,
                    affiliateTag: true,
                    autoScrapeInterval: true,
                    lastScraped: true,
                    createdAt: true,
                    updatedAt: true
                    // Exclude scrapingSourceUrl to avoid type mismatch
                }
            });
            
            if (!seller) {
                throw new Error(`Seller with Id ${sellerId} not found`);
            }
            if (!seller.isActive) {
                throw new Error(`Seller with Id ${sellerId} is not active`);
            }
            
            this.seller = seller;
            
        } catch (error) {
            apiLogger.logError('[SunWest SaveDbService] Error initializing seller:', { error });
            throw error;
        }

        apiLogger.info('[SunWest SaveDbService] Seller initialized:', this.seller);
    }

    // Get Current seller info (must call initialize with seller first)
    // Giải thích mục đích sử dụng getSeller(): Hàm này dùng để lấy thông tin của seller hiện tại
    getSeller(): Seller {
        if (!this.seller) {
            throw new Error(`Service not initialized. Call initializeSeller() first`)
        }

        return this.seller;
    }

    // Get seller ID (must call initializeSeller first)
    getSellerId(): string {
        return this.getSeller().id;
    }

    // Update seller status after scraping completion
    async updateSellerStatus(
        status: 'success' | 'error',
        message?: string
    ): Promise<void> {
        if (!this.seller) {
            throw new Error(`Service not initialized. Call initializeSeller() first`)
        }
        // update seller status
        await this.prisma.seller.update({
            where: { id: this.seller.id },
            data: {
                status,
                updatedAt: new Date(),
            }
        })
    };

    /**
     * Get or create SeedProductCategory from CategoryMetadata
     * Returns category ID for saving products
     */
    async getOrCreateCategory(
        categoryData: {
            name: string;
            slug: string;
            seedType?: string;
        }
    ): Promise<string> {
        const sellerId = this.getSellerId();
        
        // Try to find existing category by slug
        let category = await this.prisma.seedProductCategory.findFirst({
            where: {
                sellerId,
                slug: categoryData.slug
            },
        });

        if (!category) {
            // Create new category if not found
            category = await this.prisma.seedProductCategory.create({
                data: {
                    sellerId,
                    name: categoryData.name,
                    slug: categoryData.slug,
                },
            });
        } else {
            // Update existing category
            category = await this.prisma.seedProductCategory.update({
                where: { id: category.id },
                data: {
                    name: categoryData.name,
                    updatedAt: new Date(),
                },
            });
        }

        return category.id;
    }

    /**
     * Save scraped products to database (implements ISaveDbService interface)
     */
    async saveProductsToDatabase(
        products: ProductCardDataFromCrawling[]
    ): Promise<{ saved: number; updated: number; errors: number }> {
        if (!this.seller) {
            throw new Error('Seller not initialized. Call initializeSeller() first.');
        }

        // Get default category for this seller (or create one)
        const defaultCategory = await this.getOrCreateCategory({
            name: 'Cannabis Seeds',
            slug: 'cannabis-seeds',
            seedType: 'Mixed'
        });

        return this.saveProductsToCategory(defaultCategory, products);
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
                // Use parsed seed type and cannabis type from scraper, with fallback to mapping functions
                const seedType = product.seedType ? 
                    (product.seedType as any) : 
                    parseSeedType(product.name);
                    
                const cannabisType = parseCannabisType(product.cannabisType);

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
     * Log scraping activity (implements ISaveDbService interface)
     */
    async logScrapeActivity(sellerId: string, status: string, productsCount: number, duration: number): Promise<void> {
        await this.prisma.scrapeLog.create({
            data: {
                sellerId,
                status,
                productsFound: productsCount,
                duration,
            },
        });
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