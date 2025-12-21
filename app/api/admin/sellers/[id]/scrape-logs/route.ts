/**
 * Lịch sử scrape
 * Handles GET: Lấy lịch sử scrape của seller này (status, duration, products saved, errors...)
 */


import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/helpers/api-logger";

/**
 * GET /api/scrapeLog - Query scrape logs
 * 
 * Query params:
 * - sellerId: filter by seller ID
 * - status: filter by status (success, error)
 * - limit: number of results (default: 20, max: 100)
 * - offset: pagination offset (default: 0)
 * - dateFrom: filter from date (ISO string)
 * - dateTo: filter to date (ISO string)
 * 
 * Examples:
 * - GET /api/scrapeLog?sellerId=cmj0d1rpl0000rwsbk7cy4l1w
 * - GET /api/scrapeLog?status=error&limit=10
 * - GET /api/scrapeLog?sellerId=cmj0d1rpl0000rwsbk7cy4l1w&dateFrom=2025-12-15T00:00:00Z
 * - GET /api/scrapeLog?status=success&dateTo=2025-12-16T00:00:00Z
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    apiLogger.info('[ScrapeLog API] Query request', {
      sellerId,
      status,
      limit,
      offset,
      dateFrom,
      dateTo
    });

    // Build where clause for filtering
    const where: any = {};
    
    if (sellerId) where.sellerId = sellerId;
    if (status) where.status = status;
    
    // Date filtering
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp.gte = new Date(dateFrom);
      if (dateTo) where.timestamp.lte = new Date(dateTo);
    }

    // Query logs with pagination
    const [scrapeLogs, total] = await Promise.all([
      prisma.scrapeLog.findMany({
        where,
        include: {
          seller: {
            select: { id: true, name: true, url: true }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.scrapeLog.count({ where })
    ]);

    apiLogger.info('[ScrapeLog API] Query completed', {
      found: scrapeLogs.length,
      total,
      filters: { sellerId, status, dateFrom, dateTo }
    });

    return NextResponse.json({
      success: true,
      data: {
        logs: scrapeLogs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        summary: {
          totalLogs: total,
          successCount: await prisma.scrapeLog.count({ 
            where: { ...where, status: 'success' } 
          }),
          errorCount: await prisma.scrapeLog.count({ 
            where: { ...where, status: 'error' } 
          })
        }
      }
    });

  } catch (error) {
    apiLogger.logError('[ScrapeLog API] Query failed', error as Error);
    
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