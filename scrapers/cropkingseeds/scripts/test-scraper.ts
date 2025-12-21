/**
 * Crop King Seeds Scraper Test Script
 */

import { 
  createCropKingSeedsScraper,
  testCropKingSeedsJsonLD,
  CROPKINGSEEDS_SELECTORS
} from '../hybrid/cropkingseeds-hybrid-scraper';

/**
 * Test URLs for Crop King Seeds - Listing pages and product pages
 */
const LISTING_URLS = [
  'https://www.cropkingseeds.ca/shop/',
  'https://www.cropkingseeds.ca/marijuana-seeds/',
  'https://www.cropkingseeds.ca/feminized-seeds-canada/',
  'https://www.cropkingseeds.ca/autoflower-seeds-canada/'
];

const PRODUCT_URLS = [
  'https://www.cropkingseeds.ca/feminized-seeds-canada/gelato-marijuana-seeds/',
  'https://www.cropkingseeds.ca/autoflower-seeds-canada/amnesia-haze-marijuana-seeds/',
  'https://www.cropkingseeds.ca/cbd-seeds-canada/cb-diesel-marijuana-seeds/'
];

async function runTests() {
  console.log('🧪 Testing Crop King Seeds Scraper');
  console.log('='.repeat(40));

  try {
    // Test JSON-LD availability
    console.log('\n📋 Testing JSON-LD availability...');
    await testCropKingSeedsJsonLD(PRODUCT_URLS[0]);

    // Test scraper creation
    console.log('\n🏗️ Testing scraper creation...');
    const scraper = await createCropKingSeedsScraper();
    console.log('✅ Scraper created successfully');

    // Test actual scraping (commented out for safety)
    console.log('\n⚠️ Actual scraping test disabled - uncomment to test');
    /*
    console.log('🔍 Testing actual scraping...');
    await scraper.addRequests(TEST_URLS.slice(0, 1)); // Test only 1 URL
    await scraper.run();
    console.log('✅ Scraping test completed');
    */

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };