/**
 * Seed Supreme Database Service
 * 
 * Maps scraped product data to Prisma models and saves to database
 * Handles:
 * - Seller creation/retrieval
 * - Seed products with multiple pack options
 * - Image storage and relationships
 * - Duplicate detection and updates
 * - Scrape logging
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { CannabisType, PhotoperiodType, PrismaClient, SeedType, StockStatus } from '@prisma/client';
import 'dotenv/config';
import pg from 'pg';
import { ProductDetailData } from './types';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export class SeedSupremeDbService {
    private sellerId: string | null = null;

    /**
     * Initialize or get Seed Supreme seller
     */
    async initializeSeller(): Promise<string> {
        if (this.sellerId) return this.sellerId;

        const seller = await prisma.seller.upsert({
            where: { name: 'Seed Supreme' },
            update: {
                url: 'https://seedsupreme.com',
                lastScraped: new Date(),
                status: 'active',
            },
            create: {
                name: 'Seed Supreme',
                url: 'https://seedsupreme.com',
                isActive: true,
                lastScraped: new Date(),
                status: 'active',
            },
        });

        this.sellerId = seller.id;
        return seller.id;
    }

    /**
     * Save products to database
     * Each product can have multiple pack options → multiple Seed records
     */
    async saveProducts(products: ProductDetailData[]): Promise<{
        saved: number;
        updated: number;
        errors: number;
    }> {
        const sellerId = await this.initializeSeller();

        let saved = 0;
        let updated = 0;
        let errors = 0;

        console.log(`\n💾 Saving ${products.length} products to database...`);

        for (const product of products) {
            try {
                // Save each pack option as a separate Seed record
                if (product.packOptions.length > 0) {
                    for (const pack of product.packOptions) {
                        const slug = this.generateSlug(product.slug, pack.packSize);
                        const exists = await this.seedExists(sellerId, slug);

                        if (exists) {
                            await this.updateSeed(sellerId, slug, product, pack);
                            updated++;
                        } else {
                            await this.createSeed(sellerId, product, pack);
                            saved++;
                        }
                    }
                } else {
                    // No pack options - save as single seed
                    const exists = await this.seedExists(sellerId, product.slug);

                    if (exists) {
                        await this.updateSeedWithoutPack(sellerId, product.slug, product);
                        updated++;
                    } else {
                        await this.createSeedWithoutPack(sellerId, product);
                        saved++;
                    }
                }

                console.log(`  ✓ ${product.name}`);
            } catch (error) {
                console.error(`  ✗ Failed to save ${product.name}:`, error);
                errors++;
            }
        }

        console.log(`\n✅ Database save complete:`);
        console.log(`   Saved: ${saved}`);
        console.log(`   Updated: ${updated}`);
        console.log(`   Errors: ${errors}`);

        return { saved, updated, errors };
    }

    /**
     * Check if seed exists
     */
    private async seedExists(sellerId: string, slug: string): Promise<boolean> {
        const seed = await prisma.seed.findUnique({
            where: {
                sellerId_slug: {
                    sellerId,
                    slug,
                },
            },
        });
        return seed !== null;
    }

    /**
     * Create new seed with pack option
     */
    private async createSeed(
        sellerId: string,
        product: ProductDetailData,
        pack: { packSize: number; totalPrice: number; pricePerSeed: number }
    ) {
        const slug = this.generateSlug(product.slug, pack.packSize);

        const seed = await prisma.seed.create({
            data: {
                sellerId,
                name: `${product.name} (${pack.packSize}x)`,
                url: product.url,
                slug,
                totalPrice: pack.totalPrice,
                packSize: pack.packSize,
                pricePerSeed: pack.pricePerSeed,
                stockStatus: StockStatus.IN_STOCK,
                seedType: this.mapSeedType(product.name),
                cannabisType: this.mapCannabisType(product.specs.variety),
                photoperiodType: this.mapPhotoperiodType(product.specs.floweringType),
                ...this.extractThcCbd(product.specs.thcContent, product.specs.cbdContent),
            },
        });

        // Save image if exists
        if (product.imageUrl) {
            await this.saveImage(seed.id, product.imageUrl);
        }
    }

    /**
     * Update existing seed with pack option
     */
    private async updateSeed(
        sellerId: string,
        slug: string,
        product: ProductDetailData,
        pack: { packSize: number; totalPrice: number; pricePerSeed: number }
    ) {
        await prisma.seed.update({
            where: {
                sellerId_slug: {
                    sellerId,
                    slug,
                },
            },
            data: {
                name: `${product.name} (${pack.packSize}x)`,
                url: product.url,
                totalPrice: pack.totalPrice,
                packSize: pack.packSize,
                pricePerSeed: pack.pricePerSeed,
                stockStatus: StockStatus.IN_STOCK,
                seedType: this.mapSeedType(product.name),
                cannabisType: this.mapCannabisType(product.specs.variety),
                photoperiodType: this.mapPhotoperiodType(product.specs.floweringType),
                ...this.extractThcCbd(product.specs.thcContent, product.specs.cbdContent),
            },
        });
    }

    /**
     * Create seed without pack option
     */
    private async createSeedWithoutPack(sellerId: string, product: ProductDetailData) {
        const seed = await prisma.seed.create({
            data: {
                sellerId,
                name: product.name,
                url: product.url,
                slug: product.slug,
                totalPrice: product.basePriceNum || 0,
                packSize: 1,
                pricePerSeed: product.basePriceNum || 0,
                stockStatus: StockStatus.IN_STOCK,
                seedType: this.mapSeedType(product.name),
                cannabisType: this.mapCannabisType(product.specs.variety),
                photoperiodType: this.mapPhotoperiodType(product.specs.floweringType),
                ...this.extractThcCbd(product.specs.thcContent, product.specs.cbdContent),
            },
        });

        if (product.imageUrl) {
            await this.saveImage(seed.id, product.imageUrl);
        }
    }

    /**
     * Update seed without pack option
     */
    private async updateSeedWithoutPack(sellerId: string, slug: string, product: ProductDetailData) {
        await prisma.seed.update({
            where: {
                sellerId_slug: {
                    sellerId,
                    slug,
                },
            },
            data: {
                name: product.name,
                url: product.url,
                totalPrice: product.basePriceNum || 0,
                pricePerSeed: product.basePriceNum || 0,
                stockStatus: StockStatus.IN_STOCK,
                seedType: this.mapSeedType(product.name),
                cannabisType: this.mapCannabisType(product.specs.variety),
                photoperiodType: this.mapPhotoperiodType(product.specs.floweringType),
                ...this.extractThcCbd(product.specs.thcContent, product.specs.cbdContent),
            },
        });
    }

    /**
     * Save product image
     */
    private async saveImage(seedId: string, imageUrl: string) {
        // Find or create image
        const image = await prisma.image.upsert({
            where: { url: imageUrl },
            update: {},
            create: {
                url: imageUrl,
                alt: 'Product image',
            },
        });

        // Link to seed (ignore if already exists)
        await prisma.seedImage.upsert({
            where: {
                seedId_imageId: {
                    seedId,
                    imageId: image.id,
                },
            },
            update: {},
            create: {
                seedId,
                imageId: image.id,
                order: 0,
                isPrimary: true,
            },
        });
    }

    /**
     * Generate slug with pack size suffix
     */
    private generateSlug(baseSlug: string, packSize: number): string {
        return `${baseSlug}-${packSize}x`;
    }

    /**
     * Map product name to SeedType enum
     */
    private mapSeedType(name: string): SeedType | null {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('feminized')) return SeedType.FEMINIZED;
        if (lowerName.includes('autoflower') || lowerName.includes('auto')) return SeedType.AUTOFLOWER;
        if (lowerName.includes('regular')) return SeedType.REGULAR;
        return null;
    }

    /**
     * Map variety to CannabisType enum
     */
    private mapCannabisType(variety?: string): CannabisType | null {
        if (!variety) return null;
        const lower = variety.toLowerCase();
        if (lower.includes('sativa')) return CannabisType.SATIVA;
        if (lower.includes('indica')) return CannabisType.INDICA;
        if (lower.includes('hybrid')) return CannabisType.HYBRID;
        return null;
    }

    /**
     * Map flowering type to PhotoperiodType enum
     */
    private mapPhotoperiodType(floweringType?: string): PhotoperiodType | null {
        if (!floweringType) return null;
        const lower = floweringType.toLowerCase();
        if (lower.includes('autoflower') || lower.includes('auto')) return PhotoperiodType.AUTOFLOWER;
        if (lower.includes('photoperiod') || lower.includes('photo')) return PhotoperiodType.PHOTOPERIOD;
        return null;
    }

    /**
     * Extract THC and CBD ranges from text
     */
    private extractThcCbd(thcText?: string, cbdText?: string) {
        const result: {
            thcMin?: number;
            thcMax?: number;
            cbdMin?: number;
            cbdMax?: number;
        } = {};

        // THC extraction
        if (thcText) {
            const thcMatch = thcText.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*%/);
            if (thcMatch) {
                result.thcMin = parseFloat(thcMatch[1]);
                result.thcMax = parseFloat(thcMatch[2]);
            } else {
                const singleMatch = thcText.match(/(\d+(?:\.\d+)?)\s*%/);
                if (singleMatch) {
                    const value = parseFloat(singleMatch[1]);
                    result.thcMin = value;
                    result.thcMax = value;
                }
            }
        }

        // CBD extraction
        if (cbdText) {
            const cbdMatch = cbdText.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*%/);
            if (cbdMatch) {
                result.cbdMin = parseFloat(cbdMatch[1]);
                result.cbdMax = parseFloat(cbdMatch[2]);
            } else {
                const singleMatch = cbdText.match(/(\d+(?:\.\d+)?)\s*%/);
                if (singleMatch) {
                    const value = parseFloat(singleMatch[1]);
                    result.cbdMin = value;
                    result.cbdMax = value;
                }
            }
        }

        return result;
    }

    /**
     * Log scraping session
     */
    async logScrapeSession(
        productsFound: number,
        duration: number,
        errors?: Array<{ url: string; error: string }>
    ) {
        const sellerId = await this.initializeSeller();

        await prisma.scrapeLog.create({
            data: {
                sellerId,
                status: errors && errors.length > 0 ? 'error' : 'success',
                productsFound,
                duration,
                errors: errors ? { errors } : undefined,
            },
        });
    }

    /**
     * Close Prisma connection
     */
    async disconnect() {
        await prisma.$disconnect();
    }
}
