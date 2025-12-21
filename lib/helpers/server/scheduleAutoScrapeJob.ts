import { prisma } from "@/lib/prisma";
import { ScrapeJobConfig } from "@/types/scrapeJob.type";
import { randomUUID } from "crypto";
import { apiLogger } from "../api-logger";
import { addScraperJob, unscheduleAutoScrapeJob } from "@/lib/queue/scraper-queue";



interface CreateScheduleAutoScrapeJobProps {
    sellerId: string;
    sellerName: string; // Cũng nên thêm để consistent với tài liệu
    autoScrapeInterval: number; // ✅ ADD THIS
    scrapingSources: Array<{
        scrapingSourceUrl: string;
        scrapingSourceName: string;
        maxPage: number;
    }>;
    scrapingConfig: ScrapeJobConfig;
    targetCategoryId?: string | null;
}

/**
 * Generate cron pattern từ autoScrapeInterval (hours)
 */
function generateCronPattern(intervalHours: number): string {
    // Chạy vào giờ ít traffic (2:00 AM) và mỗi interval hours
    if (intervalHours === 24) {
        return '0 2 * * *'; // Daily lúc 2:00 AM
    } else if (intervalHours === 12) {
        return '0 2,14 * * *'; // 2:00 AM và 2:00 PM
    } else if (intervalHours === 8) {
        return '0 2,10,18 * * *'; // 2:00 AM, 10:00 AM, 6:00 PM
    } else if (intervalHours === 6) {
        return '0 */6 * * *'; // Every 6 hours starting từ midnight
    } else if (intervalHours === 4) {
        return '0 2,6,10,14,18,22 * * *'; // Every 4 hours, avoiding peak hours
    } else {
        // Fallback cho các interval khác
        return `0 */${intervalHours} * * *`;
    }
}

export async function createScheduleAutoScrapeJob({
    sellerId,
    sellerName,
    autoScrapeInterval,
    scrapingSources,
    scrapingConfig: {
        fullSiteCrawl
    },
    targetCategoryId
}: CreateScheduleAutoScrapeJobProps) {

    try {
        // Validation
        if (!autoScrapeInterval || autoScrapeInterval <= 0) {
            throw new Error('Invalid autoScrapeInterval');
        }

        if (!scrapingSources.length) {
            throw new Error('No scraping sources provided');
        }

        // IMPORTANT: sử dụng unscheduleAutoScrapeJob để hủy bỏ job cũ
        await unscheduleAutoScrapeJob(sellerId);

        // Tạo job vào database cho bảng model Scrape phục vụ cho monitoring
        const jobId = `auto_${sellerId}_${Date.now()}_${randomUUID().substring(0, 8)}`;

        await prisma.scrapeJob.create({
            data: {
                jobId,
                sellerId,
                status: "PENDING",
                mode: "auto",
                targetCategoryId,
                currentPage: 0,
                totalPages: 0,
                productsSaved: 0,
                productsScraped: 0,
                productsUpdated: 0,
                errors: 0,
                startPage: null, // Auto mode không giới hạn
                endPage: null,
                maxPages: null
            }
        });

        // Generate cron pattern
        const cronPattern = generateCronPattern(autoScrapeInterval);

        // Debug log trước khi add to queue
        apiLogger.debug("Check all params before adding to queue", {
            jobId,
            sellerId,
            sellerName,
            scrapingSources,
            mode: 'auto',
            cronPattern,
            intervalHours: autoScrapeInterval,
            config: { fullSiteCrawl: true }
        });

        // Thêm job vào hàng đợi queue bull với repeat options
        const job = await addScraperJob(
            // clean data
            {
                jobId, //Job Data jobId (Database jobId)
                sellerId,
                scrapingSources,
                mode: 'auto', // Auto mode for full site crawl
                config: {
                    fullSiteCrawl: true,
                },
            },
            // repeat options cho mode === auto
            {
                repeat: {
                    cron: cronPattern
                },
                jobId: `auto_scrape_${sellerId}` // Bull Queue jobId (Queue Management jobId)
            }
        );
      

        apiLogger.info('[Auto Scraper Helper] Scheduled auto scrape job', {
            sellerId,
            sellerName,
            cronPattern,
            intervalHours: autoScrapeInterval,
            jobId: job.id,
        });

        return {
            jobId: job.id,
            cronPattern,
            intervalHours: autoScrapeInterval,
            message: 'Auto scrape job scheduled successfully',
        };

    } catch (error) {
        apiLogger.logError('[Auto Scraper Helper] Failed to schedule auto job', error as Error, {
            sellerId,
            sellerName,
            autoScrapeInterval,
        });
        throw error;
    }
}

