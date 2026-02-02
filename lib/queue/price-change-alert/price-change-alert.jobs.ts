/**
 * Price Change Alert Job Types & Creators
 * 
 * Module này chứa:
 * 1. Type definitions - Data structures cho jobs
 * 2. Job creators - Helper functions để tạo jobs
 * 
 * Lý do gộp chung:
 * - Types và creators liên quan trực tiếp với nhau
 * - Import từ 1 file duy nhất
 * - Easier to maintain
 */

import { apiLogger } from '@/lib/helpers/api-logger';
import type { PriceChange } from '@/lib/services/price-alert/detectPriceChanges';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Job data cho việc gửi email thông báo giá giảm
 * 
 * @property userId - ID của user nhận thông báo
 * @property email - Email address của user
 * @property userName - Tên user (hiển thị trong email)
 * @property priceChanges - Danh sách sản phẩm có giá giảm mà user quan tâm
 */
export interface PriceAlertEmailJobData {
  userId: string;
  email: string;
  userName: string;
  priceChanges: Array<{
    productId: string;
    productName: string;
    productSlug: string;
    productImage: string;
    sellerName: string;
    sellerWebsite: string;
    variantPackSize: number;
    oldPrice: number;
    newPrice: number;
    priceChange: number;
    priceChangePercent: number;
    currency: string;
  }>;
}

/**
 * Job data cho việc detect price changes từ scraped data
 * 
 * @property sellerId - ID của seller được crawl
 * @property sellerName - Tên seller
 * @property scrapedProducts - Danh sách sản phẩm đã crawl với giá mới
 * @property scrapedAt - Timestamp khi crawl xong
 */
export interface DetectPriceChangesJobData {
  sellerId: string;
  sellerName: string;
  scrapedProducts: Array<{
    seedId?: string;
    name: string;
    url?: string; // URL to product page
    slug: string;
    imageUrl?: string;
    pricings: Array<{
      packSize: number;
      totalPrice: number;
    }>;
  }>;
  scrapedAt: Date;
}

/**
 * Union type cho tất cả price alert job types
 * Dễ dàng extend thêm job types khác trong tương lai
 */
export type PriceAlertJobData = 
  | { type: 'detect-price-changes'; data: DetectPriceChangesJobData }
  | { type: 'send-price-alert-email'; data: PriceAlertEmailJobData };

/**
 * Job names constants
 * Sử dụng constants để tránh typo và dễ refactor
 */
export const PRICE_ALERT_JOB_TYPES = {
  DETECT_PRICE_CHANGES: 'detect-price-changes',
  SEND_PRICE_ALERT_EMAIL: 'send-price-alert-email',
} as const;

// ============================================================================
// JOB CREATORS
// ============================================================================

// NOTE: Import queue ở đây để tránh circular dependency
// Queue exports jobs, jobs creates jobs → circular
// Solution: Import lazily hoặc pass queue as parameter

/**
 * Tạo job để detect price changes sau khi scraper hoàn thành
 * 
 * @param queue - Price alert queue instance
 * @param params - Job parameters
 * @returns Job ID
 * 
 * @example
 * import { priceAlertQueue } from './price-change-alert.queue';
 * import { createDetectPriceChangesJob } from './price-change-alert.jobs';
 * 
 * await createDetectPriceChangesJob(priceAlertQueue, {
 *   sellerId: 'seller-123',
 *   sellerName: 'Seed Supreme',
 *   scrapedProducts: savedProducts
 * });
 */
export async function createDetectPriceChangesJob(
  queue: any, // Queue type to avoid circular dependency
  params: {
    sellerId: string;
    sellerName: string;
    scrapedProducts: Array<{
      seedId?: string;
      name: string;
      slug: string;
      imageUrl?: string;
      pricings: Array<{
        packSize: number;
        totalPrice: number;
      }>;
    }>;
  }
): Promise<string> {
  const { sellerId, sellerName, scrapedProducts } = params;

  // Filter out products without seedId
  const validProducts = scrapedProducts.filter(p => p.seedId);

  if (validProducts.length === 0) {
    apiLogger.info('[Price Alert Jobs] No valid products, skipping detection', {
      sellerId,
      totalScraped: scrapedProducts.length,
    });
    throw new Error('No valid products to detect price changes');
  }

  const jobData: DetectPriceChangesJobData = {
    sellerId,
    sellerName,
    scrapedProducts: validProducts.map(p => ({
      seedId: p.seedId,
      name: p.name,
      slug: p.slug,
      imageUrl: p.imageUrl,
      pricings: p.pricings,
    })),
    scrapedAt: new Date(),
  };

  const job = await queue.add({
    type: PRICE_ALERT_JOB_TYPES.DETECT_PRICE_CHANGES,
    data: jobData,
  });

  apiLogger.info('[Price Alert Jobs] Detect job created', {
    jobId: job.id,
    sellerId,
    productCount: validProducts.length,
  });

  return job.id.toString();
}

/**
 * Tạo job để gửi email thông báo giá giảm cho 1 user
 * 
 * @param queue - Price alert queue instance
 * @param params - Job parameters
 * @returns Job ID
 */
export async function createPriceAlertEmailJob(
  queue: any,
  params: {
    userId: string;
    email: string;
    userName: string;
    priceChanges: PriceChange[];
  }
): Promise<string> {
  const { userId, email, userName, priceChanges } = params;

  if (priceChanges.length === 0) {
    throw new Error('No price changes to notify');
  }

  const jobData: PriceAlertEmailJobData = {
    userId,
    email,
    userName,
    priceChanges: priceChanges.map(change => ({
      productId: change.productId,
      productName: change.productName,
      productSlug: change.productSlug,
      productImage: change.productImage,
      sellerName: change.sellerName,
      sellerWebsite: change.sellerWebsite,
      variantPackSize: change.variantPackSize,
      oldPrice: change.oldPrice,
      newPrice: change.newPrice,
      priceChange: change.priceChange,
      priceChangePercent: change.priceChangePercent,
      currency: change.currency,
    })),
  };

  const job = await queue.add({
    type: PRICE_ALERT_JOB_TYPES.SEND_PRICE_ALERT_EMAIL,
    data: jobData,
  });

  apiLogger.info('[Price Alert Jobs] Email job created', {
    jobId: job.id,
    userId,
    email,
    changesCount: priceChanges.length,
  });

  return job.id.toString();
}

/**
 * Tạo nhiều email jobs cho nhiều users (bulk operation)
 * 
 * @param queue - Price alert queue instance
 * @param usersWithChanges - Array of users with their price changes
 * @returns Array of job IDs
 */
export async function batchCreateEmailJobs(
  queue: any,
  usersWithChanges: Array<{
    userId: string;
    email: string;
    userName: string;
    priceChanges: PriceChange[];
  }>
): Promise<string[]> {
  if (usersWithChanges.length === 0) {
    return [];
  }

  const jobs = usersWithChanges.map(user => ({
    name: PRICE_ALERT_JOB_TYPES.SEND_PRICE_ALERT_EMAIL,
    data: {
      type: PRICE_ALERT_JOB_TYPES.SEND_PRICE_ALERT_EMAIL,
      data: {
        userId: user.userId,
        email: user.email,
        userName: user.userName,
        priceChanges: user.priceChanges.map(change => ({
          productId: change.productId,
          productName: change.productName,
          productSlug: change.productSlug,
          productImage: change.productImage,
          sellerName: change.sellerName,
          sellerWebsite: change.sellerWebsite,
          variantPackSize: change.variantPackSize,
          oldPrice: change.oldPrice,
          newPrice: change.newPrice,
          priceChange: change.priceChange,
          priceChangePercent: change.priceChangePercent,
          currency: change.currency,
        })),
      },
    },
  }));

  const createdJobs = await queue.addBulk(jobs);

  apiLogger.info('[Price Alert Jobs] Batch email jobs created', {
    jobCount: createdJobs.length,
    userCount: usersWithChanges.length,
  });

  return createdJobs.map((job: any) => job.id.toString());
}
