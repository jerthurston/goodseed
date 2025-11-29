/**
 * Database Service for Seed Supreme Category Scraper
 * 
 * Handles saving category-level data to PostgreSQL using Prisma ORM
 * Implements schema: Seller → SeedProductCategory → SeedProduct
 * 
 * Different from db-service.ts which handles product detail pages with pack options
 * This service handles category pages with simple product cards
 * 
 * @usage
 * ```typescript
 * const dbService = new SeedSupremeCategoryDbService(prisma);
 * const sellerId = await dbService.initializeSeller();
 * const categoryId = await dbService.getOrCreateCategory(sellerId, metadata);
 * await dbService.saveProductsToCategory(categoryId, products);
 * await dbService.updateCategoryAggregates(categoryId);
 * ```
 */

import { CannabisType, PrismaClient, StockStatus } from '@prisma/client';
import { parseTHCCBDText } from '../utils/thc-cbd-parser';
import type { CategoryMetadata, ProductCardData } from './types';

const SELLER_NAME = 'Seed Supreme';
const SELLER_URL = 'https://seedsupreme.com';

export class SeedSupremeCategoryDbService {
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
        metadata: CategoryMetadata
    ): Promise<string> {
        // Try to find existing category by slug
        let category = await this.prisma.seedProductCategory.findFirst({
            where: { slug: metadata.slug },
        });

        if (!category) {
            // Create new category if not found
            category = await this.prisma.seedProductCategory.create({
                data: {
                    name: metadata.name,
                    slug: metadata.slug,
                    url: metadata.url,
                },
            });
        } else {
            // Update existing category
            category = await this.prisma.seedProductCategory.update({
                where: { id: category.id },
                data: {
                    name: metadata.name,
                    url: metadata.url,
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
        products: ProductCardData[]
    ): Promise<{ saved: number; updated: number; errors: number }> {
        let saved = 0;
        let updated = 0;
        let errors = 0;

        for (const product of products) {
            try {
                // Check if product exists
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
                        name: product.name,
                        url: product.url,
                        description: null, // Not available in category page
                        basePrice: product.basePriceNum || 0,
                        packSize: product.packSize || 4,
                        pricePerSeed: product.pricePerSeed || (product.basePriceNum ? product.basePriceNum / (product.packSize || 4) : 0),
                        stockStatus: this.mapStockStatus(product.stockStatus),
                        cannabisType: this.mapCannabisType(product.variety),
                        variety: product.variety || null,
                        thcMin: parseTHCCBDText(product.thcLevel).min,
                        thcMax: parseTHCCBDText(product.thcLevel).max,
                        thcText: product.thcLevel || null,
                        cbdMin: null, // Not available in category page
                        cbdMax: null,
                        cbdText: null, // Not available in category page
                        updatedAt: new Date(),
                    },
                    create: {
                        categoryId,
                        name: product.name,
                        slug: product.slug,
                        url: product.url,
                        description: null, // Not available in category page
                        basePrice: product.basePriceNum || 0,
                        packSize: product.packSize || 4,
                        pricePerSeed: product.pricePerSeed || (product.basePriceNum ? product.basePriceNum / (product.packSize || 4) : 0),
                        stockStatus: this.mapStockStatus(product.stockStatus),
                        cannabisType: this.mapCannabisType(product.variety),
                        variety: product.variety || null,
                        thcMin: parseTHCCBDText(product.thcLevel).min,
                        thcMax: parseTHCCBDText(product.thcLevel).max,
                        thcText: product.thcLevel || null,
                        cbdMin: null, // Not available in category page
                        cbdMax: null,
                        cbdText: null, // Not available in category page
                    },
                });

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
     * Map stock status text to enum
     */
    private mapStockStatus(status: string | undefined): StockStatus {
        if (!status) return StockStatus.IN_STOCK;

        const statusLower = status.toLowerCase();
        if (statusLower.includes('out of stock')) return StockStatus.OUT_OF_STOCK;
        if (statusLower.includes('limited')) return StockStatus.LIMITED;
        return StockStatus.IN_STOCK;
    }

    /**
     * Map variety text to cannabis type enum
     */
    private mapCannabisType(variety: string | undefined): CannabisType | null {
        if (!variety) return null;

        const varietyLower = variety.toLowerCase();
        if (varietyLower.includes('sativa')) return CannabisType.SATIVA;
        if (varietyLower.includes('indica')) return CannabisType.INDICA;
        if (varietyLower.includes('hybrid')) return CannabisType.HYBRID;

        return null;
    }

    /**
     * Get summary statistics for a seller
     */
    async getSellerStats(sellerId: string) {
        const [categoryCount, productCount, lastScrape] = await Promise.all([
            this.prisma.seedProductCategory.count(),
            this.prisma.seedProduct.count(),
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
