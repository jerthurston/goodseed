/**
 * Auto Scraper Job Statistics API
 * GET /api/admin/scraper/stats
 * 
 * Returns detailed job counts by status for AutoScraperOverview dashboard
 */

import { apiLogger } from "@/lib/helpers/api-logger";
import { AutoScraperScheduler } from "@/lib/services/auto-scraper/backend/auto-scraper-scheduler.service";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/scraper/stats
 * Get detailed job statistics for auto scraper dashboard
 * 
 * Returns job counts by status: CREATED, WAITING, ACTIVE, COMPLETED, FAILED, CANCELLED
 */
export async function GET(req: NextRequest) {
    try {
        apiLogger.info('[AUTO Scraper Stats API] Fetching job statistics...');

        // Call service để lấy job statistics
        const stats = await AutoScraperScheduler.getJobStatistics();
        
        const response = {
            success: true,
            data: stats,
            timeStamp: new Date().toISOString(),
        };

        apiLogger.info('[AUTO Scraper Stats API] Job statistics fetched successfully', {
            totalJobs: Object.values(stats.jobCounts).reduce((sum: number, count) => sum + count, 0),
            statusBreakdown: stats.jobCounts
        });

        return NextResponse.json(response);
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        apiLogger.logError('[AUTO Scraper Stats API] Failed to fetch job statistics', error as Error);

        return NextResponse.json({
            success: false,
            error: {
                code: 'JOB_STATS_FAILED',
                message: errorMessage
            },
            timeStamp: new Date().toISOString(),
        }, {
            status: 500
        });
    }
}