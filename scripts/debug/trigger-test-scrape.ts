// scripts/debug/trigger-test-scrape.ts
import { addScraperJob } from '@/lib/queue/scraper-queue';
import { ScrapeJobStatus } from '@prisma/client';

async function triggerTestScrape() {
  console.log('🚀 Triggering test manual scrape for Sunwest...');
  
  try {
    const result = await addScraperJob('cmjdvrrzy0000nksb7xhf4o7a', {
      startPage: 1,
      endPage: 2, // Just 2 pages for quick test
      mode: 'test'
    });
    
    console.log('✅ Test scrape job created:', result.jobId);
    console.log('🕐 Wait ~30 seconds then check status...');
    
    // Monitor job for 30 seconds
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      // Check job status
      const { prisma } = await import('@/lib/prisma');
      const job = await prisma.scrapeJob.findUnique({
        where: { jobId: result.jobId }
      });
      
      if (job) {
        console.log(`[${attempts}s] Job ${result.jobId}: ${job.status}`);
        
        if (job.status === ScrapeJobStatus.COMPLETED || job.status === ScrapeJobStatus.FAILED) {
          console.log('\n🎯 Final result:');
          console.log(`- Status: ${job.status}`);
          console.log(`- Products scraped: ${job.productsScraped}`);
          console.log(`- Products updated: ${job.productsUpdated}`);
          console.log(`- Duration: ${job.duration}ms`);
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error triggering test scrape:', error);
  }
}

triggerTestScrape().catch(console.error);