import { prisma } from "@/lib/prisma";
import { ScrapeJobConfig } from "@/types/scrapeJob.type";
import { ScrapeJobStatus } from "@prisma/client";
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
 * Auto Scraper Schedule Configuration
 * Thay đổi các giá trị này để điều chỉnh lịch chạy auto scraper
 */
const AUTO_SCRAPER_SCHEDULE = {
    MINUTE: 0,     // Phút (0-59) - hiện tại: 0 phút
    HOUR: 2,       // Giờ cho daily job (0-23) - hiện tại: 2 (2 AM Edmonton)
    HOURS: {
        MORNING: 3,     // 3 AM
        AFTERNOON: 15,  // 3 PM
        EVENING: 19,    // 7 PM
        NIGHT: 23      // 11 PM
    }
};

/**
 * Generate cron pattern từ autoScrapeInterval (hours)
 */
function generateCronPattern(intervalHours: number): string {
    const { MINUTE, HOUR, HOURS } = AUTO_SCRAPER_SCHEDULE;
    
    // TEST: Chạy lúc 15:45 (3:45 PM Edmonton time) để test auto scraper
    if (intervalHours === 24) {
        return `${MINUTE} ${HOUR} * * *`; // Daily lúc 3:45 PM for testing
    } else if (intervalHours === 12) {
        return `${MINUTE} ${HOURS.MORNING},${HOURS.AFTERNOON} * * *`; // 3:45 AM và 3:45 PM
    } else if (intervalHours === 8) {
        return `${MINUTE} ${HOURS.MORNING},11,${HOURS.EVENING} * * *`; // 3:45 AM, 11:45 AM, 7:45 PM
    } else if (intervalHours === 6) {
        return `${MINUTE} */${intervalHours} * * *`; // Every 6 hours starting từ 45 minutes
    } else if (intervalHours === 4) {
        return `${MINUTE} ${HOURS.MORNING},7,11,${HOURS.AFTERNOON},${HOURS.EVENING},${HOURS.NIGHT} * * *`; // Every 4 hours at 45 minutes
    } else {
        // Fallback cho các interval khác
        return `${MINUTE} */${intervalHours} * * *`;
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

        // IMPORTANT: Cleanup any existing auto jobs before scheduling new ones
        // This will cause old jobs to be marked as CANCELLED in database for clean state
        apiLogger.info('[Schedule Auto Job] Cleaning up existing auto jobs', { sellerId, sellerName });
        
        await unscheduleAutoScrapeJob(sellerId);

        // Tạo job vào database cho bảng model Scrape phục vụ cho monitoring
        const jobId = `auto_${sellerId}_${Date.now()}_${randomUUID().substring(0, 8)}`;

        // --> Khởi tạo scrapeJob với các giá trị mặc định hoặc được truyền vào
        await prisma.scrapeJob.create({
            data: {
                jobId,
                sellerId,
                status: ScrapeJobStatus.CREATED, // Job được tạo trong database, chưa vào queue
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
                maxPages: null,
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
                config: {
                    fullSiteCrawl: true,
                    mode: 'auto', // Auto mode for full site crawl
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

        // Cập nhật status cho scrapeJob
        await prisma.scrapeJob.update({
            where:{jobId},
            data:{
                status:ScrapeJobStatus.WAITING,
                updatedAt: new Date()
            }
        })

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

