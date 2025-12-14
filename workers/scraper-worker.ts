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

import { apiLogger } from '@/lib/helpers/api-logger';
import { prisma } from '@/lib/prisma';
import { ScraperJobData, scraperQueue } from '@/lib/queue/scraper-queue';
import ScraperFactory, { ScraperSource } from '@/lib/factories/scraper-factory';
import { Job } from 'bull';

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

    // 2. Initialize scraper services using factory
    const scraperFactory = new ScraperFactory(prisma);
    const dbService = scraperFactory.createSaveDbService(source as ScraperSource);

    apiLogger.info('[Scraper Worker] Services initialized', { jobId, source });
    await job.progress(20);

    // 3. TEMPORARY: Simulate successful scraping until proper integration
    apiLogger.info('[Scraper Worker] Simulating scraping process...', { 
      jobId, 
      source, 
      url: config.scrapingSourceUrl 
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = {
      totalProducts: Math.floor(Math.random() * 50) + 10, // Simulate 10-60 products
      totalPages: Math.floor(Math.random() * 5) + 1,      // Simulate 1-5 pages  
      products: [],
      duration: 2000
    };

    apiLogger.info('[Scraper Worker] Scraping completed (simulated)', {
      jobId,
      totalProducts: result.totalProducts,
      totalPages: result.totalPages,
    });

    await job.progress(60);

    // 4. Save products to database
    const categoryId = await dbService.getOrCreateCategory(sellerId, {
      name: 'All Products',
      slug: config.categorySlug,
      seedType: undefined,
    });

    // Update job with category info
    await prisma.scrapeJob.update({
      where: { jobId },
      data: {
        targetCategoryId: categoryId,
        totalPages: result.totalPages,
        productsScraped: result.totalProducts,
      },
    });

    await job.progress(70);

    const saveResult = await dbService.saveProductsToCategory(categoryId, result.products);

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
