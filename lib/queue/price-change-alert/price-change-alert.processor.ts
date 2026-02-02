/**
 * Price Change Alert Queue Processor
 * 
 * Xử lý các job trong price alert queue:
 * 1. Detect price changes - So sánh giá mới với giá cũ
 * 2. Send price alert emails - Gửi email thông báo cho users
 */

import { Job } from 'bull';
import { apiLogger } from '@/lib/helpers/api-logger';
import { 
  detectPriceChanges, 
  findUsersToNotify,
  type ScrapedProductWithSeller,
  type PriceChange,
} from '@/lib/services/marketing/price-alert/detectPriceChanges';
import { 
  PriceAlertJobData, 
  DetectPriceChangesJobData,
  PriceAlertEmailJobData,
  PRICE_ALERT_JOB_TYPES,
} from './price-change-alert.jobs';
import priceAlertQueue from './price-change-alert.queue';

/**
 * Main Processor
 * Route job đến handler phù hợp dựa trên job type
 */
export async function processPriceAlertJob(job: Job<PriceAlertJobData>) {
  const { type } = job.data;

  apiLogger.info(`[Price Alert Processor] Processing job`, {
    jobId: job.id,
    type,
    attemptsMade: job.attemptsMade,
  });

  try {
    switch (type) {
      case PRICE_ALERT_JOB_TYPES.DETECT_PRICE_CHANGES:
        return await handleDetectPriceChanges(job.data.data);
      
      case PRICE_ALERT_JOB_TYPES.SEND_PRICE_ALERT_EMAIL:
        return await handleSendPriceAlertEmail(job.data.data);
      
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  } catch (error) {
    apiLogger.logError(
      `[Price Alert Processor] Job failed`,
      error instanceof Error ? error : new Error('Unknown error'),
      {
        jobId: job.id,
        type,
      }
    );
    throw error; // Re-throw để Bull retry
  }
}

/**
 * Handler 1: Detect Price Changes
 * 
 * Flow:
 * 1. Nhận scraped products từ job data
 * 2. So sánh với giá hiện tại trong database
 * 3. Lọc ra những giảm giá đáng kể (≥5%)
 * 4. Tìm users cần notify
 * 5. Tạo email jobs cho từng user
 */
async function handleDetectPriceChanges(
  data: DetectPriceChangesJobData
): Promise<void> {
  const { sellerId, sellerName, scrapedProducts, scrapedAt } = data;

  apiLogger.info(`[Detect Price Changes] Processing seller`, {
    sellerId,
    sellerName,
    productCount: scrapedProducts.length,
  });

  // Step 1: Format scraped products với seller info
  const productsWithSeller: ScrapedProductWithSeller[] = scrapedProducts.map(p => ({
    name: p.name,
    url: '', // Will be constructed from slug if needed
    slug: p.slug,
    imageUrl: p.imageUrl,
    seedId: p.seedId,
    pricings: p.pricings.map(pricing => ({
      packSize: pricing.packSize,
      totalPrice: pricing.totalPrice,
      pricePerSeed: pricing.totalPrice / pricing.packSize, // Calculate pricePerSeed
    })),
    sellerId,
    sellerName,
    sellerWebsite: '', // TODO: Add seller website from database
  }));

  // Step 2: Detect price changes (≥5% drops)
  const priceChanges = await detectPriceChanges(productsWithSeller);

  if (priceChanges.length === 0) {
    apiLogger.info(`[Detect Price Changes] No significant price changes found`, {
      sellerId,
      sellerName,
    });
    return;
  }

  apiLogger.info(`[Detect Price Changes] Found price changes`, {
    sellerId,
    sellerName,
    changesCount: priceChanges.length,
    products: priceChanges.map(c => ({
      name: c.productName,
      oldPrice: c.oldPrice,
      newPrice: c.newPrice,
      percent: c.priceChangePercent,
    })),
  });

  // Step 3: Get unique product IDs
  const productIds = [...new Set(priceChanges.map(c => c.productId))];

  // Step 4: Find users to notify
  const usersToNotify = await findUsersToNotify(productIds);

  if (usersToNotify.length === 0) {
    apiLogger.info(`[Detect Price Changes] No users to notify`, {
      sellerId,
      productIds,
    });
    return;
  }

  apiLogger.info(`[Detect Price Changes] Creating email jobs`, {
    usersCount: usersToNotify.length,
  });

  // Step 5: Create email job cho từng user
  // Mỗi user nhận 1 email với danh sách các sản phẩm yêu thích có giá giảm
  for (const user of usersToNotify) {
    // Lọc price changes chỉ cho các sản phẩm user favourite
    const userPriceChanges = priceChanges.filter(change =>
      user.favouriteSeeds.some(seed => seed.id === change.productId)
    );

    // Tạo email job
    await priceAlertQueue.add({
      type: PRICE_ALERT_JOB_TYPES.SEND_PRICE_ALERT_EMAIL,
      data: {
        userId: user.userId,
        email: user.email,
        userName: user.name,
        priceChanges: userPriceChanges,
      },
    });
  }

  apiLogger.info(`[Detect Price Changes] Email jobs created`, {
    emailJobsCreated: usersToNotify.length,
  });
}

/**
 * Handler 2: Send Price Alert Email
 * 
 * Flow:
 * 1. Nhận user info và price changes
 * 2. Generate email HTML từ template
 * 3. Gửi email qua email service
 * 4. Log kết quả
 */
async function handleSendPriceAlertEmail(
  data: PriceAlertEmailJobData
): Promise<void> {
  const { userId, email, userName, priceChanges } = data;

  apiLogger.info(`[Send Price Alert Email] Sending email`, {
    userId,
    email,
    changesCount: priceChanges.length,
  });

  try {
    // TODO: Implement email sending logic
    // - Load email template
    // - Inject price changes data
    // - Send via email service (Resend, SendGrid, etc.)
    
    // Placeholder log
    apiLogger.info(`[Send Price Alert Email] Email sent successfully`, {
      userId,
      email,
      productsCount: priceChanges.length,
    });

    // Example email content structure:
    /*
    Subject: 🎉 Price Drop Alert! Your Favorite Seeds are on Sale
    
    Hi {userName},
    
    Good news! Some seeds in your wishlist just dropped in price:
    
    {priceChanges.map(change => `
      - {productName}
        {sellerName}: ${oldPrice} → ${newPrice} ({priceChangePercent}% off)
        [View Product]({productUrl})
    `)}
    
    Don't miss out on these deals!
    */

  } catch (error) {
    apiLogger.logError(
      `[Send Price Alert Email] Failed to send email`,
      error instanceof Error ? error : new Error('Unknown error'),
      {
        userId,
        email,
      }
    );
    throw error; // Re-throw để Bull retry
  }
}

/**
 * Export processor function
 * Được sử dụng bởi worker để process jobs
 */
export default processPriceAlertJob;
