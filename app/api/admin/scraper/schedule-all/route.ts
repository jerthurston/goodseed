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
        let body;
        try {
            body = await req.json();
        } catch (jsonError) {
            // Handle empty or invalid JSON
            apiLogger.warn('[API] Invalid JSON in request body, using defaults');
            body = {};
        }
        const action = body?.action || 'start'; // Default to start nếu không có action
        
        apiLogger.info('[API] Auto scraper bulk operation requested', { action });

        let results;
        let operationType;
        
        if (action === 'stop') {
            // Stop operation
            apiLogger.info('[API] Stopping all sellers for auto scraping...');
            results = await AutoScraperScheduler.stopAllAutoJobs();
            operationType = 'stop';
        } else {
            // Start operation (default)
            apiLogger.info('[API] Scheduling all sellers for auto scraping...');
            results = await AutoScraperScheduler.initializeAllAutoJobs();
            operationType = 'start';
        }

        // Calculate summary statistics
        const successKey = operationType === 'stop' ? 'stopped' : 'scheduled';
        const successful = results.details.filter(result => result.status === successKey);
        const failed = results.details.filter(result => result.status === 'failed');

        const response = {
            success: true,
            data: {
                action: operationType,
                totalProcessed: results.details.length,
                [successKey]: successful.length,
                failed: failed.length,
                details: results.details,
                message: `Bulk auto scraper ${operationType} completed: ${successful.length}/${results.details.length} sellers ${operationType === 'stop' ? 'stopped' : 'scheduled'}`
            },
            timeStamp: new Date().toISOString(),
        };

        apiLogger.info(`[Auto Scraper Api] Bulk ${operationType} operation completed`, {
            action: operationType,
            totalProcessed: response.data.totalProcessed,
            successful: successful.length,
            failed: response.data.failed,
        });

        return NextResponse.json(response);
    } catch (error) {
        const errorMessage = error instanceof Error ?  error.message : 'Unknown error';
        apiLogger.logError('[Auto Scraper Api] Failed auto scraper operation', error as Error );

        return NextResponse.json({
            success: false,
            error: {
                code: 'AUTO_SCRAPER_FAILED',
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