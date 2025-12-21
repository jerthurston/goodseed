/**
 * Crop King Seeds Database Service
 * 
 * Database operations for Crop King Seeds scraper
 */

import { PrismaClient, SeedType, CannabisType, StockStatus } from '@prisma/client';
import { ISaveDbService } from '../../../lib/factories/scraper-factory';

export class SaveDbService implements ISaveDbService {
  private prisma: PrismaClient;
  private sellerId?: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async initializeSeller(): Promise<string> {
    if (this.sellerId) {
      return this.sellerId;
    }

    const seller = await this.prisma.seller.upsert({
      where: { name: 'Crop King Seeds' },
      update: {
        url: 'https://www.cropkingseeds.ca',
        scrapingSourceUrl: 'https://www.cropkingseeds.ca/marijuana-seeds/',
        updatedAt: new Date()
      },
      create: {
        name: 'Crop King Seeds',
        url: 'https://www.cropkingseeds.ca',
        scrapingSourceUrl: 'https://www.cropkingseeds.ca/marijuana-seeds/',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    this.sellerId = seller.id;
    return this.sellerId;
  }

  async getOrCreateCategory(sellerId: string, categoryData: {
    name: string;
    slug: string;
    seedType?: string;
  }): Promise<string> {
    // Try to find existing category first
    let category = await this.prisma.seedProductCategory.findFirst({
      where: {
        sellerId,
        slug: categoryData.slug
      }
    });

    if (!category) {
      category = await this.prisma.seedProductCategory.create({
        data: {
          sellerId,
          name: categoryData.name,
          slug: categoryData.slug,
          description: `Category for ${categoryData.name}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } else {
      // Update existing category
      category = await this.prisma.seedProductCategory.update({
        where: { id: category.id },
        data: {
          name: categoryData.name,
          updatedAt: new Date()
        }
      });
    }

    return category.id;
  }

  async saveProductsToCategory(categoryId: string, products: any[]): Promise<{
    saved: number;
    updated: number;
    errors: number;
  }> {
    let saved = 0;
    let updated = 0;
    let errors = 0;

    for (const product of products) {
      try {
        console.log(`💾 Processing product: ${product.name}`);
        
        // Generate slug from product name
        const slug = this.generateSlug(product.name);
        
        // Parse cannabis data
        const cannabisData = this.parseCannabisData(product);
        
        // Upsert the SeedProduct
        const seedProduct = await this.prisma.seedProduct.upsert({
          where: {
            categoryId_slug: {
              categoryId,
              slug
            }
          },
          update: {
            name: product.name,
            description: product.description || null,
            stockStatus: this.mapStockStatus(product.availability),
            seedType: this.mapSeedType(product.seed_type),
            cannabisType: cannabisData.type,
            thcMin: cannabisData.thc.min,
            thcMax: cannabisData.thc.max,
            thcText: cannabisData.thc.text,
            cbdMin: cannabisData.cbd.min,
            cbdMax: cannabisData.cbd.max,
            cbdText: cannabisData.cbd.text,
            updatedAt: new Date()
          },
          create: {
            categoryId,
            name: product.name,
            url: product.url || '',
            slug,
            description: product.description || null,
            stockStatus: this.mapStockStatus(product.availability),
            seedType: this.mapSeedType(product.seed_type),
            cannabisType: cannabisData.type,
            thcMin: cannabisData.thc.min,
            thcMax: cannabisData.thc.max,
            thcText: cannabisData.thc.text,
            cbdMin: cannabisData.cbd.min,
            cbdMax: cannabisData.cbd.max,
            cbdText: cannabisData.cbd.text,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Save pricing information
        if (product.price) {
          await this.savePricing(seedProduct.id, product.price);
        }

        // Save product images
        if (product.image || product.images) {
          await this.saveProductImages(seedProduct.id, product);
        }

        const isNewProduct = !await this.checkIfProductExists(categoryId, slug);
        if (isNewProduct) {
          saved++;
          console.log(`   ✅ Created new product: ${product.name}`);
        } else {
          updated++;
          console.log(`   🔄 Updated existing product: ${product.name}`);
        }

      } catch (error) {
        console.error(`   ❌ Error saving product ${product.name}:`, error);
        errors++;
      }
    }

    return { saved, updated, errors };
  }

  async logScrapeActivity(sellerId: string, status: string, productsCount: number, duration: number): Promise<void> {
    await this.prisma.scrapeLog.create({
      data: {
        sellerId,
        status,
        productsFound: productsCount,
        duration,
        timestamp: new Date()
      }
    });
  }

  // Helper methods for data transformation
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private parseCannabisData(product: any) {
    return {
      type: this.mapCannabisType(product.strain_type),
      thc: this.parsePercentageRange(product.thc_content),
      cbd: this.parsePercentageRange(product.cbd_content)
    };
  }

  private mapStockStatus(availability: string | null): StockStatus {
    if (!availability) return StockStatus.IN_STOCK;
    
    const status = availability.toLowerCase();
    if (status.includes('out of stock') || status.includes('unavailable')) {
      return StockStatus.OUT_OF_STOCK;
    }
    if (status.includes('limited') || status.includes('low stock')) {
      return StockStatus.LIMITED;
    }
    return StockStatus.IN_STOCK;
  }

  private mapSeedType(seedType: string | null): SeedType | null {
    if (!seedType) return null;
    
    const type = seedType.toLowerCase();
    if (type.includes('feminized')) return SeedType.FEMINIZED;
    if (type.includes('autoflower') || type.includes('auto')) return SeedType.AUTOFLOWER;
    if (type.includes('regular')) return SeedType.REGULAR;
    if (type.includes('photoperiod')) return SeedType.PHOTOPERIOD;
    
    return null;
  }

  private mapCannabisType(strainType: string | null): CannabisType | null {
    if (!strainType) return null;
    
    const type = strainType.toLowerCase();
    if (type.includes('sativa')) return CannabisType.SATIVA;
    if (type.includes('indica')) return CannabisType.INDICA;
    if (type.includes('hybrid')) return CannabisType.HYBRID;
    
    return null;
  }

  private parsePercentageRange(percentageText: string | null) {
    if (!percentageText) {
      return { min: null, max: null, text: null };
    }

    // Extract numbers from text like "18-21%", "20%", "Low (0-1%)", etc.
    const matches = percentageText.match(/(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?))?\s*%?/);
    
    if (matches) {
      const min = parseFloat(matches[1]);
      const max = matches[2] ? parseFloat(matches[2]) : min;
      return { min, max, text: percentageText };
    }

    return { min: null, max: null, text: percentageText };
  }

  private async savePricing(seedProductId: string, priceData: any): Promise<void> {
    if (!priceData) return;

    // Parse price from formats like "$65.00 - $240.00" or "$35.00"
    const priceMatch = priceData.toString().match(/\$?([\d.]+)(?:\s*-\s*\$?([\d.]+))?/);
    
    if (priceMatch) {
      const minPrice = parseFloat(priceMatch[1]);
      const maxPrice = priceMatch[2] ? parseFloat(priceMatch[2]) : minPrice;
      
      // Use the average price as total price, assuming 5 seeds per pack
      const totalPrice = (minPrice + maxPrice) / 2;
      const packSize = 5;
      const pricePerSeed = totalPrice / packSize;

      await this.prisma.pricing.create({
        data: {
          seedProductId,
          totalPrice,
          packSize,
          pricePerSeed
        }
      });
    }
  }

  private async saveProductImages(seedProductId: string, product: any): Promise<void> {
    const images = [];
    
    if (product.image) {
      images.push(product.image);
    }
    if (product.images && Array.isArray(product.images)) {
      images.push(...product.images);
    }

    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      
      // Create or get image record
      const image = await this.prisma.image.upsert({
        where: { url: imageUrl },
        update: {},
        create: {
          url: imageUrl,
          alt: `${product.name} - Image ${i + 1}`,
          createdAt: new Date()
        }
      });

      // Link image to product
      await this.prisma.seedProductImage.upsert({
        where: {
          seedProductId_imageId: {
            seedProductId,
            imageId: image.id
          }
        },
        update: {},
        create: {
          seedProductId,
          imageId: image.id,
          order: i,
          isPrimary: i === 0,
          createdAt: new Date()
        }
      });
    }
  }

  private async checkIfProductExists(categoryId: string, slug: string): Promise<boolean> {
    const existing = await this.prisma.seedProduct.findUnique({
      where: {
        categoryId_slug: {
          categoryId,
          slug
        }
      }
    });
    
    return !!existing;
  }
}