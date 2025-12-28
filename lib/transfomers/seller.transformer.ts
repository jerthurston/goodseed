// lib/transformers/seller.transformer.ts

import { apiLogger } from '@/lib/helpers/api-logger';
import { ScrapeJobStatus } from '@prisma/client';
import { SellerRaw, SellerUI } from '@/types/seller.type';



export class SellerTransformer {
  /**
   * Transform raw seller data to UI format
   */
  static toUI(raw: SellerRaw): SellerUI {
    apiLogger.logRequest('SellerTransformer.toUI', {
      sellerId: raw.id,
      sellerName: raw.name,
      scrapeJobsCount: raw.scrapeJobs?.length || 0,
      scrapeLogsCount: raw.scrapeLogs?.length || 0,
      seedCategoriesCount: raw.seedCategories?.length || 0
    });

    // Calculate scrape job statistics
    const completedJobs = raw.scrapeJobs.filter(
      (job) => job.status === ScrapeJobStatus.COMPLETED
    );
    const totalRuns = raw.scrapeJobs.length;
    const successfulRuns = completedJobs.length;
    const successRate =
      totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;

    // Calculate total products scraped
    const totalProductsScraped = raw.seedCategories?.reduce(
      (sum, category) => sum + category.seedProducts.length,
      0
    );

    // Format last scraped time
    const latestScrapeLog = raw.scrapeLogs?.[0];
    const lastScraped = latestScrapeLog
      ? this.formatRelativeTime(new Date(latestScrapeLog.timestamp))
      : "Never";

    const result: SellerUI = {
      id: raw.id,
      name: raw.name,
      url: raw.url,
      isActive: raw.isActive,
      lastScraped,
      autoScrapeInterval: raw.autoScrapeInterval,
      isAutoEnabled: raw.autoScrapeInterval != null && raw.autoScrapeInterval > 0,
      stats: {
        successRate,
        productsScraped: totalProductsScraped,
        totalRuns,
      },
      //map scrape jobs to UI format
      scrapeJobs: raw.scrapeJobs
    };

    apiLogger.logResponse('SellerTransformer.toUI', {}, {
      sellerId: result.id,
      successRate: result.stats.successRate,
      productsScraped: result.stats.productsScraped,
      totalRuns: result.stats.totalRuns,
      lastScraped: result.lastScraped
    });

    return result;
  }

  /**
   * Transform multiple raw sellers to UI format
   */
  static toUIList(rawList: SellerRaw[]): SellerUI[] {
    apiLogger.logRequest('SellerTransformer.toUIList', {
      sellersCount: rawList.length
    });

    const result = rawList.map(raw => this.toUI(raw));

    apiLogger.logResponse('SellerTransformer.toUIList', {}, {
      transformedCount: result.length
    });

    return result;
  }

  /**
   * Helper function to format relative time
   */
  private static formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }
}
