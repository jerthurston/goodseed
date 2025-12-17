import { apiLogger } from "@/lib/helpers/api-logger";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/scraper/logs
 * 
 * Query scraping job history with filters and pagination
 * 
 * Query Parameters:
 * - status: Filter by status (PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED)
 * - sellerId: Filter by seller ID
 * - mode: Filter by mode (batch, auto, test)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sortBy: Sort field (createdAt, startedAt, duration) (default: createdAt)
 * - sortOrder: Sort order (asc, desc) (default: desc)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "jobs": [...],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 20,
 *       "total": 150,
 *       "totalPages": 8
 *     }
 *   }
 * }
 */

interface LogsQuery {
  status?: string;
  sellerId?: string;
  mode?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface LogsResponse {
  success: boolean;
  data?: {
    jobs: Array<{
      jobId: string;
      status: string;
      mode: string;
      scrapingSourceUrl: string;
      progress: {
        productsScraped: number;
        productsSaved: number;
        productsUpdated: number;
        errors: number;
      };
      timing: {
        startedAt: string | null;
        completedAt: string | null;
        duration: number | null;
      };
      seller: {
        id: string;
        name: string;
      };
      createdAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function GET(req: NextRequest): Promise<NextResponse<LogsResponse>> {
  try {
    const searchParams = req.nextUrl.searchParams;

    // Parse query parameters
    const status = searchParams.get('status') || undefined;
    const sellerId = searchParams.get('sellerId') || undefined;
    const mode = searchParams.get('mode') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    apiLogger.info('[Scraper Logs API] Query logs', {
      status,
      sellerId,
      mode,
      page,
      limit,
    });

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (sellerId) where.sellerId = sellerId;
    if (mode) where.mode = mode;

    // Build orderBy
    const orderBy: any = {};
    if (sortBy === 'createdAt' || sortBy === 'startedAt') {
      orderBy[sortBy] = sortOrder;
    } else if (sortBy === 'duration') {
      orderBy.duration = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    // Get total count
    const total = await prisma.scrapeJob.count({ where });

    // Get paginated jobs
    const jobs = await prisma.scrapeJob.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            scrapingSourceUrl: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    // Build response
    const response: LogsResponse = {
      success: true,
      data: {
        jobs: jobs.map((job) => ({
          jobId: job.jobId,
          status: job.status,
          mode: job.mode,
          scrapingSourceUrl: job.seller.scrapingSourceUrl,
          progress: {
            productsScraped: job.productsScraped,
            productsSaved: job.productsSaved,
            productsUpdated: job.productsUpdated,
            errors: job.errors,
          },
          timing: {
            startedAt: job.startedAt?.toISOString() || null,
            completedAt: job.completedAt?.toISOString() || null,
            duration: job.duration,
          },
          seller: {
            id: job.seller.id,
            name: job.seller.name,
          },
          createdAt: job.createdAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    };

    apiLogger.info('[Scraper Logs API] Logs retrieved', {
      count: jobs.length,
      total,
      page,
    });

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    apiLogger.logError(
      '[Scraper Logs API]',
      error instanceof Error ? error : new Error(String(error)),
      { message: errorMessage }
    );

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
