import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createManualScrapeJob, logScrapeActivity, validateSeller } from "@/lib/helpers/server"
import { getScraperSource } from "@/lib/helpers/server/getScraperSource"
import ScraperFactory, { ScraperSource } from "@/lib/factories/scraper-factory"
import { checkExistingJobs } from "@/lib/helpers/server/checkExistingJobs"
import { apiLogger } from "@/lib/helpers/api-logger"

// Update scraper site settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { isAutoEnabled, autoScrapeInterval } = body

    const updatedSeller = await prisma.seller.update({
      where: { id },
      data: {
        isActive: isAutoEnabled,
        autoScrapeInterval: autoScrapeInterval,
      },
    })

    return NextResponse.json({
      id: updatedSeller.id,
      isAutoEnabled: updatedSeller.isActive,
      autoScrapeInterval: updatedSeller.autoScrapeInterval,
    })
  } catch (error) {
    console.error("Error updating scraper site:", error)
    return NextResponse.json(
      { error: "Failed to update scraper site" },
      { status: 500 }
    )
  }
}

// Trigger manual scrape
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  // Khai báo biến với let để sử dụng được ở scope bên dưới
  let sellerId: string | null = null;
  let jobId: string | null = null;
  // TODO: Integrate with your existing scraper API

  try {
    //1. Extract seller ID from params
    const { id } = await params;
    sellerId = id;
    //2. Validate seller
    const seller = await validateSeller(id);
    //3. Map to scraper source using helper function
    const scraperSource = getScraperSource(seller.name);
    //4. Verify scraper factory support
    const scraperFactory = new ScraperFactory(prisma);
    if (!scraperFactory.isImplemented(scraperSource as ScraperSource)) {
      throw new Error(`Scraper for ${scraperSource} is not implemented or is not ready for production`);
    }
    //5.Check for existing running jobs using helper function
    await checkExistingJobs(seller.id, seller.name);

    //6. Create manual scrape job using helper function
    jobId = await createManualScrapeJob(seller, scraperSource);

    //7. Update seller timestamp
    await prisma.seller.update({
      where: { id: seller.id },
      data: {
        lastScraped: new Date(),
      }
    });

    //9. Log success
    apiLogger.info('[Manual Scrape] Job created successfully', {
      jobId,
      sellerId: seller.id,
      sellerName: seller.name,
      source: scraperSource,
      fullSiteCrawl: true
    });

    return NextResponse.json({
      success: true,
      message: `Manual scrape initiated for ${seller.name} (Full Site Crawl)`,
      data: {
        jobId,
        sellerName: seller.name,
        source: scraperSource,
        statusUrl: `/api/scraper/status/${jobId}`,
        estimatedDuration: '10-30 minutes',
        crawlType: 'Full Site',
        note: 'Will crawl all available pages from the source URL'
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Log error activity if sellerId available
    if (sellerId) {
      await logScrapeActivity(
        sellerId,
        "failed",
        0,
        duration, {
        error: errorMessage,
        jobId: jobId || 'N/A'
      }
      )
    };

    // Mark job as failed if it was created
    if (jobId) {
      try {
        await prisma.scrapeJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            errorMessage,
            completedAt: new Date(),
            duration
          }
        })
      } catch (updateError) {
        apiLogger.logError('[Manual Scrape] Failed to update job status', {
          jobId,
          error: updateError as Error
        })
      }
    }
    // Return error response
    return NextResponse.json({
      success: false,
      error: {
        code: 'MANUAL_SCRAPE_FAILED',
        message: errorMessage
      }
    }, { status: 500 })
  }
}

