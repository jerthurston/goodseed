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
    customStartTime?: Date; // ✅ Custom start time for first run
}

/**
 * Generate cron pattern từ autoScrapeInterval (hours) và optional customStartTime
 * @param intervalHours - Interval in hours between runs
 * @param customStartTime - Optional custom start time for first run
 */
function generateCronPattern(intervalHours: number, customStartTime?: Date): string {
    // If custom start time provided, use its hour and minute
    if (customStartTime) {
        const minute = customStartTime.getMinutes();
        const hour = customStartTime.getHours();
        
        apiLogger.info('[Schedule Helper] Using custom start time for cron pattern', {
            customStartTime: customStartTime.toISOString(),
            minute,
            hour,
            intervalHours
        });
        
        // Generate cron based on interval but using custom time
        if (intervalHours === 24) {
            return `${minute} ${hour} * * *`; // Daily at custom time
        } else if (intervalHours === 12) {
            const secondHour = (hour + 12) % 24;
            return `${minute} ${hour},${secondHour} * * *`; // Twice a day
        } else if (intervalHours === 8) {
            const hour2 = (hour + 8) % 24;
            const hour3 = (hour + 16) % 24;
            return `${minute} ${hour},${hour2},${hour3} * * *`; // Three times a day
        } else if (intervalHours === 6) {
            return `${minute} */${intervalHours} * * *`; // Every 6 hours
        } else if (intervalHours === 4) {
            const hours = Array.from({ length: 6 }, (_, i) => (hour + i * 4) % 24).join(',');
            return `${minute} ${hours} * * *`; // Every 4 hours
        } else {
            return `${minute} */${intervalHours} * * *`; // Generic interval
        }
    }
    
    // Fallback: If no custom time provided, use simple interval-based cron
    // This starts at minute 0 of every N hours
    apiLogger.warn('[Schedule Helper] No custom start time provided, using simple interval-based cron', {
        intervalHours
    });
    
    return `0 */${intervalHours} * * *`; // Every N hours at minute 0
}

export async function createScheduleAutoScrapeJob({
    sellerId,
    sellerName,
    autoScrapeInterval,
    scrapingSources,
    scrapingConfig: {
        fullSiteCrawl
    },
    targetCategoryId,
    customStartTime
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

        // Generate cron pattern with custom start time if provided
        const cronPattern = generateCronPattern(autoScrapeInterval, customStartTime);

        // Debug log trước khi add to queue
        apiLogger.debug("Check all params before adding to queue", {
            jobId,
            sellerId,
            sellerName,
            scrapingSources,
            mode: 'auto',
            cronPattern,
            intervalHours: autoScrapeInterval,
            config: { fullSiteCrawl: true },
            customStartTime: customStartTime?.toISOString()
        });

        // IMPORTANTCODE: Thêm job vào hàng đợi queue bull với repeat options
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

