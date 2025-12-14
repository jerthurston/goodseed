/**
 * GET /api/cron/test-manual
 * 
 * Test endpoint for cron without Redis dependency
 * Tests the full flow except queue/worker parts
 */

import { apiLogger } from "@/lib/helpers/api-logger";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        console.log('[Test Cron API] Request received');
        
        // 1. Verify authorization
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            console.log('[Test Cron API] CRON_SECRET not configured');
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'CONFIG_ERROR',
                        message: 'CRON_SECRET not configured',
                    },
                },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            console.log('[Test Cron API] Unauthorized access attempt');
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Invalid or missing authorization',
                    },
                },
                { status: 401 }
            );
        }

        console.log('[Test Cron API] Authorization passed');

        // 2. Query all active sellers
        const sellers = await prisma.seller.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                scrapingSourceUrl: true,
            },
        });

        console.log(`[Test Cron API] Found ${sellers.length} active sellers`);

        if (sellers.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    totalSellers: 0,
                    jobsQueued: 0,
                    sellers: [],
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // 3. Simulate job creation (no actual queue)
        const simulatedJobs = sellers.map(seller => ({
            sellerId: seller.id,
            sellerName: seller.name,
            jobId: `test_job_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            status: 'simulated',
            scrapingSourceUrl: seller.scrapingSourceUrl
        }));

        console.log('[Test Cron API] Simulated jobs created:', simulatedJobs.length);

        // 4. Return summary
        const responseData = {
            totalSellers: sellers.length,
            jobsQueued: simulatedJobs.length,
            sellers: simulatedJobs,
            timestamp: new Date().toISOString(),
            note: 'This is a test endpoint - no actual scraping jobs were queued'
        };

        console.log('[Test Cron API] Success response ready');

        return NextResponse.json({
            success: true,
            data: responseData,
        });
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('[Test Cron API] Error:', error);

        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'CRON_TEST_FAILED',
                    message: errorMessage,
                },
            },
            { status: 500 }
        );
    }
}