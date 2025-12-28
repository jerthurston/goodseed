/**
 * Scraper Worker - Background Job Processor
 * 
 * Processes scraping jobs from Bull queue in the background
 * Updates ScrapeJob status in database during execution
 * Worker sẽ lắng nghe queue, lấy job ra, chạy scraping thực tế, normalize data, lưu DB.
 * 
 * @usage
 * Start worker: `tsx workers/scraper-worker.ts`
 * Or with npm: `npm run worker:scraper`
 */

/** FLOW THAM KHẢO
 * API Route (/api/admin/sellers/[id]/scraper)
        ↓ (POST request từ admin hoặc cron)
   scraper-queue.ts
        ↓ (add job vào Redis queue)
   scraper-worker.ts  ← lắng nghe queue
        ↓ (process job)
   scraper-factory.ts (hoặc scraper service)
        ↓
   Crawlee/Cheerio → Scrape HTML → Extract data
        ↓
   Normalize data (price per seed, min/max THC, standardize names)
        ↓
   Prisma → Upsert vào DB (Product, Seller, Pricing, Image...)
        ↓
   Update ScrapeJob status (COMPLETED / FAILED)
        ↓
   Alert admin nếu fail (SNS/Slack)
 */

//NOTE: Không throw lỗi ở cấp worker, tránh crash app crawl, chỉ update scrapeJob để thông báo!

import { Job } from 'bull';
import { prisma } from '@/lib/prisma';
import { ScrapeJobStatus } from '@prisma/client';
import { ScraperJobData, scraperQueue } from '@/lib/queue/scraper-queue';
import ScraperFactory, { ISaveDbService, SupportedScraperSourceName } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { ProductCardDataFromCrawling } from '@/types/crawl.type';
import { AutoScraperScheduler } from '../services/auto-scraper/backend/auto-scraper-scheduler.service';
import { ErrorProcessorService } from '../services/error-monitoring/error-processor.service';
import { logScrapeActivity } from '../helpers/server/logScrapeActivity';
import { initializeWorkerSync, cleanupWorkerSync } from '@/lib/workers/scraper-worker-startup';

apiLogger.info('[Scraper Worker] Starting worker process...');

/**
 * Process a single scraping job
 */
async function processScraperJob(job: Job<ScraperJobData>) {

  // Destructure Job data được thêm vào để worker xử
  const {
    jobId,
    sellerId,
    scrapingSources,
    mode,
    config } = job.data;

  apiLogger.info('[Scraper Worker] Processing job', {
    jobId,
    scrapingSources,
    mode,
    fullJobData: job.data
  });

  // 2. Thiết lập ban đầu cho factory services: scraper product và save db
  const scraperSourceName = scrapingSources[0].scrapingSourceName;

  let dbService = {} as ISaveDbService
  try {
    // 1. Update job status to IN_PROGRESS
    apiLogger.debug(`[DEBUG WORKER] About to update job ${jobId} to IN_PROGRESS`);
    await prisma.scrapeJob.update({
      where: { jobId },
      data: {
        status: ScrapeJobStatus.ACTIVE, // Job đang chạy
        startedAt: new Date(),
      },
    });
    apiLogger.debug(`[DEBUG WORKER] Successfully updated job ${jobId} status`);

    // Update Bull job progress
    await job.progress(5);

    // tạo một instance của ScraperFactory với PrismaClient để tương tác với cơ sở dữ liệu.
    const scraperFactory = new ScraperFactory(prisma);
    //--> factory tạo job cho worker thực hiện: cụ thể ở đây là

    // dbService để save dữ liệu vào database. TODO: Cần làm rõ logic của dbService đã xử lý như thế nào
    dbService = scraperFactory.createSaveDbService(scraperSourceName as SupportedScraperSourceName);

    //!!!!!! WARNING! TODO: hàm initializeSeller chưa được thiết lập. Cần làm rõ mục đích của hàm. 
    // Theo flow thực tế thì seller đã được khởi tạo trước khi chạy từ trình quản lý của dashboard/admin
    await dbService.initializeSeller(sellerId);

    apiLogger.debug('[DEBUG WORKER] Services initialized', { jobId, scraperSourceName });
    // Ghi log thông tin dịch vụ đã được khởi tạo
    await job.progress(20);

    // 3. Real scraping using ScraperFactory and Crawlee
    apiLogger.info('[INFO WORKER] Starting real scraping process...', {
      jobId,
      scraperSourceName,
      mode,
      scrapingSourceUrl: scrapingSources[0].scrapingSourceUrl,
      fullSiteCrawl: config.fullSiteCrawl,
    });

    const scrapeStartTime = Date.now();

    let aggregatedResult = {
      totalProducts: 0,
      totalPages: 0,
      products: [] as ProductCardDataFromCrawling[],
      errors: 0,
      duration: 0,
    };
    //Đếm số lượng scrapingSource
    const scrapingSourceCount = scrapingSources.length;
    // start from 10%
    let currentProgress = 10;
    // Tính tiến độ trên mỗi source 80% for scraping (10% init, 10% save)
    const progressPerSource = 80 / scrapingSourceCount;

    for (const [index, source] of scrapingSources.entries()) {
      try {
        // Debug logging to understand the condition
        apiLogger.info('[INFO WORKER] Processing source', {
          jobId,
          sourceIndex: index + 1,
          scrapingSourceName: source.scrapingSourceName,
          scrapingSourceUrl: source.scrapingSourceUrl,
          maxPage: source.maxPage,
          fullSiteCrawl: config.fullSiteCrawl,
        });

        // Phát hiện lỗi ở đây!!!!!!!!!!!!!!!!!!!!!!!
        // scraper để đi crawl dữ liệu - createProductListScraper return Promise luôn
        let pageResult;

        if (mode === 'manual') {
          // Với thiết kế hiện tại, createProductListScraper đã gọi function với siteConfig sẵn rồi
          // Tất cả các trường hợp đều gọi cùng một function, chỉ khác config bên trong siteConfig
          pageResult = await scraperFactory.createProductListScraper(
            scraperSourceName as SupportedScraperSourceName, 
            source.maxPage,
            config.startPage || 1,
            config.endPage
          );
        } 
        else if (mode === 'auto') {
          // TODO: Implement auto mode logic
          pageResult = await scraperFactory.createProductListScraper(
            scraperSourceName as SupportedScraperSourceName, 
            source.maxPage,
            config.startPage || 1,
            config.endPage
          );
        } 
        else if (mode === 'batch') {
          // TODO: Implement batch mode logic  
        } 
        else if (mode === 'test') {
          // Test mode with limited pages
          pageResult = await scraperFactory.createProductListScraper(
            scraperSourceName as SupportedScraperSourceName, 
            source.maxPage,
            config.startPage || 1,
            config.endPage || 2 // Default to 2 pages for test
          );
        } else {
          throw new Error(`Unsupported mode: ${mode}`);
        }

        //maxPage chỉ được sử dụng trong mode === 'test' | 'manual'. Ở mode auto, maxPage sẽ được crawl từ firstPage và viết logic xử lý trong scraperProductList
        // TODO: Tiếp tục thực hiện logic với các mode khác.

        //------------
        if (!pageResult) {
          apiLogger.warn('[Scraper Worker] No page result found', { jobId, source });
          continue; // Skip to next source
        }
        // Aggregate
        // sử dụng toán tư += để cộng giá trị vé trái và vế phải (tức cộng dồn) để cập nhật lại giá trị cho aggregatedResult cho đến khi hoàn thành loop.
        aggregatedResult.totalProducts += pageResult.totalProducts;
        aggregatedResult.totalPages += pageResult.totalPages;
        aggregatedResult.products.push(...pageResult.products);

        // Cập nhật progress per source
        currentProgress += progressPerSource;
        await job.progress(Math.min(currentProgress, 90));

      } catch (scrapeError) {
        aggregatedResult.errors += 1;
        
        // Enhanced error logging with classification
        const errorClassification = ErrorProcessorService.classifyError(scrapeError as Error, {
          jobId,
          scrapingSourceName: source.scrapingSourceName,
          source: 'worker'
        });

        apiLogger.logError('[Scraper Worker] Real scraping failed', scrapeError as Error, {
          jobId,
          scrapingSourceName: source.scrapingSourceName,
          errorType: errorClassification.type,
          errorSeverity: errorClassification.severity
        });
        // Viết tiếp logic update trạng thái và cập nhật lỗi cho scrapeJob
        await prisma.scrapeJob.update({
          where:{jobId},
          data:{
            status:ScrapeJobStatus.FAILED,
            updatedAt: new Date(),
            errorMessage:"Worker crawled failed",
          }
        })
      }
    }

    aggregatedResult.duration = Date.now() - scrapeStartTime;

    await job.progress(90);

    // 4. Save products to database
    const categoryId = await dbService.getOrCreateCategory(
      {
        name: 'All Products',
        slug: 'all-products',
        seedType: undefined,
      }
    );

    // // Update job with category info
    // await prisma.scrapeJob.update({
    //   where: { jobId },
    //   data: {
    //     totalPages: result.totalPages,
    //     productsScraped: result.totalProducts,
    //   },
    // });

    // await job.progress(70);

    const saveResult = await dbService.saveProductsToDatabase(aggregatedResult.products);

    await job.progress(95);

    apiLogger.debug('[DEBUG WORKER] Products saved', {
      jobId,
      status: aggregatedResult.errors === scrapingSourceCount ? ScrapeJobStatus.FAILED : ScrapeJobStatus.COMPLETED,
      totalPages: aggregatedResult.totalPages,
      scraped: aggregatedResult.totalProducts,
      saved: saveResult.saved,
      updated: saveResult.updated,
      errors: saveResult.errors,
      duration: aggregatedResult.duration,
    });
    // 6. Update job COMPLETED with aggregated results
    await prisma.scrapeJob.update({
      where: { jobId },
      data: {
        status: aggregatedResult.errors === scrapingSourceCount ? ScrapeJobStatus.FAILED : ScrapeJobStatus.COMPLETED, // FAILED nếu all sources fail
        completedAt: new Date(),
        totalPages: aggregatedResult.totalPages,
        productsScraped: aggregatedResult.totalProducts,
        productsSaved: saveResult.saved,
        productsUpdated: saveResult.updated,
        errors: aggregatedResult.errors + saveResult.errors,
        duration: aggregatedResult.duration,
      },
    });

    // 6. Log activity - TEMP DISABLED for testing
    // await dbService.logScrapeActivity(sellerId, aggregatedResult.errors === 0 ? 'success' : 'partial_success', aggregatedResult.totalProducts, aggregatedResult.duration);

    await job.progress(100);

    apiLogger.info('[INFO WORKER] Job completed successfully', { jobId });

    return {
      success: true,
      jobId,
      totalProducts: aggregatedResult.totalProducts,
      saved: saveResult.saved,
      updated: saveResult.updated,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Enhanced error classification and logging
    const errorClassification = ErrorProcessorService.classifyError(error instanceof Error ? error : errorMessage, {
      jobId,
      sellerId,
      source: 'worker'
    });

    apiLogger.logError(
      '[Scraper Worker] Job failed',
      error instanceof Error ? error : new Error(String(error)),
      { 
        jobId,
        sellerId,
        errorType: errorClassification.type,
        errorSeverity: errorClassification.severity,
        recommendation: errorClassification.recommendation.action
      }
    );

    // Update job FAILED with enhanced error details
    await prisma.scrapeJob.update({
      where: { jobId },
      data: {
        status: ScrapeJobStatus.FAILED,
        completedAt: new Date(),
        errorMessage,
        errorDetails: {
          stack: error instanceof Error ? error.stack : undefined,
          errorType: errorClassification.type,
          severity: errorClassification.severity,
          recommendation: errorClassification.recommendation.action,
          confidence: errorClassification.confidence
        },
      },
    });

    // Log failed activity with enhanced error info
    try {
      await logScrapeActivity(sellerId, 'error', 0, 0, {
        jobId,
        errorType: errorClassification.type,
        errorMessage,
        severity: errorClassification.severity
      });
    } catch (logError) {
      apiLogger.logError('[Scraper Worker] Failed to log scrape activity', logError as Error, { jobId });
    }

    throw error; // Re-throw for Bull to handle retry
  }
}

// Register job processor
scraperQueue.process(async (job) => {
  return processScraperJob(job);
});

// Handle worker events
scraperQueue.on('completed', (job, result) => {
  apiLogger.info(`[INFO WORKER] Job ${job.id} completed:`, result);
});

scraperQueue.on('failed', (job, error) => {
  apiLogger.logError(`[ERROR WORKER] Job ${job.id} failed:`, { error: error.message });
});

scraperQueue.on('error', (error) => {
  apiLogger.logError('[ERROR WORKER] Queue error:', { error });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  apiLogger.info('[Scraper Worker] Received SIGTERM, shutting down gracefully...');
  
  await cleanupWorkerSync();
  await scraperQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  apiLogger.info('[Scraper Worker] Received SIGINT, shutting down gracefully...');
  
  await cleanupWorkerSync();
  await scraperQueue.close();
  process.exit(0);
});

apiLogger.info('[Scraper Worker] Worker ready, waiting for jobs...');

// Comprehensive Worker Initialization
initializeWorkerSync();
