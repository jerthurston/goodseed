/**
 * Scraper Factory - Manual Extraction
 * 
 * Unified factory pattern for creating scrapers with manual CSS selector extraction.
 * Optimized for maintainability.
 */

import { PrismaClient } from '@prisma/client';
import { CheerioCrawler } from 'crawlee';

// Database services (retained for data persistence)
import { SaveDbService as VancouverSaveDbService } from '@/scrapers/vancouverseedbank/core/save-db-service';
import { SaveDbService as SunWestSaveDbService } from '@/scrapers/sunwestgenetics/core/save-db-service';
import { SaveDbService as CropKingSaveDbService } from '@/scrapers/cropkingseeds/core/save-db-service';

// Product List Scrapers (core implementations)
import { ProductListScraper as VancouverProductListScraper } from '@/scrapers/vancouverseedbank/core/product-list-scrapers';
import { VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS } from '@/scrapers/vancouverseedbank/core/selectors';

import { ProductListScraper as SunWestProductListScraper } from '@/scrapers/sunwestgenetics/core/product-list-scrapers';

import {
  createCropKingSeedsScraper,
  CROPKINGSEEDS_SELECTORS
} from '@/scrapers/cropkingseeds/hybrid/cropkingseeds-hybrid-scraper';



/**
 * Supported scraper sources - easily extensible for new sites
 */
export type ScraperSource = 
  | 'vancouverseedbank' 
  | 'sunwestgenetics'
  | 'bcbuddepot'
  | 'beaverseed' 
  | 'maryjanesgarden'
  | 'mjseedscanada'
  | 'sonomaseeds'
  | 'rocketseeds'
  | 'cropkingseeds'
  | 'canukseeds'
  | 'truenorthseedbank';



export interface ISaveDbService {
  initializeSeller(): Promise<string>;
  getOrCreateCategory(sellerId: string, categoryData: {
    name: string;
    slug: string;
    seedType?: string;
  }): Promise<string>;
  saveProductsToDatabase(products: any[]): Promise<{
    saved: number;
    updated: number;
    errors: number;
  }>;
  logScrapeActivity(sellerId: string, status: string, productsCount: number, duration: number): Promise<void>;
}

/**
 * Manual selector configuration for a scraper site
 */
export interface ManualSelectors {
  name: string;
  price: string;
  currency?: string;
  image?: string;
  description?: string;
  availability?: string;
  rating?: string;
  reviewCount?: string;
  
  // Cannabis-specific selectors
  strainType?: string;
  seedType?: string;
  thcContent?: string;
  cbdContent?: string;
  floweringTime?: string;
  yieldInfo?: string;
  genetics?: string;
  height?: string;
  effects?: string;
  aroma?: string;
  flavor?: string;
  // pagination selectors
  nextPage?: string;
  prevPage?: string;
  currentPage?: string;
  paginationContainer?:string;
  paginationItems?:string;
  
}

/**
 * scraper configuration interface
 */
export interface ScraperConfig {
  siteName: string;
  baseUrl: string;
  selectors: ManualSelectors;
  enableCrossValidation?: boolean;
  minQualityScore?: number;
  maxConcurrency?: number;
  maxRequestsPerMinute?: number;
}

/**
 * Site configuration registry for all supported cannabis seed sites
 */
export interface SiteConfig {
  name: string;
  baseUrl: string;
  selectors: ManualSelectors;
  isImplemented: boolean;
}

export class ScraperFactory {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get site configuration for any supported cannabis seed site
   */
  private getSiteConfig(source: ScraperSource): SiteConfig {
    const configs: Record<ScraperSource, SiteConfig> = {
      'vancouverseedbank': {
        name: 'Vancouver Seed Bank',
        baseUrl: 'https://vancouverseedbank.ca',
        selectors: VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS,
        isImplemented: true
      },
      'sunwestgenetics': {
        name: 'SunWest Genetics', 
        baseUrl: 'https://www.sunwestgenetics.com',
        selectors: SUNWEST_SELECTORS,
        isImplemented: true
      },
      'cropkingseeds': {
        name: 'Crop King Seeds',
        baseUrl: 'https://www.cropkingseeds.ca',
        selectors: CROPKINGSEEDS_SELECTORS,
        isImplemented: true
      },
      'bcbuddepot': {
        name: 'BC Bud Depot',
        baseUrl: 'https://bcbuddepot.com',
        selectors: {} as ManualSelectors, // To be implemented
        isImplemented: false
      },
      'beaverseed': {
        name: 'Beaver Seeds',
        baseUrl: 'https://beaverseed.com',
        selectors: {} as ManualSelectors,
        isImplemented: false
      },
      'maryjanesgarden': {
        name: "Mary Jane's Garden",
        baseUrl: 'https://www.maryjanesgarden.com',
        selectors: {} as ManualSelectors,
        isImplemented: false
      },
      'mjseedscanada': {
        name: 'MJ Seeds Canada',
        baseUrl: 'https://www.mjseedscanada.ca',
        selectors: {} as ManualSelectors,
        isImplemented: false
      },
      'sonomaseeds': {
        name: 'Sonoma Seeds',
        baseUrl: 'https://www.sonomaseeds.com',
        selectors: {} as ManualSelectors,
        isImplemented: false
      },
      'rocketseeds': {
        name: 'Rocket Seeds',
        baseUrl: 'https://rocketseeds.com',
        selectors: {} as ManualSelectors,
        isImplemented: false
      },
      'canukseeds': {
        name: 'Canuk Seeds',
        baseUrl: 'https://www.canukseeds.com',
        selectors: {} as ManualSelectors,
        isImplemented: false
      },
      'truenorthseedbank': {
        name: 'True North Seed Bank',
        baseUrl: 'https://www.truenorthseedbank.com',
        selectors: {} as ManualSelectors,
        isImplemented: false
      }
    };

    return configs[source];
  }

  /**
   * Job: Tạo job scrape dữ liệu trang danh sách product cho các trang source được thêm vào sẵn sàng cho việc scraper dữ liệu
   * Mục đích của hàm createProductListScraper: Tạo một instance của product list scraper tương ứng với source.
   * Kết quả: Trả về một instance của product list scraper
   */
  createProductListScraper(source: ScraperSource) {
    // Lấy cấu hình trang từ siteConfig
    const siteConfig = this.getSiteConfig(source);
    // Kiểm tra xem scraper đã được triển khai chưa. True là đã thiết lập, false là chưa thiếp lập
    if (!siteConfig.isImplemented) {
      throw new Error(`Scraper for ${siteConfig.name} is not yet implemented. Please implement selectors first.`);
    }
    // Tạo instance của product list scraper tương ứng với source
    switch (source) {
      case 'vancouverseedbank':
        return new VancouverProductListScraper();
      case 'sunwestgenetics':
        return new SunWestProductListScraper();

      //TODO: Thêm các scraper khác ở đây sau khi thiết lập xong
      
      default:
        throw new Error(`Product list scraper implementation not found for: ${source}`);
    }
  }


  /**
   * Create database service for supported sites
   */
  createSaveDbService(source: ScraperSource): ISaveDbService {
    switch (source) {
      case 'vancouverseedbank':
        return new VancouverSaveDbService(this.prisma);
      
      case 'sunwestgenetics':
        return new SunWestSaveDbService(this.prisma);
      
      case 'cropkingseeds':
        return new CropKingSaveDbService(this.prisma);
      
      default:
        const siteConfig = this.getSiteConfig(source);
        throw new Error(`Database service for ${siteConfig.name} is not yet implemented.`);
    }
  }

  /**
   * Get seller name for any supported site
   */
  getSellerName(source: ScraperSource): string {
    return this.getSiteConfig(source).name;
  }

  /**
   * Get base URL for any supported site
   */
  getBaseUrl(source: ScraperSource): string {
    return this.getSiteConfig(source).baseUrl;
  }

  /**
   * Check if site is implemented and ready for scraping
   */
  isImplemented(source: ScraperSource): boolean {
    return this.getSiteConfig(source).isImplemented;
  }

  /**
   * Get all supported sources (including planned implementations)
   */
  static getSupportedSources(): ScraperSource[] {
    return [
      'vancouverseedbank',
      'sunwestgenetics', 
      'bcbuddepot',
      'beaverseed',
      'maryjanesgarden',
      'mjseedscanada',
      'sonomaseeds',
      'rocketseeds',
      'cropkingseeds',
      'canukseeds',
      'truenorthseedbank'
    ];
  }

  /**
   * Get only implemented sources (ready for production)
   */
  static getImplementedSources(): ScraperSource[] {
    return ['vancouverseedbank', 'sunwestgenetics', 'cropkingseeds'];
  }

  /**
   * Get planned sources (requiring implementation)
   */
  static getPlannedSources(): ScraperSource[] {
    return [
      'bcbuddepot',
      'beaverseed', 
      'maryjanesgarden',
      'mjseedscanada',
      'sonomaseeds',
      'rocketseeds',
      'canukseeds',
      'truenorthseedbank'
    ];
  }

  /**
   * Validate source parameter
   */
  static isValidSource(source: string): source is ScraperSource {
    return this.getSupportedSources().includes(source as ScraperSource);
  }

  /**
   * Get site information for any supported source
   */
  getSiteInfo(source: ScraperSource): SiteConfig {
    return this.getSiteConfig(source);
  }

  /**
   * Get implementation status summary
   */
  static getImplementationStatus(): {
    total: number;
    implemented: number;
    planned: number;
    percentage: number;
  } {
    const total = this.getSupportedSources().length;
    const implemented = this.getImplementedSources().length;
    const planned = this.getPlannedSources().length;
    
    return {
      total,
      implemented,
      planned,
      percentage: Math.round((implemented / total) * 100)
    };
  }
}

export default ScraperFactory;