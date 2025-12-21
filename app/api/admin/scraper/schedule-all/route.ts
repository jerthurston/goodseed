/**
 * Lên lịch cho tất cả các seller cùng lúc - chức năng bulk auto scraper cho tất cả sellers đủ điều kiện
 * Handles POST:  Set global schedule (Ví dụ chạy tất cả sellers lúc 2AM)
 * Handles DELETE:  Stop global schedule (Ví dụ dừng tất cả sellers)
 * Handles GET:  Check status of all scheduled jobs
*/


import { apiLogger } from "@/lib/helpers/api-logger";
import { AutoScraperScheduler } from "@/lib/services/auto-scraper/backend/auto-scraper-scheduler.service";
import { NextRequest, NextResponse } from "next/server";

export async function POST (req:NextRequest) {
    try {
        apiLogger.info('[API] Scheduling all sellers for auto scraping...');

        // Sử dụng AutoScraperScheduler để bulk initialize - add các job có seller thỏa điều kiện vào queue bull
        const results = await AutoScraperScheduler.initializeAllAutoJobs();
        // Tính toán thống kê tổng hợp kết quả trả về từ service
        const scheduled = results.details.filter(result => result.status === 'scheduled');
        const failed = results.details.filter(result => result.status === 'failed');

        const response = {
            success:true,
            data:{
                totalProcessed: results.details.length,
                scheduled: scheduled.length,
                failed: failed.length,
                details: results.details,
                message: `Bulk auto scraper operation completed: ${scheduled.length}/${results.details.length} sellers scheduled`
            },
            timeStamp: new Date().toISOString(),
        };

        apiLogger.info('[Auto Scraper Api] Bulk start operation completed',{
            totalProcessed: response.data.totalProcessed,
            scheduled: response.data.scheduled,
            failed: response.data.failed,
        });

        return NextResponse.json(response);
    } catch (error) {
        const errorMessage = error instanceof Error ?  error.message : 'Unknown error';
        apiLogger.logError('[Auto Scraper Api] Failed to start auto scraper', error as Error );

        return NextResponse.json({
            success:false,
            error:{
                code:'AUTO_SCRAPER_FAILED',
                message: errorMessage
            },
            timeStamp: new Date().toISOString(),
        }, {
            status: 500
        })
        
    }
};


/**
 * DELETE /api/admin/scraper/schedule-all
 * Stop auto scraping cho tất cả sellers
 * 
 * Features:
 * - Bulk operation để stop tất cả auto jobs
 * - Emergency stop functionality
 * - Cleanup repeat jobs trong Bull queue
 * - Detailed response với stopped/failed breakdown
 */

export async function DELETE(req:NextRequest) {
    try {
        apiLogger.info('[AUTO scraper API] Stopping all sellers for auto scraping...');

        // Gọi service để bulk stop all
        const results = await AutoScraperScheduler.stopAllAutoJobs();
        //Calculate summary statistics
        const stopped = results.details.filter(result => result.status === 'stopped');
        const failed = results.details.filter(result => result.status === 'failed');

        const response = {
            success:true,
            data:{
                totalProcessed: results.details.length,
                stopped: stopped.length,
                failed: failed.length,
                details: results.details,
                message: `Bulk auto scraper stop completed: ${stopped.length}/${results.details.length} sellers stopped`
            },
            timeStamp: new Date().toISOString(),
        };

        apiLogger.info('[AUTO Scraper API] Bulk stop operation completed',{
            totalProcessed: response.data.totalProcessed,
            stopped: response.data.stopped,
            failed: response.data.failed,
        });

        return NextResponse.json(response);
    } catch (error) {
        const errorMessage = error instanceof Error ?  error.message : 'Unknown error';
        apiLogger.logError('[AUTO Scraper API] Failed to stop auto scraper', error as Error );
        
        return NextResponse.json({
            success:false,
            error:{
                code:'AUTO_SCRAPER_FAILED',
                message: errorMessage
            },
            timeStamp: new Date().toISOString(),
        }, {
            status: 500
        })

    }
};

/**
 * GET /api/admin/scraper/schedule-all
 * Get status của auto scraper system
 * 
 * Optional endpoint để check health và current status
 */

export async function GET(req:NextRequest) {
    try {
        apiLogger.info('[AUTO Scraper API] Checking status of all sellers for auto scraping...');

        // Call service để khám cho auto scraper - lấy thông tin health
        const health = await AutoScraperScheduler.getAutoScraperHealth();
        const response = {
            success:true,
            data:health,
            timeStamp: new Date().toISOString(),
        }

        return NextResponse.json(response);
        
    } catch (error) {
        const errorMessage = error instanceof Error ?  error.message : 'Unknown error';
        apiLogger.logError('[AUTO Scraper API] Failed to check auto scraper status', error as Error );

        return NextResponse.json({
            success:false,
            error:{
                code:'AUTO_SCRAPER_FAILED',
                message: errorMessage
            },
            timeStamp: new Date().toISOString(),
        }, {
            status: 500
        })

    }
}