/**
 * Send Price Alert Email Job Types & Creators
 * 
 * Purpose: Create jobs to send price alert emails to users
 * 
 * @module lib/queue/send-price-alert
 */

import { apiLogger } from '@/lib/helpers/api-logger';
import type { PriceChange } from '@/lib/services/price-alert/detectPriceChanges';
import sendPriceAlertQueue from './send-price-alert.queue';

// ============================================================================
// JOB DATA INTERFACE
// ============================================================================

/**
 * Send Price Alert Email Job Data
 * 
 * Triggered by: detect-price-changes job completion
 * Purpose: Send price alert email to individual user
 * Output: Email sent status
 * Next: None (terminal step)
 */
export interface SendPriceAlertEmailJobData {
  userId: string;
  email: string;
  userName: string;
  priceChanges: Array<{
    productId: string;
    productName: string;
    productSlug: string;
    productImage: string;
    productUrl: string;
    sellerName: string;
    sellerWebsite: string;
    affiliateTag?: string;
    variantPackSize: number;
    oldPrice: number;
    newPrice: number;
    priceChange: number;
    priceChangePercent: number;
    currency: string;
  }>;
}

// ============================================================================
// JOB CREATORS
// ============================================================================

/**
 * Create single price alert email job
 * 
 * @param params - User and price change data
 * @returns Job ID
 */
export async function createPriceAlertEmailJob(
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

  const jobData: SendPriceAlertEmailJobData = {
    userId,
    email,
    userName,
    priceChanges: priceChanges.map(change => ({
      productId: change.productId,
      productName: change.productName,
      productSlug: change.productSlug,
      productImage: change.productImage,
      productUrl: change.productUrl,
      sellerName: change.sellerName,
      sellerWebsite: change.sellerWebsite,
      affiliateTag: change.affiliateTag,
      variantPackSize: change.variantPackSize,
      oldPrice: change.oldPrice,
      newPrice: change.newPrice,
      priceChange: change.priceChange,
      priceChangePercent: change.priceChangePercent,
      currency: change.currency,
    })),
  };

  const job = await sendPriceAlertQueue.add(jobData);

  apiLogger.info('[Send Price Alert Jobs] Email job created', {
    jobId: job.id,
    userId,
    email,
    changesCount: priceChanges.length,
  });

  return job.id.toString();
}

/**
 * Batch create email jobs for multiple users
 * 
 * @param usersWithChanges - Array of users with their price changes
 * @returns Array of job IDs
 * 
 * @example
 * ```typescript
 * // In detect-price-changes processor:
 * await batchCreatePriceAlertEmailJobs([
 *   {
 *     userId: 'user1',
 *     email: 'user1@example.com',
 *     userName: 'John Doe',
 *     priceChanges: [...]
 *   },
 *   // ... more users
 * ]);
 * ```
 */
export async function batchCreatePriceAlertEmailJobs(
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
    data: {
      userId: user.userId,
      email: user.email,
      userName: user.userName,
      priceChanges: user.priceChanges.map(change => ({
        productId: change.productId,
        productName: change.productName,
        productSlug: change.productSlug,
        productImage: change.productImage,
        productUrl: change.productUrl,
        sellerName: change.sellerName,
        sellerWebsite: change.sellerWebsite,
        affiliateTag: change.affiliateTag,
        variantPackSize: change.variantPackSize,
        oldPrice: change.oldPrice,
        newPrice: change.newPrice,
        priceChange: change.priceChange,
        priceChangePercent: change.priceChangePercent,
        currency: change.currency,
      })),
    },
  }));

  const createdJobs = await sendPriceAlertQueue.addBulk(jobs);

  apiLogger.info('[Send Price Alert Jobs] Batch email jobs created', {
    jobCount: createdJobs.length,
    userCount: usersWithChanges.length,
  });

  return createdJobs.map((job: any) => job.id.toString());
}
