/**
 * Test Script: Trigger Price Detection Manually
 * 
 * Purpose: Test price detection and email pipeline without running full scraper
 * 
 * Usage:
 *   pnpm tsx scripts/test/test-price-detection.ts
 * 
 * Prerequisites:
 *   1. Redis running (docker-compose up redis -d)
 *   2. Worker running (pnpm run worker)
 *   3. Test user with favorites in database
 *   4. Mock pricing data injected (see TESTING_PLAN.md Test 5.3)
 */

import { createDetectPriceChangesJob } from '@/lib/queue/detect-price-changes';
import { apiLogger } from '@/lib/helpers/api-logger';

async function testPriceDetection() {
  console.log('🧪 Starting Price Detection Test...\n');

  try {
    // Trigger price detection for Rocket Seeds
    // (or change to any seller you're testing)
    const sellerId = 'cmjxq6y8w0000wgsbadp1tns6'; // Rocket Seeds
    const sellerName = 'Rocket Seeds';

    console.log(`📊 Triggering price detection for: ${sellerName}`);
    console.log(`   Seller ID: ${sellerId}\n`);

    await createDetectPriceChangesJob({
      sellerId,
      sellerName,
      scrapedProducts: [], // Empty - detection will query database
      scrapedAt: new Date(),
    });

    console.log('✅ Price detection job created successfully!\n');
    console.log('📋 Next Steps:');
    console.log('   1. Check worker logs for price detection output');
    console.log('   2. Watch for email job creation');
    console.log('   3. Check your inbox for price alert email\n');
    
    console.log('🔍 Monitor commands:');
    console.log('   Worker logs: docker logs goodseed-worker --follow');
    console.log('   Redis queue: docker exec goodseed-redis redis-cli ZCARD bull:detect-price-changes:completed');
    console.log('   Email queue: docker exec goodseed-redis redis-cli ZCARD bull:send-price-alert:completed\n');

  } catch (error) {
    console.error('❌ Error triggering price detection:', error);
    apiLogger.logError('[Test Script] Failed to trigger price detection', error as Error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the test
testPriceDetection();
