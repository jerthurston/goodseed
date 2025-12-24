/**
 * Error Scrape Alert System Test Script
 * Tests the complete error monitoring flow
 */

import { ErrorProcessorService, ScraperErrorType } from '@/lib/services/error-monitoring/error-processor.service';
import { prisma } from '@/lib/prisma';
import { logScrapeActivity } from '@/lib/helpers/server/logScrapeActivity';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Test Error Classification
 */
async function testErrorClassification() {
  console.log('\n🧪 Testing Error Classification...');

  const testErrors = [
    { error: 'Connection timeout', expected: ScraperErrorType.NETWORK_ERROR },
    { error: 'Element not found with selector .product', expected: ScraperErrorType.PARSE_ERROR },
    { error: 'Database constraint violation', expected: ScraperErrorType.SAVE_ERROR },
    { error: 'Request timeout exceeded', expected: ScraperErrorType.TIMEOUT_ERROR },
    { error: '403 Forbidden', expected: ScraperErrorType.AUTH_ERROR },
    { error: 'Worker crashed unexpectedly', expected: ScraperErrorType.WORKER_ERROR },
  ];

  for (const { error, expected } of testErrors) {
    const classification = ErrorProcessorService.classifyError(error);
    const passed = classification.type === expected;
    
    console.log(`${passed ? '✅' : '❌'} "${error}" -> ${classification.type} (expected: ${expected})`);
    
    if (passed) {
      console.log(`   💡 ${classification.recommendation.action} (${classification.severity})`);
    }
  }
}

/**
 * Test Database Error Logging
 */
async function testErrorLogging() {
  console.log('\n🗄️ Testing Database Error Logging...');

  // Get a test seller
  const testSeller = await prisma.seller.findFirst();
  if (!testSeller) {
    console.log('❌ No sellers found. Please seed database first.');
    return;
  }

  console.log(`Using seller: ${testSeller.name} (${testSeller.id})`);

  try {
    // 1. Test ScrapeLog error creation
    await logScrapeActivity(
      testSeller.id,
      'error',
      0,
      5000,
      {
        errorType: ScraperErrorType.NETWORK_ERROR,
        errorMessage: 'Test connection timeout',
        severity: 'HIGH'
      }
    );
    console.log('✅ ScrapeLog error logged successfully');

    // 2. Test ScrapeJob error creation
    await prisma.scrapeJob.create({
      data: {
        sellerId: testSeller.id,
        jobId: `test_job_${Date.now()}`,
        status: 'FAILED',
        mode: 'test',
        errorMessage: 'Test scraper failure',
        errorDetails: {
          errorType: ScraperErrorType.PARSE_ERROR,
          severity: 'MEDIUM',
          stack: 'Test stack trace'
        }
      }
    });
    console.log('✅ ScrapeJob error logged successfully');

  } catch (error) {
    console.log('❌ Error logging failed:', error);
  }
}

/**
 * Test Recent Errors API
 */
async function testRecentErrorsAPI() {
  console.log('\n🌐 Testing Recent Errors API...');

  try {
    // Make API call to test endpoint
    const response = await fetch('http://localhost:3000/api/admin/scraper/recent-errors?timeframe=60');
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ API Response successful');
    console.log(`📊 Found ${data.data.summary.totalErrors} errors`);
    console.log(`   - Activity errors: ${data.data.summary.errorsBySource.ACTIVITY}`);
    console.log(`   - Job errors: ${data.data.summary.errorsBySource.JOB}`);

    // Display recent errors
    if (data.data.errors.length > 0) {
      console.log('\n📋 Recent Errors:');
      data.data.errors.slice(0, 3).forEach((error: any, index: number) => {
        console.log(`${index + 1}. ${error.sellerName}: ${error.errorMessage}`);
        console.log(`   Source: ${error.errorSource}, Time: ${new Date(error.timestamp).toLocaleString()}`);
      });
    } else {
      console.log('🎉 No recent errors found!');
    }

  } catch (error) {
    console.log('❌ API test failed:', error);
  }
}

/**
 * Performance Test - Database Query
 */
async function testQueryPerformance() {
  console.log('\n⚡ Testing Database Query Performance...');

  const startTime = Date.now();
  
  try {
    // Test the union query performance
    const timeThreshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes

    const [scrapeLogErrors, scrapeJobErrors] = await Promise.all([
      prisma.scrapeLog.findMany({
        where: {
          status: 'error',
          timestamp: { gte: timeThreshold }
        },
        include: { seller: { select: { id: true, name: true } } },
        orderBy: { timestamp: 'desc' },
        take: 20
      }),
      
      prisma.scrapeJob.findMany({
        where: {
          status: 'FAILED',
          updatedAt: { gte: timeThreshold }
        },
        include: { seller: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 20
      })
    ]);

    const duration = Date.now() - startTime;
    
    console.log(`✅ Query completed in ${duration}ms`);
    console.log(`📊 Results: ${scrapeLogErrors.length} ScrapeLog + ${scrapeJobErrors.length} ScrapeJob errors`);
    
    if (duration > 1000) {
      console.log('⚠️ Query took longer than 1 second. Consider adding indexes.');
    } else {
      console.log('🚀 Query performance looks good!');
    }

  } catch (error) {
    console.log('❌ Performance test failed:', error);
  }
}

/**
 * Test Error Frequency Detection
 */
async function testErrorFrequencyDetection() {
  console.log('\n📈 Testing Error Frequency Detection...');

  const testSeller = await prisma.seller.findFirst();
  if (!testSeller) return;

  try {
    // Count errors for this seller in last 30 minutes
    const timeThreshold = new Date(Date.now() - 30 * 60 * 1000);
    
    const errorCount = await prisma.scrapeLog.count({
      where: {
        sellerId: testSeller.id,
        status: 'error',
        timestamp: { gte: timeThreshold }
      }
    });

    console.log(`📊 Seller ${testSeller.name} has ${errorCount} errors in last 30 minutes`);

    // Test alert threshold
    const shouldAlert = ErrorProcessorService.shouldAlert(ScraperErrorType.NETWORK_ERROR, errorCount);
    console.log(`🚨 Should alert: ${shouldAlert ? 'YES' : 'NO'} (threshold: 3+ errors)`);

  } catch (error) {
    console.log('❌ Frequency detection test failed:', error);
  }
}

/**
 * Cleanup Test Data
 */
async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');

  try {
    // Delete test jobs
    await prisma.scrapeJob.deleteMany({
      where: {
        jobId: { startsWith: 'test_job_' }
      }
    });

    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.log('❌ Cleanup failed:', error);
  }
}

/**
 * Main Test Runner
 */
async function runTests() {
  console.log('🎯 Error Scrape Alert System Tests');
  console.log('=====================================');

  try {
    await testErrorClassification();
    await testErrorLogging();
    await testRecentErrorsAPI();
    await testQueryPerformance();
    await testErrorFrequencyDetection();
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Manual Testing Checklist:');
    console.log('1. ✅ Visit /dashboard/admin to see ErrorAlertBanner');
    console.log('2. ✅ Trigger a manual scrape that will fail');
    console.log('3. ✅ Check if error appears in banner within 30 seconds');
    console.log('4. ✅ Test retry functionality from banner');
    console.log('5. ✅ Test banner dismissal');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await cleanupTestData();
    await prisma.$disconnect();
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  runTests();
}

export { runTests };