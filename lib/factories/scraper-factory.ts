/**
 * Scraper Factory - Manual Extraction
 * 
 * Unified factory pattern for creating scrapers with manual CSS selector extraction.
 * Optimized for maintainability.
 */

import { PrismaClient } from '@prisma/client';

// Database services (retained for data persistence)
import { SaveDbService as VancouverSaveDbService } from '@/scrapers/vancouverseedbank/core/save-db-service';
import { SaveDbService as SunWestSaveDbService } from '@/scrapers/sunwestgenetics/core/save-db-service';
import { SaveDbService as SonomaSeedsDbService } from '@/scrapers/sonomaseeds/core/save-db-service';
import { SaveDbService as CommonSaveDbService } from '@/scrapers/(common)/save-db-service';

// Product List Scrapers (core implementations)

import { VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS } from '@/scrapers/vancouverseedbank/core/selectors';
import { SUNWESTGENETICS_SELECTORS } from '@/scrapers/sunwestgenetics/core/selectors';
import { SONOMASEEDS_PRODUCT_CARD_SELECTORS } from '@/scrapers/sonomaseeds/core/selectors';
import { BEAVERSEED_PRODUCT_CARD_SELECTORS } from '@/scrapers/beaverseed/core/selector';


import { vancouverProductListScraper } from '@/scrapers/vancouverseedbank/core/vancouver-product-list-scraper';
import { sunwestgeneticsProductListScraper } from '@/scrapers/sunwestgenetics/core/sunwestgenetics-scrape-product-list';
import { sonomaSeedsProductListScraper } from '@/scrapers/sonomaseeds/core/sonomaseeds-product-list-scraper';
import { BeaverSeedProductListScraper } from '@/scrapers/beaverseed/core/beaver-product-list-scraper';
import { BCBUDDEPOT_PRODUCT_CARD_SELECTORS, BCBUDDEPOT_PRODUCT_DETAIL_SELECTORS } from '@/scrapers/bcbuddepot/core/selector';
import { BcbuddepotScraper } from '@/scrapers/bcbuddepot/core/bcbuddepot-scraper';



/**
 * Supported scraper sources - easily extensible for new sites
 */
export type SupportedScraperSourceName = 
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
  // Initialize seller in the database
  initializeSeller(sellerId: string): Promise<void>;
  // Get or create a category in the database
  getOrCreateCategory(categoryData: {
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
  // Core product information (required)
  productName: string;
  priceDisplay?: string;
  
  // Product structure
  productCard?: string;
  productLink?: string;
  productImage?: string;
  
  // BC Bud Depot specific selectors
  productCards?: string;
  productCardLink?: string;
  
  // Cannabis-specific selectors (match VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS)
  strainType?: string;
  badge?: string;
  
  // Rating & Reviews
  rating?: string;
  ratingAriaLabel?: string;
  reviewCount?: string;
  
  // THC & CBD (match existing selectors)
  thcLevel?: string;
  cbdLevel?: string;
  
  // Additional Info
  floweringTime?: string;
  growingLevel?: string;
  
  // Price related
  priceAmount?: string;
  variationInputs?: string;
  
  // Pagination selectors (match existing selectors)
  nextPage?: string;
  
  // WooCommerce result count for calculating total pages
  resultCount?: string;
  pageLinks?: string;
  currentPage?: string;
  paginationContainer?: string;
  paginationItems?: string;
  
  // Optional fields for extensibility
  currency?: string;
  description?: string;
  availability?: string;
  seedType?: string;
  yieldInfo?: string;
  genetics?: string;
  height?: string;
  effects?: string;
  aroma?: string;
  flavor?: string;
  tagsLinks?: string;
  
  versionsRows?: string;
  packSizeCell?: string;
  priceCell?: string;
}
/**
 * scraper configuration interface
 * giải thích các thông số ScrapeConfig:
 * - siteName: Tên của trang web cần scrape
 * - baseUrl: URL cơ sở cho trang web
 * - selectors: Các selector CSS để trích xuất dữ liệu
 * - enableCrossValidation: Bật xác thực chéo cho dữ liệu trích xuất
 * - minQualityScore: Điểm chất lượng tối thiểu cho dữ liệu trích xuất
 * - maxConcurrency: Số lượng đồng thời tối đa cho các yêu cầu
 * - maxRequestsPerMinute: Số lượng yêu cầu tối đa mỗi phút
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
  private getSiteConfig(source: SupportedScraperSourceName): SiteConfig {
    const configs: Record<SupportedScraperSourceName, SiteConfig> = {
      'vancouverseedbank': {
        name: 'Vancouver Seed Bank',
        baseUrl: 'https://vancouverseedbank.ca',
        selectors: VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS,
        isImplemented: true
      },
      'sunwestgenetics': {
        name: 'SunWest Genetics', 
        baseUrl: 'https://www.sunwestgenetics.com',
        selectors: SUNWESTGENETICS_SELECTORS,
        isImplemented: true
      },
      'sonomaseeds': {
        name: 'Sonoma Seeds',
        baseUrl: 'https://www.sonomaseeds.com',
        selectors: SONOMASEEDS_PRODUCT_CARD_SELECTORS,
        isImplemented: true
      },
      'cropkingseeds': {
        name: 'Crop King Seeds',
        baseUrl: 'https://www.cropkingseeds.ca',
        selectors: {} as ManualSelectors,
        isImplemented: true
      },
      'bcbuddepot': {
        name: 'BC Bud Depot',
        baseUrl: 'https://bcbuddepot.com',
        selectors: BCBUDDEPOT_PRODUCT_DETAIL_SELECTORS,
        isImplemented: true
      },
      'beaverseed': {
        name: 'Beaver Seeds',
        baseUrl: 'https://beaverseed.com',
        selectors: BEAVERSEED_PRODUCT_CARD_SELECTORS,
        isImplemented: true
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
  createProductListScraper(
    scraperSourceName: SupportedScraperSourceName, 
    dbMaxPage?: number,
    startPage?: number | null,
    endPage?: number | null,
    fullSiteCrawl?: boolean | null,
    sourceContext?:{
      scrapingSourceUrl:string;
      sourceName:string;
      dbMaxPage:number;
    }
  ) {
    // Lấy cấu hình trang từ siteConfig,
    const siteConfig = this.getSiteConfig(scraperSourceName);
    // Kiểm tra xem scraper đã được triển khai chưa. True là đã thiết lập, false là chưa thiếp lập
    if (!siteConfig.isImplemented) {
      throw new Error(`Scraper for ${siteConfig.name} is not yet implemented. Please implement selectors first.`);
    }
    // const selectors = siteConfig.selectors;
    // Tạo instance của product list scraper tương ứng với source
    switch (scraperSourceName) {
      case 'vancouverseedbank':
        return vancouverProductListScraper(siteConfig ,startPage, endPage, fullSiteCrawl,sourceContext); // Support startPage/endPage and fullSiteCrawl
      case 'sunwestgenetics':
        return sunwestgeneticsProductListScraper(siteConfig, dbMaxPage, startPage || undefined, endPage || undefined);
      case 'sonomaseeds':
        return sonomaSeedsProductListScraper(siteConfig, dbMaxPage); // Sonoma Seeds doesn't support startPage/endPage yet
      case 'beaverseed':
        return BeaverSeedProductListScraper(siteConfig, startPage, endPage, fullSiteCrawl, sourceContext);
      case 'bcbuddepot':
        return BcbuddepotScraper(siteConfig, startPage, endPage, fullSiteCrawl, sourceContext);
      //TODO: Thêm các scraper khác ở đây sau khi thiết lập xong
      default:
        throw new Error(`Product list scraper implementation not found for: ${scraperSourceName}`);
    }
  }


  /**
   * Create database service for supported sites
   * Giải tích chi tiết cho createSaveDbService: Hàm này dùng để tạo ra một instance của ISaveDbService tương ứng với từng nguồn dữ liệu đã được hỗ trợ. Ví dụ: với vancouverseedbank, chúng ta sẽ tạo ra một instance của VancouverSaveDbService.
   */
  createSaveDbService(scraperSourceName: SupportedScraperSourceName): ISaveDbService {
    switch (scraperSourceName) {
      case 'vancouverseedbank':
        return new VancouverSaveDbService(this.prisma);
      
      case 'sunwestgenetics':
        return new SunWestSaveDbService(this.prisma);
      
      case 'sonomaseeds':
        return new SonomaSeedsDbService(this.prisma);
      
      case 'beaverseed':
        return new CommonSaveDbService(this.prisma);
      
      case 'bcbuddepot':
        return new CommonSaveDbService(this.prisma);
      
      // case 'cropkingseeds':
      //   return new CropKingSaveDbService(this.prisma);
      
      default:
        const siteConfig = this.getSiteConfig(scraperSourceName);
        throw new Error(`Database service for ${siteConfig.name} is not yet implemented.`);
    }
  }

  /**
   * Get seller name for any supported site
   */
  getSellerName(source: SupportedScraperSourceName): string {
    return this.getSiteConfig(source).name;
  }

  /**
   * Get base URL for any supported site
   */
  getBaseUrl(source: SupportedScraperSourceName): string {
    return this.getSiteConfig(source).baseUrl;
  }

  /**
   * Check if site is implemented and ready for scraping
   */
  isImplemented(source: SupportedScraperSourceName): boolean {
    return this.getSiteConfig(source).isImplemented;
  }

  /**
   * Get all supported sources (including planned implementations)
   */
  static getSupportedSources(): SupportedScraperSourceName[] {
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
  static getImplementedSources(): SupportedScraperSourceName[] {
    return ['vancouverseedbank', 'sunwestgenetics', 'cropkingseeds'];
  }

  /**
   * Get planned sources (requiring implementation)
   */
  static getPlannedSources(): SupportedScraperSourceName[] {
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
  static isValidSource(source: string): source is SupportedScraperSourceName {
    return this.getSupportedSources().includes(source as SupportedScraperSourceName);
  }

  /**
   * Get site information for any supported source
   */
  getSiteInfo(source: SupportedScraperSourceName): SiteConfig {
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