import { apiLogger } from "@/lib/helpers/api-logger";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/scraper/status/[jobId]
 * 
 * Check scraping job progress and status
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "jobId": "scrape_123",
 *     "status": "IN_PROGRESS",
 *     "mode": "auto",
 *     "progress": {
 *       "currentPage": 45,
 *       "totalPages": 154,
 *       "productsScraped": 720,
 *       "productsSaved": 680,
 *       "productsUpdated": 40,
 *       "errors": 0
 *     },
 *     "timing": {
 *       "startedAt": "2025-12-10T05:00:00Z",
 *       "duration": 45000
 *     },
 *     "seller": {
 *       "id": "xxx",
 *       "name": "vancouverseedbank"
 *     }
 *   }
 * }
 */

interface StatusResponse {
  success: boolean;
  data?: {
    jobId: string;
    status: string;
    mode: string;
    scrapingSourceUrl: string;
    targetCategoryId: string | null;
    progress: {
      currentPage: number | null;
      totalPages: number | null;
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
    error?: {
      message: string | null;
      details: unknown;
    };
    createdAt: string;
    updatedAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<NextResponse<StatusResponse>> {
  try {
    const { jobId } = await params;

    apiLogger.info('[Scraper Status API] Checking job status', { jobId });

    // Query job from database
    const job = await prisma.scrapeJob.findUnique({
      where: { jobId },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            scrapingSourceUrl: true,
          },
        },
      },
    });

    if (!job) {
      apiLogger.warn('[Scraper Status API] Job not found', { jobId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: `Job with ID ${jobId} not found`,
          },
        },
        { status: 404 }
      );
    }

    // Build response
    const response: StatusResponse = {
      success: true,
      data: {
        jobId: job.jobId,
        status: job.status,
        mode: job.mode,
        scrapingSourceUrl: job.seller.scrapingSourceUrl,
        targetCategoryId: job.targetCategoryId,
        progress: {
          currentPage: job.currentPage,
          totalPages: job.totalPages,
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
        error: job.errorMessage
          ? {
            message: job.errorMessage,
            details: job.errorDetails,
          }
          : undefined,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      },
    };

    apiLogger.info('[Scraper Status API] Job status retrieved', {
      jobId,
      status: job.status,
    });

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    apiLogger.logError(
      '[Scraper Status API]',
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
