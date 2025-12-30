/**
 * Database Service for Sonoma Seeds Product List Scraper
 * 
 * Handles saving product data to PostgreSQL using Prisma ORM
 * Implements schema: Seller → SeedProductCategory → SeedProduct
 * 
 * @usage
 * ```typescript
 * const dbService = new SaveDbService(prisma);
 * await dbService.initializeSeller(sellerId);
 * const categoryId = await dbService.getOrCreateCategory(metadata);
 * await dbService.saveProductsToCategory(categoryId, products);
 * ```
 */

import type { CategoryMetadataFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { PrismaClient, Seller, StockStatus } from '@prisma/client';
import { parseCannabisType, parseSeedType } from '../utils/data-mappers';
import { apiLogger } from '@/lib/helpers/api-logger';

export class SaveDbService {
    private seller: Seller | null = null;

    constructor(private prisma: PrismaClient) {}

    /**
     * Initialize service with seller data from database
     * @param sellerId
     */
    async initializeSeller(sellerId: string): Promise<void> {
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
            apiLogger.logError('SaveDbService', error as Error, {
                message: 'Error initializing seller',
                sellerId
            });
            throw error;
        }

        apiLogger.info('[Sonoma Seeds SaveDbService] Seller initialized:', this.seller);
    }

    /**
     * Get current seller info (must call initializeSeller first)
     */
    getSeller(): Seller {
        if (!this.seller) {
            throw new Error(`Service not initialized. Call initializeSeller() first`);
        }
        return this.seller;
    }

    /**
     * Get seller ID (must call initializeSeller first)
     */
    getSellerId(): string {
        return this.getSeller().id;
    }

    /**
     * Update seller status after scraping completion
     */
    async updateSellerStatus(
        status: 'success' | 'error',
        message?: string
    ): Promise<void> {
        if (!this.seller) {
            throw new Error(`Service not initialized. Call initializeSeller() first`);
        }
        
        // Update seller status
        await this.prisma.seller.update({
            where: { id: this.seller.id },
            data: {
                status,
                lastScraped: new Date(),
                updatedAt: new Date(),
            }
        });
    }

    /**
     * Get or create SeedProductCategory from CategoryMetadata
     * Returns category ID for saving products
     */
    async getOrCreateCategory(
        metadata: CategoryMetadataFromCrawling
    ): Promise<string> {
        const sellerId = this.getSellerId();
        
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
     * Save scraped products to database (implements ISaveDbService interface)
     */
    async saveProductsToDatabase(
        products: ProductCardDataFromCrawling[]
    ): Promise<{ saved: number; updated: number; errors: number }> {
        if (!this.seller) {
            throw new Error('Seller not initialized. Call initializeSeller() first.');
        }

        // Get default category for Sonoma Seeds (or create one)
        const defaultCategory = await this.getOrCreateCategory({
            name: 'Cannabis Seeds',
            slug: 'cannabis-seeds',
            seedType: 'Mixed'
        });

        return this.saveProductsToCategory(defaultCategory, products);
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

        // Get sellerId once at the beginning
        const sellerId = this.getSellerId();

        console.log(`[Sonoma Seeds] Processing ${products.length} products...`);
        console.log(`Sample products (first 3):`, products.slice(0, 3).map(p => ({ name: p.name, url: p.url, seedType: p.seedType, cannabisType: p.cannabisType })));

        for (const product of products) {
            try {
                // Parse seedType from product name or use existing seedType
                const seedType = product.seedType ? 
                    (product.seedType === 'FEMINIZED' ? 'FEMINIZED' :
                     product.seedType === 'AUTOFLOWER' ? 'AUTOFLOWER' :
                     product.seedType === 'REGULAR' ? 'REGULAR' :
                     product.seedType === 'PHOTOPERIOD' ? 'PHOTOPERIOD' : null) :
                    parseSeedType(product.name);

                // Parse cannabisType from product cannabisType
                const cannabisType = parseCannabisType(product.cannabisType);

                // Check if product already exists
                const existing = await this.prisma.seedProduct.findUnique({
                    where: {
                        categoryId_slug: {
                            categoryId,
                            slug: product.slug,
                        },
                    },
                });

                // Upsert product
                const savedProduct = await this.prisma.seedProduct.upsert({
                    where: {
                        categoryId_slug: {
                            categoryId,
                            slug: product.slug,
                        },
                    },
                    update: {
                        sellerId,
                        name: product.name,
                        url: product.url,
                        description: product.cannabisType || null,
                        stockStatus: StockStatus.IN_STOCK,
                        seedType: seedType,
                        cannabisType: cannabisType,
                        thcMin: product.thcMin,
                        thcMax: product.thcMax,
                        thcText: product.thcLevel || null,
                        cbdMin: product.cbdMin,
                        cbdMax: product.cbdMax,
                        cbdText: product.cbdLevel || null,
                        updatedAt: new Date(),
                    },
                    create: {
                        sellerId,
                        categoryId,
                        name: product.name,
                        slug: product.slug,
                        url: product.url,
                        description: product.cannabisType || null,
                        stockStatus: StockStatus.IN_STOCK,
                        seedType: seedType,
                        cannabisType: cannabisType,
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
                console.error(`[Sonoma Seeds] Error saving product ${product.name}:`, error);
                apiLogger.logError('Sonoma Seeds Product Save', error as Error, {
                    productName: product.name,
                    productUrl: product.url
                });
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
     * Log scraping activity for Sonoma Seeds
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
     * Get summary statistics for Sonoma Seeds seller
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