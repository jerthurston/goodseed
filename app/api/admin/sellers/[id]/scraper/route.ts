/**
 * API route to handle scraping for a specific seller
 * Handles POST: Manual trigger scraping for a specific seller
 * Handles GET: Retrieve scraping status for a specific seller
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createManualScrapeJob } from '@/lib/helpers/server/createManualScrapeJob';
import { ScraperFactory } from '@/lib/factories/scraper-factory';
import { getScraperSource } from '@/lib/helpers/server/getScraperSource';

const ManualScrapeSchema = z.object({
  maxPages: z.number().optional().default(30), // Allow override maxPages
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sellerId = params.id;
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
            details: validation.error.flatten()
          }
        },
        { status: 400 }
      );
    }

    // Find seller
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId }
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

    // Get scraper source from seller name
    const scraperSource = getScraperSource(seller.name);
    
    // Verify scraper is supported
    const supportedSources = ScraperFactory.getSupportedSources();
    if (!supportedSources.includes(scraperSource)) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'SCRAPER_NOT_SUPPORTED',
            message: `Scraper for ${seller.name} (${scraperSource}) is not supported`
          }
        },
        { status: 400 }
      );
    }

    // Check for existing jobs
    const existingJob = await prisma.scrapeJob.findFirst({
      where: {
        sellerId,
        status: {
          in: ['PENDING', 'IN_PROGRESS']
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

    // Create scrape job
    const jobResult = await createManualScrapeJob(seller, scraperSource, {
      maxPages: validation.data.maxPages
    });

    // Update seller last scrape timestamp
    await prisma.seller.update({
      where: { id: sellerId },
      data: {
        lastScraped: new Date(),
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId: jobResult.jobId,
        sellerId,
        sellerName: seller.name,
        status: 'PENDING',
        message: `Manual scrape job created for ${seller.name}`,
        estimatedPages: validation.data.maxPages
      }
    });

  } catch (error) {
    console.error('Manual scrape failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create scrape job',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      },
      { status: 500 }
    );
  }
}

// GET method to check scraper status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sellerId = params.id;
    
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
      job.status === 'PENDING' || job.status === 'IN_PROGRESS'
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


//--> Galecy code

// export async function GET() {
//   try {
//     apiLogger.debug("Fetching scraper sites from database at api route api/admin/scraper-sites");
//     const sellers = await prisma.seller.findMany({
//       include: {
//         scrapeLogs: {
//           orderBy: { timestamp: "desc" },
//           take: 1,
//         },
//       },
//       orderBy: { name: "asc" },
//     })

//     apiLogger.logResponse("Fetched scraper sites", { sitesCount: sellers.length });

//     // Không cần tách transform chổ này.
//     const transformedData = sellers.map((seller) => {
//       const latestScrapeLog = seller.scrapeLogs[0]
//       const lastScraped = latestScrapeLog
//         ? formatRelativeTime(new Date(latestScrapeLog.timestamp))
//         : "Never"

//       return {
//         id: seller.id,
//         name: seller.name,
//         url: seller.url,
//         lastScraped,
//         autoScrapeInterval: seller.autoScrapeInterval,
//         isAutoEnabled: seller.isActive,
//       }
//     })

//     return NextResponse.json(transformedData)
//   } catch (error) {
//     console.error("Error fetching scraper sites:", error)
//     return NextResponse.json(
//       { error: "Failed to fetch scraper sites" },
//       { status: 500 }
//     )
//   }
// }


