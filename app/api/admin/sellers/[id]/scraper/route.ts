/**
 * API route to handle scraping for a specific seller
 * Handles POST: Manual trigger scraping for a specific seller
 * Handles GET: Retrieve scraping status for a specific seller
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ScrapeJobStatus } from '@prisma/client';
import { createManualScrapeJob } from '@/lib/helpers/server/createManualScrapeJob';
import { ScraperFactory } from '@/lib/factories/scraper-factory';
import { getScraperSource } from '@/lib/helpers/server/getScraperSource';
import { getSellerById } from '@/lib/helpers/server/seller/getSellerById';
import { apiLogger } from '@/lib/helpers/api-logger';

const ManualScrapeSchema = z.object({
  scrapingConfig: z.object({
    fullSiteCrawl: z.boolean().default(true),
    startPage: z.number().min(1).optional(),
    endPage: z.number().min(1).optional(),
    mode: z.enum(['manual', 'auto', 'test']).default('manual')
  })
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const sellerId = resolvedParams.id;
    const body = await request.json();
    
    // Validate input
    const validation = ManualScrapeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: z.treeifyError(validation.error)
          }
        },
        { status: 400 }
      );
    }
    // extract maxPage - TODO: Cần viết logic sử dụng với scrapingConfig
    const { fullSiteCrawl, startPage, endPage, mode } = validation.data.scrapingConfig;

    apiLogger.debug("Scraping config nhận được ở route", { fullSiteCrawl, startPage, endPage, mode });
    // Find seller
    const seller = await getSellerById(sellerId);

    if (!seller) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'SELLER_NOT_FOUND',
            message: `Seller with ID ${sellerId} not found`
          }
        },
        { status: 404 }
      );
    }

    if (!seller.isActive) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'SELLER_INACTIVE',
            message: `Seller ${seller.name} is inactive`
          }
        },
        { status: 400 }
      );
    }

   
    // Check for existing jobs
    // Giải thích: Kiểm tra xem có công việc nào đang chờ xử lý hoặc đang tiến hành không
    const existingJob = await prisma.scrapeJob.findFirst({
      where: {
        sellerId,
        status: {
          in: [ScrapeJobStatus.WAITING, ScrapeJobStatus.ACTIVE]
        }
      }
    });

    if (existingJob) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'JOB_ALREADY_EXISTS',
            message: `A scraping job is already running for ${seller.name}`
          }
        },
        { status: 409 }
      );
    }

     // Lấy tất cả các sources từ seller để đi crawling
     const { scrapingSources } = seller;
/**
 * Create a manual scrape job for the seller.
 * @param seller là object bao gồm id:string và scrapingSourceUrl:string[]
 * @param scraperSource The scraper source
 */
    apiLogger.debug("Check scraping Config before transfer into createManualScrapeJob", { fullSiteCrawl, startPage, endPage, mode });
    const jobResult = await createManualScrapeJob({
      sellerId,
      scrapingSources: scrapingSources,
      scrapingConfig:{
        fullSiteCrawl,
        startPage,
        endPage,
        mode
      },
    });

    apiLogger.debug("Check jobResult", { jobResult });
    apiLogger.debug("starting top update seller lastScraped", { sellerId });

   const updateScrapeSeller = await prisma.seller.update({
      where: { id: sellerId },
      data: {
        lastScraped: new Date(),
        updatedAt: new Date(),
      }
    });

    if(!updateScrapeSeller) {
      apiLogger.logError("Failed to update seller lastScraped", { sellerId });
    }

    apiLogger.debug("Update seller lastScraped success", { sellerId });

    return NextResponse.json({
      success: true,
      data: {
        jobId: jobResult,
        sellerId,
        sellerName: seller.name,
        status: 'PENDING',
        message: `Manual scrape job created for ${seller.name}`,
        estimatedPages: validation.data.scrapingConfig
      }
    });

  } catch (error) {
    apiLogger.logError('Manual scrape failed:', {error});
    
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create scrape job',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        }
      },
      { status: 500 }
    );
  }
}

// GET method to check scraper status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const sellerId = resolvedParams.id;
    
    // Get seller with recent jobs
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      include: {
        scrapeJobs: {
          orderBy: { createdAt: 'desc' },
          take: 5 // Last 5 jobs
        }
      }
    });

    if (!seller) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'SELLER_NOT_FOUND',
            message: `Seller with ID ${sellerId} not found`
          }
        },
        { status: 404 }
      );
    }

    // Check active jobs
    const activeJob = seller.scrapeJobs.find(job => 
      job.status === ScrapeJobStatus.WAITING || job.status === ScrapeJobStatus.ACTIVE
    );

    return NextResponse.json({
      success: true,
      data: {
        sellerId,
        sellerName: seller.name,
        isActive: seller.isActive,
        lastScraped: seller.lastScraped,
        hasActiveJob: !!activeJob,
        activeJob: activeJob || null,
        recentJobs: seller.scrapeJobs
      }
    });

  } catch (error) {
    console.error('Get scraper status failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get scraper status'
        }
      },
      { status: 500 }
    );
  }
}

