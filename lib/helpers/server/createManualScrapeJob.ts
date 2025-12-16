import { prisma } from "@/lib/prisma";
import { addScraperJob } from "@/lib/queue/scraper-queue";
import { randomUUID } from "crypto";


export async function createManualScrapeJob(seller: {id:string,scrapingSourceUrl:string}, scraperSource: string) {
    // Tạo một job mới
    const jobId = `manual_${Date.now()}_${randomUUID().substring(0, 8)}`
    // Tạo job trong cơ sở dữ liệu
    await prisma.scrapeJob.create({
        data: {
            jobId,
            sellerId: seller.id,
            status: 'PENDING',
            mode: 'manual',
            targetCategoryId: null,
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

    // Add to scraper queue
    await addScraperJob({
        jobId,
        sellerId: seller.id,
        source: scraperSource,
        mode: 'manual', // Manual mode for full site crawl
        config: {
            scrapingSourceUrl: seller.scrapingSourceUrl,
            categorySlug: 'all-products',
            // No page restrictions - crawl entire site
            fullSiteCrawl: true
        },
    });

    return jobId;
}