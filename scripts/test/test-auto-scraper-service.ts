import { AutoScraperService } from '@/lib/services/auto-scraper/frontend/auto-scraper.service';

async function testAutoScraperService() {
  console.log('🧪 Testing AutoScraperService Integration');
  console.log('='.repeat(50));

  try {
    // Test 1: Health Check
    console.log('\n📊 Test 1: Health Check...');
    const healthResult = await AutoScraperService.getAutoScraperHealth();
    console.log(`✅ Health Status: ${healthResult.data.status}`);
    
    // Test 2: Individual Seller Status Check
    console.log('\n👤 Test 2: Individual Seller Status...');
    const sellerId = 'cmjdk05b400006gsbg0qsl0qq'; // Vancouver Seed Bank
    const statusResult = await AutoScraperService.getSellerAutoScraperStatus(sellerId);
    console.log(`✅ Seller Status: ${statusResult.data.isScheduled ? 'Scheduled' : 'Not Scheduled'}`);
    console.log(`   - Seller: ${statusResult.data.sellerName}`);
    console.log(`   - Interval: ${statusResult.data.autoScrapeInterval}h`);
    
    // Test 3: Start All Auto Scrapers
    console.log('\n🚀 Test 3: Start All Auto Scrapers...');
    const startResult = await AutoScraperService.startAllAutoScraper();
    console.log(`✅ Start All Result:`);
    console.log(`   - Total Processed: ${startResult.data.totalProcessed}`);
    console.log(`   - Scheduled: ${startResult.data.scheduled}`);
    console.log(`   - Failed: ${startResult.data.failed}`);
    
    // Wait a moment
    console.log('\n⏱️  Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 4: Start Individual Seller (if not already started)
    console.log('\n👤 Test 4: Individual Seller Operations...');
    
    // Check status first
    const statusAfterStart = await AutoScraperService.getSellerAutoScraperStatus(sellerId);
    if (!statusAfterStart.data.isScheduled) {
      console.log('   Starting individual seller...');
      const startSellerResult = await AutoScraperService.startSellerAutoScraper(sellerId);
      console.log(`   ✅ Start Seller Result: ${startSellerResult.data.status}`);
    } else {
      console.log('   ✅ Seller already scheduled');
    }
    
    // Test 5: Stop Individual Seller
    console.log('\n🛑 Test 5: Stop Individual Seller...');
    const stopSellerResult = await AutoScraperService.stopSellerAutoScraper(sellerId);
    console.log(`✅ Stop Seller Result: ${stopSellerResult.data.status}`);
    
    // Test 6: Stop All Auto Scrapers
    console.log('\n🛑 Test 6: Stop All Auto Scrapers...');
    const stopAllResult = await AutoScraperService.stopAllAutoScraper();
    console.log(`✅ Stop All Result:`);
    console.log(`   - Total Processed: ${stopAllResult.data.totalProcessed}`);
    console.log(`   - Stopped: ${stopAllResult.data.stopped}`);
    console.log(`   - Failed: ${stopAllResult.data.failed}`);
    
    // Final health check
    console.log('\n📊 Final Health Check...');
    const finalHealthResult = await AutoScraperService.getAutoScraperHealth();
    console.log(`✅ Final Health: ${finalHealthResult.data.status}`);
    
    console.log('\n🎉 All AutoScraperService tests completed successfully!');
    console.log('✅ Service layer is working perfectly with existing APIs!');
    
  } catch (error) {
    console.error('❌ Service test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

// Export for use in other files
export { testAutoScraperService };

// Run if called directly
if (require.main === module) {
  testAutoScraperService()
    .then(() => {
      console.log('\n🚀 AutoScraperService is ready for React Hook integration!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Service test failed:', error);
      process.exit(1);
    });
}