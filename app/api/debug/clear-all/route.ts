import { NextResponse } from 'next/server';
import { scraperQueue } from '@/lib/queue/scraper-queue';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Clear All Test Data - FOR TESTING PURPOSES ONLY
 * Clears Redis queue và database ScrapeJob records
 */
export async function DELETE() {
  try {
    const results = {
      redisQueue: { success: false, cleared: 0, error: null as string | null },
      database: { success: false, deleted: 0, error: null as string | null }
    };

    // 1. Clear Redis Bull Queue
    try {
      // Get current queue stats before clearing
      const queueStats = await scraperQueue.getJobCounts();
      const totalJobs = queueStats.waiting + queueStats.active + queueStats.completed + queueStats.failed + queueStats.delayed;
      
      // Clear all jobs from queue
      await scraperQueue.obliterate({ force: true });
      
      results.redisQueue = {
        success: true,
        cleared: totalJobs,
        error: null
      };
      
      apiLogger.info('[Debug] Redis queue cleared', { totalJobs });
    } catch (redisError) {
      results.redisQueue.error = redisError instanceof Error ? redisError.message : 'Unknown Redis error';
      apiLogger.logError('[Debug] Failed to clear Redis queue', redisError as Error);
    }

    // 2. Clear Database ScrapeJob records
    try {
      const deleteResult = await prisma.scrapeJob.deleteMany({});
      
      results.database = {
        success: true,
        deleted: deleteResult.count,
        error: null
      };
      
      apiLogger.info('[Debug] Database ScrapeJob records cleared', { deleted: deleteResult.count });
    } catch (dbError) {
      results.database.error = dbError instanceof Error ? dbError.message : 'Unknown database error';
      apiLogger.logError('[Debug] Failed to clear database records', dbError as Error);
    }

    // 3. Update seller autoScrapeInterval to null để reset auto scraper state
    try {
      await prisma.seller.updateMany({
        where: { isActive: true },
        data: { autoScrapeInterval: null }
      });
      
      apiLogger.info('[Debug] Seller auto scrape intervals reset');
    } catch (sellerError) {
      apiLogger.logError('[Debug] Failed to reset seller intervals', sellerError as Error);
    }

    const overallSuccess = results.redisQueue.success && results.database.success;

    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess 
        ? 'All test data cleared successfully' 
        : 'Some operations failed during cleanup',
      data: results,
      timestamp: new Date().toISOString()
    }, { 
      status: overallSuccess ? 200 : 207 // 207 = Multi-Status (partial success)
    });

  } catch (error) {
    apiLogger.logError('[Debug] Clear all data failed', error as Error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to clear test data'
    }, { status: 500 });
  }
}

/**
 * Get current data status (để verify before/after clear)
 */
export async function GET() {
  try {
    // Redis queue stats
    const queueStats = await scraperQueue.getJobCounts();
    
    // Database stats
    const dbStats = await prisma.scrapeJob.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    
    const totalDbJobs = await prisma.scrapeJob.count();
    
    // Active sellers với auto scrape
    const activeSellers = await prisma.seller.findMany({
      where: { isActive: true },
      select: { 
        id: true, 
        name: true, 
        autoScrapeInterval: true 
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        redis: {
          total: queueStats.waiting + queueStats.active + queueStats.completed + queueStats.failed + queueStats.delayed,
          breakdown: queueStats
        },
        database: {
          total: totalDbJobs,
          byStatus: dbStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.status;
            return acc;
          }, {} as Record<string, number>)
        },
        sellers: activeSellers
      },
      message: 'Current test data status retrieved'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}