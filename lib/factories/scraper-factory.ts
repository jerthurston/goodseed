/**
 * Scraper Factory
 * 
 * Factory pattern để khởi tạo scraper và database service dựa trên source
 * Hỗ trợ nhiều scrapers khác nhau trong hệ thống
 */

import { PrismaClient } from '@prisma/client';
import { SaveDbService as VancouverSaveDbService } from '@/scrapers/vancouverseedbank/core/save-db-service';
import { ProductListScraper as VancouverProductListScraper } from '@/scrapers/vancouverseedbank/core/product-list-scrapers';
import { SaveDbService as SunWestSaveDbService } from '@/scrapers/sunwestgenetics/core/save-db-service';
import { ProductListScraper as SunWestProductListScraper } from '@/scrapers/sunwestgenetics/core/product-list-scrapers';

export type ScraperSource = 'vancouverseedbank' | 'sunwestgenetics';

export interface IProductListScraper {
  scrapeProductList(baseUrl: string, maxPages?: number): Promise<{
    products: any[];
    totalPages: number;
    totalProducts: number;
    duration: number;
  }>;
  scrapeProductListByBatch(baseUrl: string, startPage: number, endPage: number): Promise<{
    products: any[];
    totalPages: number;
    totalProducts: number;
    duration: number;
  }>;
}

export interface ISaveDbService {
  initializeSeller(): Promise<string>;
  getOrCreateCategory(sellerId: string, categoryData: {
    name: string;
    slug: string;
    seedType?: string;
  }): Promise<string>;
  saveProductsToCategory(categoryId: string, products: any[]): Promise<{
    saved: number;
    updated: number;
    errors: number;
  }>;
  logScrapeActivity(sellerId: string, status: string, productsCount: number, duration: number): Promise<void>;
}

export class ScraperFactory {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Tạo ProductListScraper dựa trên source
   */
  createProductListScraper(source: ScraperSource): IProductListScraper {
    switch (source) {
      case 'vancouverseedbank':
        return new VancouverProductListScraper();
      
      case 'sunwestgenetics':
        return new SunWestProductListScraper();
      
      default:
        throw new Error(`Unsupported scraper source: ${source}`);
    }
  }

  /**
   * Tạo SaveDbService dựa trên source
   */
  createSaveDbService(source: ScraperSource): ISaveDbService {
    switch (source) {
      case 'vancouverseedbank':
        return new VancouverSaveDbService(this.prisma);
      
      case 'sunwestgenetics':
        return new SunWestSaveDbService(this.prisma);
      
      default:
        throw new Error(`Unsupported database service source: ${source}`);
    }
  }

  /**
   * Lấy tên seller để lưu trong database
   */
  getSellerName(source: ScraperSource): string {
    switch (source) {
      case 'vancouverseedbank':
        return 'Vancouver Seed Bank';
      
      case 'sunwestgenetics':
        return 'SunWest Genetics';
      
      default:
        throw new Error(`Unsupported seller source: ${source}`);
    }
  }

  /**
   * Validate source parameter
   */
  static isValidSource(source: string): source is ScraperSource {
    return ['vancouverseedbank', 'sunwestgenetics'].includes(source);
  }

  /**
   * Lấy list các sources được hỗ trợ
   */
  static getSupportedSources(): ScraperSource[] {
    return ['vancouverseedbank', 'sunwestgenetics'];
  }
}

export default ScraperFactory;