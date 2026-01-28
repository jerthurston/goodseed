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
    // Only count finished jobs (completed, failed, cancelled) for success rate
    const finishedJobs = raw.scrapeJobs.filter(
      (job) => job.status === ScrapeJobStatus.COMPLETED || 
               job.status === ScrapeJobStatus.FAILED || 
               job.status === ScrapeJobStatus.CANCELLED
    );
    const completedJobs = raw.scrapeJobs.filter(
      (job) => job.status === ScrapeJobStatus.COMPLETED
    );
    
    const totalRuns = finishedJobs.length; // Only count finished jobs
    const successfulRuns = completedJobs.length;
    const successRate =
      totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;

    // Calculate total products scraped from seller's seedProducts relation
    // Note: This counts ALL products currently in database for this seller
    const totalProductsScraped = raw.seedProducts?.length || 0;

    // Format last scraped time - use database field if available, otherwise from scrapeLog
    let lastScraped = "Never";
    if (raw.lastScraped) {
      lastScraped = this.formatRelativeTime(new Date(raw.lastScraped));
    } else if (raw.scrapeLogs?.[0]) {
      lastScraped = this.formatRelativeTime(new Date(raw.scrapeLogs[0].timestamp));
    }

    // Get latest finished job status (more accurate than seller.status field)
    const latestFinishedJob = finishedJobs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    
    const lastScrapeStatus = latestFinishedJob 
      ? latestFinishedJob.status
      : null;

    const result: SellerUI = {
      id: raw.id,
      name: raw.name,
      url: raw.url,
      affiliateTag: raw.affiliateTag,
      isActive: raw.isActive,
      lastScraped,
      lastScrapedRaw: raw.lastScraped,
      status: lastScrapeStatus, // Use latest job status instead of deprecated field
      createdAt: this.formatDateTime(raw.createdAt),
      updatedAt: this.formatDateTime(raw.updatedAt),
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
  private static formatRelativeTime(date: Date | null | undefined): string {
    if (!date) return "Never";
    
    try {
      const now = new Date();
      const targetDate = new Date(date);
      
      // Check if date is valid
      if (isNaN(targetDate.getTime())) {
        return "Invalid Date";
      }
      
      const diffMs = now.getTime() - targetDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      return targetDate.toLocaleDateString();
    } catch (error) {
      apiLogger.logError('formatRelativeTime error', error as Error, { date });
      return "Invalid Date";
    }
  }

  /**
   * Helper function to format full date time
   */
  private static formatDateTime(date: Date | null | undefined): string {
    if (!date) return 'N/A';
    
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(new Date(date));
    } catch (error) {
      apiLogger.logError('formatDateTime error', error as Error, { date });
      return 'Invalid Date';
    }
  }
}
