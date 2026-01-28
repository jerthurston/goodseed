import { apiLogger } from "@/lib/helpers/api-logger";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/sellers/[id]/scraper/job/[jobId]
 * Fetch single scrape job detail by jobId
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; jobId: string }> }
) {
    try {
        const { id: sellerId, jobId } = await params;

        apiLogger.debug("[Get Job Detail API] Fetching job", { sellerId, jobId });

        // Validate seller exists
        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            select: { id: true, name: true }
        });

        if (!seller) {
            return NextResponse.json({
                success: false,
                message: "Seller not found"
            }, { status: 404 });
        }

        // Fetch job by jobId and sellerId
        const job = await prisma.scrapeJob.findFirst({
            where: {
                jobId: jobId,
                sellerId: sellerId
            },
            include: {
                seller: {
                    select: {
                        id: true,
                        name: true,
                        url: true
                    }
                },
                targetCategory: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!job) {
            return NextResponse.json({
                success: false,
                message: "Job not found"
            }, { status: 404 });
        }

        apiLogger.debug("[Get Job Detail API] Job found", { 
            jobId, 
            status: job.status,
            productsScraped: job.productsScraped 
        });

        return NextResponse.json({
            success: true,
            data: job,
            message: "Job detail fetched successfully"
        });

    } catch (error) {
        apiLogger.logError('[Get Job Detail API] Failed to fetch job', error as Error, {
            sellerId: (await params).id,
            jobId: (await params).jobId
        });

        return NextResponse.json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch job detail. Please try again.',
                details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
            }
        }, { status: 500 });
    }
}
