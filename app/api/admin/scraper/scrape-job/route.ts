import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ScrapeJobStatus } from "@prisma/client";
import { apiLogger } from "@/lib/helpers/api-logger";

/**
 * GET /api/admin/scraper/scrape-job - Query scrape jobs
 * 
 * Query params:
 * - sellerId: filter by seller ID  
 * - status: filter by status (CREATED, WAITING, DELAYED, ACTIVE, COMPLETED, FAILED, CANCELLED)
 * - mode: filter by mode (manual, batch, auto, test)
 * - limit: number of results (default: 10, max: 100)
 * - offset: pagination offset (default: 0)
 * 
 * Examples:
 * - GET /api/admin/scraper/scrape-job?sellerId=cmj0d1rpl0000rwsbk7cy4l1w
 * - GET /api/admin/scraper/scrape-job?status=COMPLETED&limit=5
 * - GET /api/admin/scraper/scrape-job?mode=auto&sellerId=cmj0d1rpl0000rwsbk7cy4l1w
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status');
    const mode = searchParams.get('mode');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    apiLogger.info('[ScrapeJob API] Query request', {
      sellerId,
      status,
      mode,
      limit,
      offset
    });

    // Build where clause
    const where: any = {};
    
    if (sellerId) {
      where.sellerId = sellerId;
    }
    
    if (status) {
      // Validate status is a valid enum value
      if (Object.values(ScrapeJobStatus).includes(status as ScrapeJobStatus)) {
        where.status = status as ScrapeJobStatus;
      }
    }
    
    if (mode) {
      where.mode = mode;
    }

    // Get scrape jobs with pagination
    const [scrapeJobs, totalCount] = await Promise.all([
      prisma.scrapeJob.findMany({
        where,
        include: {
          seller: {
            select: { 
              id: true, 
              name: true, 
              url: true 
            }
          },
          targetCategory: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.scrapeJob.count({ where })
    ]);

    const response = {
      jobs: scrapeJobs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      filters: {
        sellerId,
        status,
        mode
      }
    };

    // LOG response API
    apiLogger.debug('[ScrapeJob API] Fetched jobs successfully', { scrapeJobs });

    return NextResponse.json(response);

  } catch (error) {
    apiLogger.logError('[ScrapeJob API] Failed to fetch jobs', error as Error, {
      searchParams: request.url
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/scraper/scrape-job - Create new scrape job
 * 
 * Body should contain job configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // This would typically create a new scrape job
    // For now, return a method not implemented
    return NextResponse.json(
      { error: "POST method not implemented yet. Use specific scraper endpoints to create jobs." },
      { status: 501 }
    );

  } catch (error) {
    apiLogger.logError('[ScrapeJob API] Failed to create job', error as Error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}