/**
 * Scraper Worker - Background Job Processor
 * 
 * Processes scraping jobs from Bull queue in the background
 * Updates ScrapeJob status in database during execution
 * 
 * @usage
 * Start worker: `tsx workers/scraper-worker.ts`
 * Or with npm: `npm run worker:scraper`
 */

import { Job } from 'bull';
import { prisma } from '@/lib/prisma';
import { ScraperJobData, scraperQueue } from '@/lib/queue/scraper-queue';
import ScraperFactory, { ScraperSource } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';

apiLogger.info('[Scraper Worker] Starting worker process...');

/**
 * Process a single scraping job
 */
async function processScraperJob(job: Job<ScraperJobData>) {

  const { jobId, sellerId, source, mode, config } = job.data;

  apiLogger.info('[Scraper Worker] Processing job', { 
    jobId, 
    source, 
    mode,
    fullJobData: job.data 
  });

  try {
    // 1. Update job status to IN_PROGRESS
    await prisma.scrapeJob.update({
      where: { jobId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    // Update Bull job progress
    await job.progress(10);

    // 2. Thiết lập ban đầu cho factory
    const scraperFactory = new ScraperFactory(prisma);
    //--> factory tạo job cho worker thực hiện: cụ thể ở đây là
    // scraper để đi crawl dữ liệu
    const scraper = scraperFactory.createProductListScraper(source as ScraperSource);
    // dbService để save dữ liệu vào database
    const dbService = scraperFactory.createSaveDbService(source as ScraperSource);

    apiLogger.info('[Scraper Worker] Services initialized', { jobId, source });
    // Ghi log thông tin dịch vụ đã được khởi tạo
    await job.progress(20);

    // 3. Real scraping using ScraperFactory and Crawlee
    apiLogger.info('[Scraper Worker] Starting real scraping process...', { 
      jobId, 
      source, 
      url: config.scrapingSourceUrl,
      mode,
      fullSiteCrawl: config.fullSiteCrawl
    });

    const scrapeStartTime = Date.now();

    let result = {
      totalProducts: 0,
      totalPages: 0,
      products: [] as any[],
      duration: 0,
    };

    try {
      // Debug logging to understand the condition
      apiLogger.info('[Scraper Worker] Debug condition check', {
        jobId,
        source,
        mode,
        fullSiteCrawl: config.fullSiteCrawl,
        conditionResult: mode === 'manual' && config.fullSiteCrawl
      });
      
      if (mode === 'manual' && config.fullSiteCrawl) {
        // Manual mode: Full site crawl - use reasonable page limit for manual scrape
        apiLogger.info('[Scraper Worker] Manual mode - full site crawl with reasonable limit', { jobId, source });
        
        // Dynamic maxPages: Scrape first page to detect total pages from pagination
        // Chúng ta sẽ không hardcore maxpage mà sẽ extractform HTML để tính được số lượng trang ở pagination.
        result = await scraper.scrapeProductList(config.scrapingSourceUrl, 0); // 0 = auto-discover all pages
        
      } else if (mode === 'manual') {
        // Manual mode fallback (if fullSiteCrawl is not set)
        apiLogger.info('[Scraper Worker] Manual mode fallback - using default pages', { jobId, source });
        
        result = await scraper.scrapeProductList(config.scrapingSourceUrl, 5);
        
      } 

    } catch (scrapeError) {
      apiLogger.logError('[Scraper Worker] Real scraping failed', scrapeError as Error, {
        jobId,
        source,
        duration: Date.now() - scrapeStartTime
      });
      
      // Create fallback result for failed scraping
      result = {
        totalProducts: 0,
        totalPages: 0,
        products: [],
        duration: Date.now() - scrapeStartTime
      };
      
      // Update job with error status
      await prisma.scrapeJob.update({
        where: { jobId },
        data: {
          status: 'FAILED',
          errorMessage: `Scraping failed: ${(scrapeError as Error).message}`,
          errors: 1,
        },
      });
      
      throw scrapeError; // Re-throw to mark job as failed
    }

    await job.progress(60);

    // 4. Save products to database
    // const categoryId = await dbService.getOrCreateCategory(sellerId, {
    //   name: 'All Products',
    //   slug: config.categorySlug,
    //   seedType: undefined,
    // });

    // Update job with category info
    await prisma.scrapeJob.update({
      where: { jobId },
      data: {
        totalPages: result.totalPages,
        productsScraped: result.totalProducts,
      },
    });

    await job.progress(70);

    const saveResult = await dbService.saveProductsToDatabase( result.products);

    apiLogger.info('[Scraper Worker] Products saved', {
      jobId,
      saved: saveResult.saved,
      updated: saveResult.updated,
    });

    await job.progress(90);

    // 5. Update job to COMPLETED
    await prisma.scrapeJob.update({
      where: { jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        productsSaved: saveResult.saved,
        productsUpdated: saveResult.updated,
        errors: saveResult.errors,
        duration: result.duration,
      },
    });

    // 6. Log activity
    await dbService.logScrapeActivity(sellerId, 'success', result.totalProducts, result.duration);

    await job.progress(100);

    apiLogger.info('[Scraper Worker] Job completed successfully', { jobId });

    return {
      success: true,
      jobId,
      totalProducts: result.totalProducts,
      saved: saveResult.saved,
      updated: saveResult.updated,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    apiLogger.logError(
      '[Scraper Worker]',
      error instanceof Error ? error : new Error(String(error)),
      { jobId }
    );

    // Mark job as FAILED in database
    await prisma.scrapeJob.update({
      where: { jobId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage,
        errorDetails: error instanceof Error ? { stack: error.stack } : {},
      },
    });

    // Log failed activity - use factory to create appropriate service
    const scraperFactory = new ScraperFactory(prisma);
    const dbService = scraperFactory.createSaveDbService(source as ScraperSource);
    await dbService.logScrapeActivity(sellerId, 'error', 0, 0);

    throw error; // Re-throw for Bull to handle retry
  }
}

// Register job processor
scraperQueue.process(async (job) => {
  return processScraperJob(job);
});

// Handle worker events
scraperQueue.on('completed', (job, result) => {
  console.log(`[Scraper Worker] Job ${job.id} completed:`, result);
});

scraperQueue.on('failed', (job, error) => {
  console.error(`[Scraper Worker] Job ${job.id} failed:`, error.message);
});

scraperQueue.on('error', (error) => {
  console.error('[Scraper Worker] Queue error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Scraper Worker] Shutting down...');
  await scraperQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Scraper Worker] Shutting down...');
  await scraperQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.log('[Scraper Worker] Worker ready, waiting for jobs...');
