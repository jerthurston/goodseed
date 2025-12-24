/**
 * Recent Scraper Errors API
 * GET /api/admin/scraper/recent-errors
 * 
 * Returns recent errors from both ScrapeLog (activity-level) and ScrapeJob (job-level)
 * Used by ErrorAlertBanner and useScraperErrorMonitor hook
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/helpers/api-logger";

interface ScraperErrorAlert {
  id: string;
  sellerId: string;
  sellerName: string;
  errorMessage: string;
  timestamp: Date;
  jobId?: string;
  errorSource: 'ACTIVITY' | 'JOB';
  errorDetails?: any;
  duration?: number | null;
  productsFound?: number;
}

/**
 * GET /api/admin/scraper/recent-errors
 * 
 * Query params:
 * - timeframe: minutes to look back (default: 15, max: 60)
 * - limit: number of results (default: 20, max: 50)
 * - severity: 'all' | 'high' | 'critical' (default: 'all')
 * 
 * Returns combined errors from ScrapeLog and ScrapeJob tables
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = Math.min(Number(searchParams.get('timeframe')) || 15, 60); // Max 1 hour
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50); // Max 50 results
    const severity = searchParams.get('severity') || 'all';

    apiLogger.info('[Recent Errors API] Fetching recent errors', { 
      timeframe, 
      limit, 
      severity 
    });

    // Calculate time threshold
    const timeThreshold = new Date(Date.now() - timeframe * 60 * 1000);

    // Query 1: Activity-level errors from ScrapeLog
    const scrapeLogErrors = await prisma.scrapeLog.findMany({
      where: {
        status: 'error',
        timestamp: {
          gte: timeThreshold
        }
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });

    // Query 2: Job-level errors from ScrapeJob
    const scrapeJobErrors = await prisma.scrapeJob.findMany({
      where: {
        status: 'FAILED',
        updatedAt: {
          gte: timeThreshold
        }
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit
    });

    // Transform and combine results
    const transformedErrors: ScraperErrorAlert[] = [
      // ScrapeLog errors (activity-level)
      ...scrapeLogErrors.map(log => ({
        id: `log_${log.id}`,
        sellerId: log.sellerId,
        sellerName: log.seller.name,
        errorMessage: extractErrorMessage(log.errors),
        timestamp: log.timestamp,
        errorSource: 'ACTIVITY' as const,
        duration: log.duration,
        productsFound: log.productsFound
      })),
      
      // ScrapeJob errors (job-level)  
      ...scrapeJobErrors.map(job => ({
        id: `job_${job.id}`,
        sellerId: job.sellerId,
        sellerName: job.seller.name,
        errorMessage: job.errorMessage || 'Unknown job error',
        timestamp: job.updatedAt,
        jobId: job.jobId,
        errorSource: 'JOB' as const,
        errorDetails: job.errorDetails,
        duration: job.duration
      }))
    ];

    // Sort combined results by timestamp (newest first)
    const sortedErrors = transformedErrors
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    // Apply severity filtering if needed
    const filteredErrors = severity === 'all' 
      ? sortedErrors
      : sortedErrors.filter(error => matchesSeverity(error, severity));

    // Get summary statistics
    const summary = {
      totalErrors: filteredErrors.length,
      timeframe,
      errorsBySource: {
        ACTIVITY: filteredErrors.filter(e => e.errorSource === 'ACTIVITY').length,
        JOB: filteredErrors.filter(e => e.errorSource === 'JOB').length
      },
      errorsBySeller: filteredErrors.reduce((acc, error) => {
        acc[error.sellerId] = (acc[error.sellerId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    apiLogger.info('[Recent Errors API] Errors fetched successfully', {
      totalFound: filteredErrors.length,
      activityErrors: summary.errorsBySource.ACTIVITY,
      jobErrors: summary.errorsBySource.JOB,
      timeframe
    });

    return NextResponse.json({
      success: true,
      data: {
        errors: filteredErrors,
        summary,
        fetchedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    apiLogger.logError('[Recent Errors API] Failed to fetch recent errors', error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'FETCH_ERRORS_FAILED',
          message: 'Failed to fetch recent errors'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Extract error message from ScrapeLog.errors JSON field
 */
function extractErrorMessage(errors: any): string {
  if (!errors) return 'Unknown error';
  
  if (typeof errors === 'string') return errors;
  
  if (typeof errors === 'object') {
    return errors.message || errors.error || 'Scraping failed';
  }
  
  return 'Unknown error format';
}

/**
 * Check if error matches severity filter
 */
function matchesSeverity(error: ScraperErrorAlert, severity: string): boolean {
  switch (severity) {
    case 'critical':
      // Critical: job failures or multiple activity failures from same seller
      return error.errorSource === 'JOB';
    case 'high':
      // High: recent activity failures
      return error.errorSource === 'ACTIVITY';
    default:
      return true;
  }
}