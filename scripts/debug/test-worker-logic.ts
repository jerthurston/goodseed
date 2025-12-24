// scripts/debug/test-worker-logic.ts
import { prisma } from '@/lib/prisma';
import { ScrapeJobStatus } from '@prisma/client';

async function testWorkerLogic() {
  console.log('🧪 Testing worker status logic...');
  
  // Simulate worker logic
  const scrapingSourceCount = 1; // Sunwest has 1 source
  const aggregatedResult = {
    errors: 0, // No errors in successful scrape
    totalProducts: 800,
    totalPages: 10,
    duration: 300000
  };
  
  const saveResult = {
    saved: 202,
    updated: 598, 
    errors: 0
  };
  
  // Test logic từ worker
  const shouldBeCompleted = aggregatedResult.errors === scrapingSourceCount ? ScrapeJobStatus.FAILED : ScrapeJobStatus.COMPLETED;
  
  console.log('📊 Test data:');
  console.log('- scrapingSourceCount:', scrapingSourceCount);
  console.log('- aggregatedResult.errors:', aggregatedResult.errors);
  console.log('- Logic check (errors === sourceCount):', aggregatedResult.errors === scrapingSourceCount);
  console.log('- Calculated status:', shouldBeCompleted);
  
  // Test actual enum values
  console.log('\n🔧 Enum verification:');
  console.log('- ScrapeJobStatus.COMPLETED:', ScrapeJobStatus.COMPLETED);
  console.log('- ScrapeJobStatus.FAILED:', ScrapeJobStatus.FAILED);
  console.log('- Type of COMPLETED:', typeof ScrapeJobStatus.COMPLETED);
  
  // Create test job để verify
  const testJobId = `test_${Date.now()}`;
  
  try {
    console.log('\n🧪 Testing database update...');
    
    // Create job first
    const job = await prisma.scrapeJob.create({
      data: {
        sellerId: 'cmjdvrrzy0000nksb7xhf4o7a', // sunwest
        jobId: testJobId,
        mode: 'test',
        status: ScrapeJobStatus.CREATED
      }
    });
    
    console.log('✅ Job created:', job.jobId, 'Status:', job.status);
    
    // Update to COMPLETED
    const updatedJob = await prisma.scrapeJob.update({
      where: { jobId: testJobId },
      data: {
        status: ScrapeJobStatus.COMPLETED,
        completedAt: new Date(),
        totalPages: aggregatedResult.totalPages,
        productsScraped: aggregatedResult.totalProducts,
        productsSaved: saveResult.saved,
        productsUpdated: saveResult.updated,
        errors: aggregatedResult.errors + saveResult.errors,
        duration: aggregatedResult.duration,
      }
    });
    
    console.log('✅ Job updated:', updatedJob.jobId, 'Status:', updatedJob.status);
    
    // Cleanup test job
    await prisma.scrapeJob.delete({
      where: { jobId: testJobId }
    });
    
    console.log('🧹 Test job cleaned up');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    
    // Cleanup on error
    try {
      await prisma.scrapeJob.delete({
        where: { jobId: testJobId }
      });
    } catch (cleanupError) {
      console.log('Cleanup not needed or failed');
    }
  }
  
  await prisma.$disconnect();
}

testWorkerLogic().catch(console.error);