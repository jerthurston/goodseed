/**
 * Simple Test Script: Price Alert Job Creation & Monitoring
 * 
 * This script:
 * 1. Finds existing products with pricings
 * 2. Simulates price drop
 * 3. Creates price detection job
 * 4. Monitors job processing
 * 
 * Usage:
 * pnpm tsx scripts/test/test-price-alert-simple.ts
 */

import { prisma } from '@/lib/prisma';
import { detectPriceChangesQueue, createDetectPriceChangesJob } from '@/lib/queue/detect-price-changes';
import { apiLogger } from '@/lib/helpers/api-logger';
import type { ScrapedProductWithSeller } from '@/lib/services/price-alert/detectPriceChanges';

async function main() {
  console.log('\n🧪 ===== PRICE ALERT TEST =====\n');

  try {
    // Find product with pricing
    const product = await prisma.seedProduct.findFirst({
      where: {
        pricings: {
          some: {}
        }
      },
      include: {
        seller: true,
        pricings: { take: 2 }
      }
    });

    if (!product || product.pricings.length === 0) {
      console.log('❌ No products found. Please run scraper first.');
      return;
    }

    console.log('✅ Found test product:', {
      name: product.name,
      seller: product.seller.name,
      pricings: product.pricings.length
    });

    // Simulate 20% price drop
    const scrapedProducts: ScrapedProductWithSeller[] = [{
      name: product.name,
      url: product.url,
      slug: product.slug,
      imageUrl: 'https://via.placeholder.com/300',
      pricings: product.pricings.map(p => ({
        packSize: p.packSize,
        totalPrice: p.totalPrice * 0.8,  // 20% drop
        pricePerSeed: p.pricePerSeed * 0.8,
      })),
      sellerId: product.seller.id,
      sellerName: product.seller.name,
      sellerWebsite: product.seller.url,
      seedId: product.id,
    }];

    console.log('\n💰 Simulating 20% price drop...');
    product.pricings.forEach(p => {
      console.log(`  - ${p.packSize} seeds: $${p.totalPrice} → $${(p.totalPrice * 0.8).toFixed(2)}`);
    });

    // Create job
    console.log('\n🚀 Creating price detection job...');
    const jobId = await createDetectPriceChangesJob({
      sellerId: product.seller.id,
      sellerName: product.seller.name,
      scrapedProducts: scrapedProducts.map(p => ({
        seedId: p.seedId,
        name: p.name,
        slug: p.slug,
        imageUrl: p.imageUrl,
        pricings: p.pricings,
      })),
      scrapedAt: new Date(),
    });

    console.log(`✅ Job created: ${jobId}`);

    // Monitor job
    console.log('\n⏳ Waiting for job processing...');
    const job = await detectPriceChangesQueue.getJob(jobId);
    
    if (!job) {
      console.log('❌ Job not found in queue');
      return;
    }

    // Wait max 30 seconds
    const timeout = 30000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const state = await job.getState();
      
      if (state === 'completed') {
        console.log('✅ Job completed!');
        const result = await job.finished();
        console.log('\n📊 Result:', JSON.stringify(result, null, 2));
        break;
      } else if (state === 'failed') {
        console.log(`❌ Job failed: ${job.failedReason}`);
        break;
      }

      console.log(`  Status: ${state}...`);
      await new Promise(r => setTimeout(r, 2000));
    }

    if (Date.now() - startTime >= timeout) {
      console.log('⏰ Timeout - job still processing');
    }

    // Check for email jobs (from send-price-alert queue)
    console.log('\n📧 Checking for email jobs...');
    const { sendPriceAlertQueue } = await import('@/lib/queue/send-price-alert');
    const emailJobs = await sendPriceAlertQueue.getJobs(['waiting', 'active']);
    console.log(`Found ${emailJobs.length} email job(s)`);

    // Queue stats
    const [detectWaiting, detectActive, detectCompleted, detectFailed] = await Promise.all([
      detectPriceChangesQueue.getWaitingCount(),
      detectPriceChangesQueue.getActiveCount(),
      detectPriceChangesQueue.getCompletedCount(),
      detectPriceChangesQueue.getFailedCount(),
    ]);

    const [emailWaiting, emailActive, emailCompleted, emailFailed] = await Promise.all([
      sendPriceAlertQueue.getWaitingCount(),
      sendPriceAlertQueue.getActiveCount(),
      sendPriceAlertQueue.getCompletedCount(),
      sendPriceAlertQueue.getFailedCount(),
    ]);

    console.log('\n📊 Queue Stats:');
    console.log('  Detect Price Changes Queue:', {
      waiting: detectWaiting,
      active: detectActive,
      completed: detectCompleted,
      failed: detectFailed,
    });
    console.log('  Send Email Queue:', {
      waiting: emailWaiting,
      active: emailActive,
      completed: emailCompleted,
      failed: emailFailed,
    });

    console.log('\n✅ Test completed!');
    console.log('\n💡 Next steps:');
    console.log('1. Start worker: pnpm run worker');
    console.log('2. Watch logs: docker logs goodseed-worker --follow');
    console.log('3. Email jobs will be processed automatically\n');

    // Cleanup
    await sendPriceAlertQueue.close();

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await detectPriceChangesQueue.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
