import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/helpers/api-logger";

/**
 * GET /api/scrapeJob - Query scrape jobs
 * 
 * Query params:
 * - jobId: specific job ID
 * - sellerId: filter by seller ID  
 * - status: filter by status (PENDING, RUNNING, COMPLETED, FAILED)
 * - mode: filter by mode (manual, batch)
 * - limit: number of results (default: 10, max: 100)
 * - offset: pagination offset (default: 0)
 * 
 * Examples:
 * - GET /api/scrapeJob?jobId=manual_123456
 * - GET /api/scrapeJob?sellerId=cmj0d1rpl0000rwsbk7cy4l1w
 * - GET /api/scrapeJob?status=COMPLETED&limit=5
 * - GET /api/scrapeJob?mode=manual&sellerId=cmj0d1rpl0000rwsbk7cy4l1w
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const jobId = searchParams.get('jobId');
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status');
    const mode = searchParams.get('mode');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    apiLogger.info('[ScrapeJob API] Query request', {
      jobId,
      sellerId,
      status,
      mode,
      limit,
      offset
    });

    // If jobId is provided, return specific job
    if (jobId) {
      const scrapeJob = await prisma.scrapeJob.findUnique({
        where: { jobId },
        include: {
          seller: {
            select: { id: true, name: true, url: true }
          }
        }
      });

      if (!scrapeJob) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Job not found',
            jobId 
          },
          { status: 404 }
        );
      }

      apiLogger.info('[ScrapeJob API] Job found', { jobId, status: scrapeJob.status });

      return NextResponse.json({
        success: true,
        data: scrapeJob
      });
    }

    // Build where clause for filtering
    const where: any = {};
    
    if (sellerId) where.sellerId = sellerId;
    if (status) where.status = status;
    if (mode) where.mode = mode;

    // Query jobs with pagination
    const [scrapeJobs, total] = await Promise.all([
      prisma.scrapeJob.findMany({
        where,
        include: {
          seller: {
            select: { id: true, name: true, url: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.scrapeJob.count({ where })
    ]);

    apiLogger.info('[ScrapeJob API] Query completed', {
      found: scrapeJobs.length,
      total,
      filters: { sellerId, status, mode }
    });

    return NextResponse.json({
      success: true,
      data: {
        jobs: scrapeJobs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });

  } catch (error) {
    apiLogger.logError('[ScrapeJob API] Query failed', error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}