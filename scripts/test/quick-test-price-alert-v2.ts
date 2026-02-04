/**
 * Quick Price Alert Test v2
 * Tests price detection with real user and Sunwest Genetics products
 * 
 * User: cml5vao0s000084sbzwynzevz
 * Seller: Sunwest Genetics (cmjqyh6j90000d8sb4y1d3h8e)
 * 
 * What it does:
 * 1. Verifies user exists and has price alerts enabled
 * 2. Finds user's Sunwest Genetics wishlist items
 * 3. Selects 2 products to test
 * 4. Gets current pricing from database
 * 5. Simulates scraped data with 20% price drop
 * 6. Triggers price detection job (comparison happens in worker)
 * 7. Monitors job status
 * 
 * Usage:
 *   pnpm tsx scripts/test/quick-test-price-alert-v2.ts
 */

import { prisma } from '@/lib/prisma';
import { detectPriceChangesQueue, createDetectPriceChangesJob } from '@/lib/queue/detect-price-changes';
import { apiLogger } from '@/lib/helpers/api-logger';
import type { ScrapedProductWithSeller } from '@/lib/services/price-alert/detectPriceChanges';

const TEST_USER_ID = 'cml5vao0s000084sbzwynzevz';
const SUNWEST_SELLER_ID = 'cmjoskrq40000rksbn4hm8ixt'; // Sunwest genetics (lowercase)

async function main() {
  console.log('\n🧪 ===== QUICK PRICE ALERT TEST =====\n');

  try {
    // Step 1: Verify user exists
    console.log('📋 Step 1: Verifying user...');
    const user = await prisma.user.findUnique({
      where: { id: TEST_USER_ID },
      include: {
        notificationPreference: true
      }
    });

    if (!user) {
      throw new Error(`User ${TEST_USER_ID} not found`);
    }

    console.log(`✅ User found: ${user.email}`);
    
    const priceAlertsEnabled = user.notificationPreference?.receivePriceAlerts ?? false;
    console.log(`   Price alerts: ${priceAlertsEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
    
    if (!priceAlertsEnabled) {
      console.log('   ⚠️  Warning: Price alerts disabled. Email will not be sent!');
      console.log('   Enable with: UPDATE "NotificationPreference" SET "receivePriceAlerts" = true WHERE "userId" = \'' + TEST_USER_ID + '\';');
    }

    // Step 2: Get user's wishlist items for Sunwest Genetics
    console.log('\n📋 Step 2: Finding Sunwest Genetics wishlist items...');
    const wishlistItems = await prisma.wishlist.findMany({
      where: {
        userId: TEST_USER_ID,
        seedProduct: {
          sellerId: SUNWEST_SELLER_ID
        }
      },
      include: {
        seedProduct: {
          include: {
            seller: true,
            pricings: true,
            productImages: {
              take: 1,
              include: {
                image: true
              }
            }
          }
        }
      },
      take: 4
    });

    if (wishlistItems.length === 0) {
      throw new Error('No Sunwest Genetics products in wishlist. Add some products first.');
    }

    console.log(`✅ Found ${wishlistItems.length} wishlist items:`);
    wishlistItems.forEach((item, idx) => {
      const product = item.seedProduct;
      console.log(`   ${idx + 1}. ${product.name} (${product.pricings.length} pricing variants)`);
    });

    // Step 3: Select 2 products to test
    const productsToTest = wishlistItems.slice(0, 2);
    console.log(`\n🎯 Step 3: Testing with ${productsToTest.length} products:`);
    
    productsToTest.forEach((item, idx) => {
      const product = item.seedProduct;
      console.log(`   ${idx + 1}. ${product.name}`);
      console.log(`      Current prices: ${product.pricings.map(p => `${p.packSize} seeds = $${p.totalPrice}`).join(', ')}`);
    });

    // Step 4: Get seller info
    const seller = productsToTest[0].seedProduct.seller;
    console.log(`\n📦 Step 4: Seller info:`);
    console.log(`   Name: ${seller.name}`);
    console.log(`   ID: ${seller.id}`);

    // Step 5: Simulate scraped data with 20% price drop
    console.log('\n💰 Step 5: Simulating scraped data with 20% price drop...');
    
    const scrapedProducts: ScrapedProductWithSeller[] = productsToTest.map(item => {
      const product = item.seedProduct;
      const imageUrl = product.productImages[0]?.image.url || 'https://via.placeholder.com/300';
      
      return {
        seedId: product.id,
        name: product.name,
        url: product.url,
        slug: product.slug,
        imageUrl: imageUrl,
        pricings: product.pricings.map(p => ({
          packSize: p.packSize,
          totalPrice: Math.round(p.totalPrice * 0.80 * 100) / 100, // 20% drop
          pricePerSeed: Math.round(p.pricePerSeed * 0.80 * 100) / 100
        })),
        sellerId: seller.id,
        sellerName: seller.name,
        sellerWebsite: seller.url
      };
    });

    scrapedProducts.forEach((scraped, idx) => {
      console.log(`\n   Product ${idx + 1}: ${scraped.name}`);
      const original = productsToTest[idx].seedProduct;
      original.pricings.forEach((p, pIdx) => {
        const oldPrice = p.totalPrice;
        const newPrice = scraped.pricings[pIdx].totalPrice;
        const drop = oldPrice - newPrice;
        const percent = (drop / oldPrice * 100).toFixed(1);
        console.log(`      ${p.packSize} seeds: $${oldPrice} → $${newPrice} (-$${drop.toFixed(2)} / -${percent}%)`);
      });
    });

    // Step 6: Create price detection job
    console.log('\n🚀 Step 6: Creating price detection job...');
    const jobId = await createDetectPriceChangesJob({
      sellerId: seller.id,
      sellerName: seller.name,
      scrapedProducts: scrapedProducts,
      scrapedAt: new Date()
    });

    console.log(`✅ Job created: ${jobId}`);

    // Step 7: Monitor job
    console.log('\n⏳ Step 7: Monitoring job...');
    const job = await detectPriceChangesQueue.getJob(jobId);
    
    if (!job) {
      throw new Error('Job not found in queue');
    }

    const timeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const state = await job.getState();
      
      if (state === 'completed') {
        console.log('✅ Job completed!');
        const result = await job.finished();
        console.log('\n📊 Result:');
        console.log(JSON.stringify(result, null, 2));
        break;
      } else if (state === 'failed') {
        console.log(`❌ Job failed: ${job.failedReason}`);
        break;
      }

      console.log(`   Status: ${state}...`);
      await new Promise(r => setTimeout(r, 2000));
    }

    if (Date.now() - startTime >= timeout) {
      console.log('⏰ Timeout - job still processing');
    }

    // Step 8: Check for email jobs
    console.log('\n📧 Step 8: Checking for email jobs...');
    const { sendPriceAlertQueue } = await import('@/lib/queue/send-price-alert');
    const emailJobs = await sendPriceAlertQueue.getJobs(['waiting', 'active', 'completed']);
    
    const relevantEmailJobs = emailJobs.filter(j => 
      j.data.userId === TEST_USER_ID
    );

    console.log(`   Total email jobs: ${emailJobs.length}`);
    console.log(`   Jobs for test user: ${relevantEmailJobs.length}`);

    if (relevantEmailJobs.length > 0) {
      console.log('\n   📬 Email job details:');
      for (const emailJob of relevantEmailJobs) {
        const state = await emailJob.getState();
        console.log(`      Job ${emailJob.id}: ${state}`);
        console.log(`      To: ${emailJob.data.email}`);
        console.log(`      Price changes: ${emailJob.data.priceChanges?.length || 0}`);
      }
    }

    // Step 9: Display monitoring commands
    console.log('\n\n📋 === MONITORING COMMANDS ===\n');
    console.log('Worker logs:');
    console.log('  docker logs goodseed-worker --follow | grep -E "Price|Email"');
    console.log('\nRedis CLI (detect-price-changes queue):');
    console.log('  docker exec -it goodseed-redis redis-cli');
    console.log('  LLEN bull:detect-price-changes:waiting');
    console.log('  LLEN bull:detect-price-changes:completed');
    console.log('\nRedis CLI (send-price-alert queue):');
    console.log('  LLEN bull:send-price-alert:waiting');
    console.log('  LLEN bull:send-price-alert:completed');
    console.log('\nCheck user email inbox:');
    console.log(`  Email: ${user.email}`);
    console.log('  Subject: "Price Drop Alert 🔥"');
    console.log('\n');

  } catch (error) {
    apiLogger.logError('[Test] Error:', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
