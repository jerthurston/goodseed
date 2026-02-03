/**
 * Quick Test: Price Alert Pipeline
 * 
 * Purpose: Test complete price alert flow with existing user and wishlist
 * 
 * Usage:
 *   pnpm tsx scripts/test/quick-test-price-alert.ts
 * 
 * What it does:
 *   1. Find user's wishlist items
 *   2. Select 2 products from Sunwest Genetics
 *   3. Inject mock pricing with 20% drop
 *   4. Trigger price detection
 *   5. Monitor worker logs
 */

import { prisma } from '@/lib/prisma';
import { createDetectPriceChangesJob } from '@/lib/queue/detect-price-changes';
import { apiLogger } from '@/lib/helpers/api-logger';

const TEST_USER_ID = 'cml5vao0s000084sbzwynzevz';
const SUNWEST_SELLER_ID = 'cmjqyh6j90000d8sb4y1d3h8e'; // Sunwest Genetics

async function quickTestPriceAlert() {
  console.log('🧪 Quick Price Alert Test\n');
  console.log('═'.repeat(60));

  try {
    // Step 1: Verify user exists
    console.log('\n📋 Step 1: Verifying test user...');
    const user = await prisma.user.findUnique({
      where: { id: TEST_USER_ID },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      console.error('❌ User not found:', TEST_USER_ID);
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);

    // Step 2: Get user's wishlist items for Sunwest Genetics
    console.log('\n📋 Step 2: Finding wishlist items for Sunwest Genetics...');
    const wishlistItems = await prisma.wishlist.findMany({
      where: {
        userId: TEST_USER_ID,
        seedProduct: {
          sellerId: SUNWEST_SELLER_ID
        }
      },
      include: {
        seedProduct: {
          select: {
            id: true,
            name: true,
            slug: true,
            sellerId: true
          }
        }
      },
      take: 4
    });

    if (wishlistItems.length === 0) {
      console.error('❌ No wishlist items found for Sunwest Genetics');
      console.log('💡 Please add some Sunwest Genetics products to wishlist first');
      process.exit(1);
    }

    console.log(`✅ Found ${wishlistItems.length} wishlist items:`);
    wishlistItems.forEach((item: any, idx: number) => {
      console.log(`   ${idx + 1}. ${item.seedProduct.name}`);
    });

    // Step 3: Select 2 products to test
    const productsToTest = wishlistItems.slice(0, 2);
    const productIds = productsToTest.map((item: any) => item.seedProduct.id);

    console.log(`\n📋 Step 3: Testing with 2 products:`);
    productsToTest.forEach((item: any, idx: number) => {
      console.log(`   ${idx + 1}. ${item.seedProduct.name} (${item.seedProduct.id})`);
    });

    // Step 4: Get current pricing for these products
    console.log('\n📋 Step 4: Getting current pricing...');
    const currentPricing = await prisma.pricing.findMany({
      where: {
        productId: { in: productIds }
      },
      orderBy: {
        scrapedAt: 'desc'
      },
      distinct: ['productId', 'packSize'],
      include: {
        product: {
          select: {
            name: true
          }
        }
      }
    });

    if (currentPricing.length === 0) {
      console.error('❌ No pricing data found for these products');
      console.log('💡 Run scraper first to get baseline pricing');
      process.exit(1);
    }

    console.log(`✅ Found ${currentPricing.length} pricing records:`);
    currentPricing.forEach((pricing, idx) => {
      console.log(`   ${idx + 1}. ${pricing.product.name}`);
      console.log(`      Pack: ${pricing.packSize}`);
      console.log(`      Current: $${pricing.totalPrice}`);
      console.log(`      Mock (20% drop): $${(pricing.totalPrice * 0.80).toFixed(2)}`);
    });

    // Step 5: Inject mock pricing with 20% drop
    console.log('\n📋 Step 5: Injecting mock pricing (20% drop)...');
    
    const mockPricingData = currentPricing.map(pricing => ({
      productId: pricing.productId,
      packSize: pricing.packSize,
      basePrice: Math.round(pricing.basePrice * 0.80 * 100) / 100,
      totalPrice: Math.round(pricing.totalPrice * 0.80 * 100) / 100,
      currency: pricing.currency,
      scrapedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const insertedPricing = await prisma.productPricing.createMany({
      data: mockPricingData
    });

    console.log(`✅ Inserted ${insertedPricing.count} mock pricing records`);
    
    // Verify mock pricing
    const verifyPricing = await prisma.productPricing.findMany({
      where: {
        productId: { in: productIds },
        scrapedAt: {
          gte: new Date(Date.now() - 10000) // Last 10 seconds
        }
      },
      include: {
        product: {
          select: { name: true }
        }
      }
    });

    console.log('\n✅ Mock pricing verified:');
    verifyPricing.forEach((pricing, idx) => {
      console.log(`   ${idx + 1}. ${pricing.product.name}`);
      console.log(`      New price: $${pricing.totalPrice}`);
      console.log(`      Scraped: ${pricing.scrapedAt.toISOString()}`);
    });

    // Step 6: Trigger price detection
    console.log('\n📋 Step 6: Triggering price detection job...');
    
    await createDetectPriceChangesJob({
      sellerId: SUNWEST_SELLER_ID,
      sellerName: 'Sunwest Genetics',
      scrapedProducts: [], // Empty - will query database
      scrapedAt: new Date(),
    });

    console.log('✅ Price detection job created!');

    // Step 7: Summary
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 Test Setup Complete!\n');
    console.log('📊 Summary:');
    console.log(`   User: ${user.name} (${user.email})`);
    console.log(`   Wishlist items: ${wishlistItems.length}`);
    console.log(`   Products tested: ${productsToTest.length}`);
    console.log(`   Mock pricing records: ${insertedPricing.count}`);
    console.log(`   Price drop: 20%`);
    console.log(`   Seller: Sunwest Genetics`);

    console.log('\n📋 Next Steps:');
    console.log('   1. Worker should detect 2 price drops');
    console.log('   2. Email job will be created for user');
    console.log(`   3. Email will be sent to: ${user.email}`);

    console.log('\n🔍 Monitor Commands:');
    console.log('   Watch worker logs:');
    console.log('   docker logs goodseed-worker --follow | grep -E "Price|Email"\n');
    console.log('   Check Redis queues:');
    console.log('   docker exec goodseed-redis redis-cli ZCARD bull:detect-price-changes:completed');
    console.log('   docker exec goodseed-redis redis-cli ZCARD bull:send-price-alert:completed\n');

    console.log('✅ Price detection job is now in the queue!');
    console.log('⏳ Watch the worker logs for results...\n');

  } catch (error) {
    console.error('\n❌ Error during test:', error);
    apiLogger.logError('[Quick Test] Test failed', error as Error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  process.exit(0);
}

// Run the test
quickTestPriceAlert();
