/**
 * Detect Price Changes Queue Processor
 * 
 * Purpose: Detect price drops from scraped product data
 * Input: Scraped products with pricings
 * Output: List of price changes and email jobs created
 * 
 * Pipeline Flow:
 * 1. Receive scraped products from job data
 * 2. Compare with current database prices
 * 3. Filter significant price drops (≥5%)
 * 4. Find users who favorited these products
 * 5. Emit send-price-alert jobs (one per user)
 * 
 * @module lib/queue/detect-price-changes
 */

import { Job } from 'bull';
import { apiLogger } from '@/lib/helpers/api-logger';
import { 
  detectPriceChanges, 
  findUsersToNotify,
} from '@/lib/services/price-alert/detectPriceChanges';
import { batchCreatePriceAlertEmailJobs } from '@/lib/queue/send-price-alert';
import type { DetectPriceChangesJobData } from './detect-price-changes.jobs';

/**
 * Detect Price Changes Processor
 * 
 * Steps:
 * 1. Format scraped products with seller info
 * 2. Detect price changes (≥5% drops)
 * 3. Get unique product IDs
 * 4. Find users who favorited these products
 * 5. Prepare user-specific price changes
 * 6. Emit email jobs (bulk operation for efficiency)
 */
export async function processDetectPriceChangesJob(
  job: Job<DetectPriceChangesJobData>
): Promise<{
  priceChangesDetected: number;
  usersToNotify: number;
  emailJobsCreated: number;
}> {
  const { sellerId, sellerName, scrapedProducts } = job.data;

  apiLogger.info(`[Detect Price Changes Processor] Processing seller`, {
    jobId: job.id,
    sellerId,
    sellerName,
    productCount: scrapedProducts.length,
  });

  try {
    // Step 1: Extract seed IDs from scraped products
    const seedIds = scrapedProducts
      .map(p => p.seedId)
      .filter((id): id is string => id !== undefined);

    if (seedIds.length === 0) {
      apiLogger.warn(`[Detect Price Changes Processor] No valid seed IDs found`, {
        jobId: job.id,
        sellerId,
        sellerName,
      });
      return {
        priceChangesDetected: 0,
        usersToNotify: 0,
        emailJobsCreated: 0,
      };
    }

    apiLogger.info(`[Detect Price Changes Processor] Detecting price changes`, {
      jobId: job.id,
      sellerId,
      sellerName,
      seedCount: seedIds.length,
    });

    // Step 2: Detect price changes (≥5% drops)
    // Compares current DB prices (just updated by scraper) with historical prices
    const priceChanges = await detectPriceChanges(seedIds);

    if (priceChanges.length === 0) {
      apiLogger.info(`[Detect Price Changes Processor] No significant price changes found`, {
        jobId: job.id,
        sellerId,
        sellerName,
      });
      return {
        priceChangesDetected: 0,
        usersToNotify: 0,
        emailJobsCreated: 0,
      };
    }

    apiLogger.info(`[Detect Price Changes Processor] Found price changes`, {
      jobId: job.id,
      sellerId,
      sellerName,
      changesCount: priceChanges.length,
      topChanges: priceChanges.slice(0, 5).map(c => ({
        name: c.productName,
        oldPrice: c.oldPrice,
        newPrice: c.newPrice,
        percent: `${c.priceChangePercent.toFixed(1)}%`,
      })),
    });

    // Step 3: Get unique product IDs
    const productIds = [...new Set(priceChanges.map(c => c.productId))];

    // Step 4: Find users who favorited these products
    const usersToNotify = await findUsersToNotify(productIds);

    if (usersToNotify.length === 0) {
      apiLogger.info(`[Detect Price Changes Processor] No users to notify`, {
        jobId: job.id,
        sellerId,
        productIds: productIds.slice(0, 10), // Log first 10 only
      });
      return {
        priceChangesDetected: priceChanges.length,
        usersToNotify: 0,
        emailJobsCreated: 0,
      };
    }

    apiLogger.info(`[Detect Price Changes Processor] Creating email jobs`, {
      jobId: job.id,
      usersCount: usersToNotify.length,
    });

    // Step 5: Prepare user-specific price changes
    const usersWithChanges = usersToNotify.map(user => {
      // Filter price changes for products this user has favorited
      const userPriceChanges = priceChanges.filter(change =>
        user.favouriteSeeds.some((seed: any) => seed.id === change.productId)
      );

      return {
        userId: user.userId,
        email: user.email,
        userName: user.name,
        priceChanges: userPriceChanges,
      };
    }).filter(user => user.priceChanges.length > 0); // Only users with actual changes

    // Step 6: Emit email jobs (bulk operation for efficiency)
    const emailJobIds = await batchCreatePriceAlertEmailJobs(usersWithChanges);

    apiLogger.info(`[Detect Price Changes Processor] Completed`, {
      jobId: job.id,
      sellerId,
      priceChangesDetected: priceChanges.length,
      usersToNotify: usersWithChanges.length,
      emailJobsCreated: emailJobIds.length,
    });

    return {
      priceChangesDetected: priceChanges.length,
      usersToNotify: usersWithChanges.length,
      emailJobsCreated: emailJobIds.length,
    };
  } catch (error) {
    apiLogger.logError(
      `[Detect Price Changes Processor] Job failed`,
      error instanceof Error ? error : new Error('Unknown error'),
      {
        jobId: job.id,
        sellerId,
      }
    );
    throw error; // Re-throw to trigger Bull retry
  }
}

export default processDetectPriceChangesJob;
