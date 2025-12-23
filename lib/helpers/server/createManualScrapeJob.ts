import { prisma } from "@/lib/prisma";
import { addScraperJob } from "@/lib/queue/scraper-queue";
import { randomUUID } from "crypto";
import { getSellerById } from "./seller/getSellerById";
import { apiLogger } from "../api-logger";
import { ScrapeJobConfig } from "@/types/scrapeJob.type";
import { ScrapingSource } from "@prisma/client";
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
    scrapingConfig: {
        // Use for mode === auto | manual in production environment
        fullSiteCrawl, 
        // {startpage, endPage} use for mode === manual or quick testing
        startPage,
        endPage
    },
    targetCategoryId
}: CreateManualScrapeJobProps) {


    // Tạo một job mới với tên ngẫu nhiên
    const jobId = `manual_${Date.now()}_${randomUUID().substring(0, 8)}`
    // Khởi tạo job vào database cho bảng model ScrapeJob phục vụ cho Monitoring
    await prisma.scrapeJob.create({
        data: {
            jobId,
            sellerId,
            status: 'CREATED', // Job được tạo trong database, chưa vào queue
            mode: 'manual',
            targetCategoryId,
            currentPage: 0,
            totalPages: 0,
            productsScraped: 0,
            productsSaved: 0,
            productsUpdated: 0,
            errors: 0,
            startPage: null, // No page limits for manual scrape
            endPage: null, // Crawl all available pages
            maxPages: null  // No maximum page restriction
        }
    });

    // Thêm Job cần làm vào hàng đợi queue bull
    apiLogger.debug("Check all params before adding to queue", { 
        jobId, 
        sellerId, 
        scrapingSources, 
        mode: 'manual', 
        config: { fullSiteCrawl, startPage, endPage } });

        
    await addScraperJob({
        jobId,
        sellerId,
        scrapingSources,
        mode: 'manual', // Manual mode for full site crawl
        config: {
            fullSiteCrawl,
            endPage,
            startPage,
        },
    });

    apiLogger.info(`[INFO] Created job with config successfully`,)

    return jobId;
    
}