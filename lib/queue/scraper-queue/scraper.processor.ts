/**
 * Scraper Queue Processor
 * 
 * Handles scraping job processing:
 * - Web scraping with Crawlee
 * - Data normalization
 * - Database storage
 * - Job status tracking
 */

import { Job } from 'bull';
import { prisma } from '@/lib/prisma';
import { ScrapeJobStatus } from '@prisma/client';
import { ScraperJobData } from './scraper.queue';
import ScraperFactory, { ISaveDbService, SupportedScraperSourceName } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { ProductCardDataFromCrawling } from '@/types/crawl.type';
import { ErrorProcessorService } from '@/lib/services/error-monitoring/error-processor.service';
import { logScrapeActivity } from '@/lib/helpers/server/logScrapeActivity';

/**
 * Process a single scraping job
 * Exported for use in worker
 */
export async function processScraperJob(job: Job<ScraperJobData>) {
  const {
    jobId,
    sellerId,
    scrapingSources,
    config
  } = job.data;

  const mode = config.mode;

  apiLogger.info('[Scraper Processor] Processing job', {
    jobId,
    sellerId,
    scrapingSources,
    mode,
    config,
    fullJobData: job.data
  });

  const scraperSourceName = scrapingSources[0].scrapingSourceName;
  let dbService = {} as ISaveDbService;

  try {
    // 1. Update job status to IN_PROGRESS
    apiLogger.debug(`[DEBUG WORKER] About to update job ${jobId} to IN_PROGRESS`);
    await prisma.scrapeJob.update({
      where: { jobId },
      data: {
        status: ScrapeJobStatus.ACTIVE,
        startedAt: new Date(),
      },
    });
    apiLogger.debug(`[DEBUG WORKER] Successfully updated scrapeJob ${jobId} status`);

    await job.progress(5);

    // 2. Initialize database service
    const scraperFactory = new ScraperFactory(prisma);
    dbService = scraperFactory.createSaveDbService(scraperSourceName as SupportedScraperSourceName);
    await dbService.initializeSeller(sellerId);

    apiLogger.debug('[DEBUG WORKER] Services initialized', { jobId, scraperSourceName });
    await job.progress(20);

    // 3. Real scraping using ScraperFactory and Crawlee
    apiLogger.info('[INFO WORKER] Starting real scraping process...');

    const scrapeStartTime = Date.now();

    let aggregatedResult = {
      totalProducts: 0,
      totalPages: 0,
      products: [] as ProductCardDataFromCrawling[],
      errors: 0,
      duration: 0,
    };

    const scrapingSourceCount = scrapingSources.length;
    apiLogger.info('[SCRAPER WORKER] Found scraping sources', { jobId, scrapingSourceCount });
    
    let currentProgress = 10;
    const progressPerSource = 80 / scrapingSourceCount;
    
    for (const [index, source] of scrapingSources.entries()) {
      try {
        apiLogger.info('[INFO WORKER] Processing source', {
          jobId,
          sourceIndex: index + 1,
          scrapingSourceUrl: source.scrapingSourceUrl,
        });

        let pageResult;

        const sourceContext = {
          scrapingSourceUrl: source.scrapingSourceUrl,
          sourceName: source.scrapingSourceName,
          dbMaxPage: source.maxPage
        };

        if (mode === 'manual') {
          pageResult = await scraperFactory.createProductListScraper(
            scraperSourceName as SupportedScraperSourceName,
            source.maxPage,
            null,
            null,
            config.fullSiteCrawl,
            sourceContext
          );
        } else if (mode === 'test') {
          pageResult = await scraperFactory.createProductListScraper(
            scraperSourceName as SupportedScraperSourceName,
            source.maxPage,
            config.startPage || 1,
            config.endPage || 2,
            null,
            sourceContext
          );
        } else if (mode === 'auto') {
          pageResult = await scraperFactory.createProductListScraper(
            scraperSourceName as SupportedScraperSourceName,
            source.maxPage,
            null,
            null,
            config.fullSiteCrawl,
            sourceContext
          );
        } else {
          apiLogger.logError(`[DEBUG WORKER] Unsupported mode: ${mode}`, new Error(`Unsupported mode: ${mode}`));
          throw new Error(`Unsupported mode: ${mode}`);
        }

        if (!pageResult) {
          apiLogger.warn('[Scraper Worker] No page result found', { jobId, source });
          continue;
        }

        aggregatedResult.totalProducts += pageResult.totalProducts;
        aggregatedResult.totalPages += pageResult.totalPages;
        aggregatedResult.products.push(...pageResult.products);

        currentProgress += progressPerSource;
        await job.progress(Math.min(currentProgress, 90));

      } catch (scrapeError) {
        aggregatedResult.errors += 1;

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

        await prisma.scrapeJob.update({
          where: { jobId },
          data: {
            status: ScrapeJobStatus.FAILED,
            updatedAt: new Date(),
            errorMessage: "Worker crawled failed",
          }
        });
      }
    }

    aggregatedResult.duration = Date.now() - scrapeStartTime;
    await job.progress(90);

    // 4. Get or create category
    const categoryId = await dbService.getOrCreateCategory({
      name: 'All Products',
      slug: 'all-products',
      seedType: undefined,
    });

    // 5. Save products to database
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

    // 5.1. Populate seedId for price detection
    // Query DB to get seedProduct IDs by slug
    const productSlugs = aggregatedResult.products.map(p => p.slug);
    const savedProducts = await prisma.seedProduct.findMany({
      where: {
        slug: { in: productSlugs },
        sellerId,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    const slugToIdMap = new Map(savedProducts.map(p => [p.slug, p.id]));

    // Populate seedId into products array
    for (const product of aggregatedResult.products) {
      const seedId = slugToIdMap.get(product.slug);
      if (seedId) {
        (product as any).seedId = seedId;
      }
    }

    apiLogger.debug('[DEBUG WORKER] Populated seedIds for price detection', {
      jobId,
      totalProducts: aggregatedResult.products.length,
      productsWithIds: aggregatedResult.products.filter((p: any) => p.seedId).length,
    });

    // 6. Update job COMPLETED
    await prisma.scrapeJob.update({
      where: { jobId },
      data: {
        status: aggregatedResult.errors === scrapingSourceCount ? ScrapeJobStatus.FAILED : ScrapeJobStatus.COMPLETED,
        completedAt: new Date(),
        totalPages: aggregatedResult.totalPages,
        productsScraped: aggregatedResult.totalProducts,
        productsSaved: saveResult.saved,
        productsUpdated: saveResult.updated,
        errors: aggregatedResult.errors + saveResult.errors,
        duration: aggregatedResult.duration,
      },
    });

    await job.progress(100);

    apiLogger.info('[INFO WORKER] Job completed successfully', { jobId });

    // Return result with seller info for price change detection
    return {
      success: true,
      jobId,
      sellerId,
      sellerName: scraperSourceName, // Will be used for price alert
      totalProducts: aggregatedResult.totalProducts,
      saved: saveResult.saved,
      updated: saveResult.updated,
      products: aggregatedResult.products, // Include scraped products
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const errorClassification = ErrorProcessorService.classifyError(
      error instanceof Error ? error : errorMessage,
      {
        jobId,
        sellerId,
        source: 'worker'
      }
    );

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

    throw error;
  }
}
