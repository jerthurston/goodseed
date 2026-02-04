/**
 * Detect Price Changes Job Types & Creators
 * 
 * Purpose: Create jobs to detect price changes from scraped product data
 * 
 * @module lib/queue/detect-price-changes
 */

import { apiLogger } from '@/lib/helpers/api-logger';
import detectPriceChangesQueue from './detect-price-changes.queue';

// ============================================================================
// JOB DATA INTERFACE
// ============================================================================

/**
 * Detect Price Changes Job Data
 * 
 * Triggered by: Scraper job completion
 * Purpose: Compare scraped prices with database prices
 * Output: List of price changes and affected users
 * Next: Emits send-price-alert jobs (one per user)
 */
export interface DetectPriceChangesJobData {
  sellerId: string;
  sellerName: string;
  scrapedProducts: Array<{
    seedId?: string;
    name: string;
    url?: string;
    slug: string;
    imageUrl?: string;
    pricings: Array<{
      packSize: number;
      totalPrice: number;
    }>;
  }>;
  scrapedAt: Date;
}

// ============================================================================
// JOB CREATOR
// ============================================================================

/**
 * Create DETECT_PRICE_CHANGES job
 * 
 * Called by: Scraper job completion event handler
 * Purpose: Detect price changes from freshly scraped data
 * 
 * @param params - Scraped product data
 * @returns Job ID
 * 
 * @example
 * ```typescript
 * // In scraper worker after scraping completes:
 * await createDetectPriceChangesJob({
 *   sellerId: 'truenorthseedbank',
 *   sellerName: 'True North Seed Bank',
 *   scrapedProducts: products,
 *   scrapedAt: new Date(),
 * });
 * ```
 */
export async function createDetectPriceChangesJob(
  params: DetectPriceChangesJobData
): Promise<string> {
  const { 
    sellerId, 
    sellerName, 
    scrapedProducts 
  } = params;

  // Filter out products without seedId
  const validProducts = scrapedProducts.filter(p => p.seedId);

  if (validProducts.length === 0) {
    apiLogger.info('[Detect Price Changes Jobs] No valid products, skipping detection', {
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

  const job = await detectPriceChangesQueue.add(jobData);

  apiLogger.info('[Detect Price Changes Jobs] Job created', {
    jobId: job.id,
    sellerId,
    productCount: validProducts.length,
  });

  return job.id.toString();
}
