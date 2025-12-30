import { prisma } from "@/lib/prisma";
import { addScraperJob } from "@/lib/queue/scraper-queue";
import { randomUUID } from "crypto";
import { getSellerById } from "./seller/getSellerById";
import { apiLogger } from "../api-logger";
import { ScrapeJobConfig } from "@/types/scrapeJob.type";
import { ScrapingSource, ScrapeJobStatus } from "@prisma/client";
import { config } from "process";

// Giải thích: Hàm này tạo một job mới cho việc scrape dữ liệu thủ công từ một seller cụ thể
interface CreateManualScrapeJobProps {
    sellerId: string;
    scrapingSources: Array<{
        scrapingSourceUrl: string;
        scrapingSourceName: string;
        maxPage: number;
    }>;
    scrapingConfig: ScrapeJobConfig;
    targetCategoryId?: string | null;
}

export async function createManualScrapeJob({
    sellerId,
    scrapingSources,
    scrapingConfig,
    targetCategoryId
}: CreateManualScrapeJobProps) {


    apiLogger.debug("Check scraping config before create new record scrapejob in database", { scrapingConfig });
    // Tạo một job mới với tên ngẫu nhiên
    const jobId = `${scrapingConfig.mode}_${Date.now()}_${randomUUID().substring(0, 8)}`
    // Khởi tạo job vào database cho bảng model ScrapeJob phục vụ cho Monitoring
    await prisma.scrapeJob.create({
        data: {
            jobId,
            sellerId,
            status: ScrapeJobStatus.CREATED, // Job được tạo trong database, chưa vào queue
            mode: scrapingConfig.mode || 'manual',
            targetCategoryId,
            currentPage: 0,
            totalPages: 0,
            productsScraped: 0,
            productsSaved: 0,
            productsUpdated: 0,
            errors: 0,
            startPage: scrapingConfig.startPage || null,
            endPage: scrapingConfig.endPage || null,
            maxPages: scrapingConfig.mode === 'test' && scrapingConfig.endPage 
                ? scrapingConfig.endPage 
                : null  // maxPages only for test mode, otherwise unlimited  // Use endPage as maxPages for test mode
        }
    });

    // Thêm Job cần làm vào hàng đợi queue bull
    apiLogger.debug("Check all params before adding to queue bull", { 
        jobId, 
        sellerId, 
        scrapingSources, 
        mode: scrapingConfig.mode || 'manual', 
        config: scrapingConfig
    })
        // No providing repeat options for manual and test scrape
    await addScraperJob({
        jobId,
        sellerId,
        scrapingSources,
        config: scrapingConfig,
    });

    apiLogger.info(`[INFO] Created job with config successfully`, { jobId, mode: scrapingConfig.mode });

    return jobId;
    
}