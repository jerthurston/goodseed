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
import { CannabisType, Prisma, PrismaClient, Seller, StockStatus } from '@prisma/client';
import { parseCannabisType, parseSeedType } from '../utils/data-mappers';
import { SellerRaw } from '@/types/seller.type';
import { prisma } from '@/lib/prisma';

// TODO: Lấy thông tin seller từ db thay cho hardcore
const SELLER_NAME = 'Vancouver Seed Bank';
const SELLER_URL = 'https://vancouverseedbank.ca';
const SCRAPING_SOURCE_URL = [
    'https://vancouverseedbank.ca/shop',
];

export class SaveDbService {
    private seller: Seller | null = null;

    constructor(private prisma: PrismaClient) { }

    /**
     * Initialize service with seller data form database
     * @param sellerId
     */
    async initializeSeller(sellerId: string): Promise<void> {
        // Vì prisma là singelton nên cần dùng this.prisma nếu muốn lưu status cho seller
        const seller = await this.prisma.seller.findUnique({
            where:{id:sellerId},
        });
        if(!seller) {
            throw new Error(`Seller with Id ${sellerId} not found`)
        }
        if(!seller.isActive) {
            throw new Error(`Seller with Id ${sellerId} is not active`)
        }
        // Lưu seller vào state
        this.seller = seller

        await this.prisma.seller.update({
            where:{id:sellerId},
            data:{
                lastScraped: new Date(),
                status: 'in_progress',
                updatedAt: new Date(),
            }
        })
    }

    // Get Current seller info (must call initialize with seller first)
    // Giải thích mục đích sử dụng getSeller(): Hàm này dùng để lấy thông tin của seller hiện tại
    getSeller():Seller {
        if(!this.seller) {
            throw new Error(`Service not initialized. Call initializeWithSeller() first`)
        }

        return this.seller;
    }
    // Get seller ID (must call initializeWithSeller first)
    getSellerId():string{
        return this.getSeller().id;
    }

    //Update seller status after scraping completion
    async updateSellerStatus(
        status: 'success' | 'error',
        message?: string
    ):Promise<void> {
        if(!this.seller) {
            throw new Error(`Service not initialized. Call initializeWithSeller() first`)
        }
        // update seller status
        await this.prisma.seller.update({
            where: { id: this.seller.id },
            data:{
                status,
                updatedAt: new Date(),
            }
        })
    };

    /**
     * Get or create SeedProductCategory from CategoryMetadata
     * Returns category ID for saving products
     * LOGIC cho việc chọn category cho seedProduct. Trường giá trị của cannabisType của product khi lowCase() sẽ tương ứng với name của SeedProductCategory(sẽ có 3 category chính: Sativa, Indica, Hybrid).
     * 
     * TODO: Cần viết lại hoặc làm rõ getOrCreateCategory có cần thiết ở đây không?
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
                // Parse seedType from product name (e.g., "Feminized", "Autoflowering")
                const seedType = parseSeedType(product.name);

                // Parse cannabisType from strainType (e.g., "Indica Dominant Hybrid" -> INDICA)
                const cannabisType = parseCannabisType(product.cannabisType);

                // Kiểm tra slug của product đã tồn tại chưa, nếu chưa thì tạo mới, nếu đã có thì update bằng upsert
                const existing = await this.prisma.seedProduct.findUnique({
                    where: {
                        categoryId_slug: {
                            categoryId,
                            slug: product.slug,
                        },
                    },
                   // Nếu kiểm tra seedProduct đó đã tồn tại chưa bằng findUnique thì chúng ta phải dùng id của seedProduct đúng không? :   
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

    // /**
    //  * Map strain type to cannabis type enum
    //  */
    // private mapCannabisType(strainType: string | undefined): CannabisType | null {
    //     if (!strainType) return null;

    //     const typeLower = strainType.toLowerCase();
    //     if (typeLower.includes('sativa')) return CannabisType.SATIVA;
    //     if (typeLower.includes('indica')) return CannabisType.INDICA;
    //     if (typeLower.includes('hybrid')) return CannabisType.HYBRID;

    //     return null;
    // }

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
