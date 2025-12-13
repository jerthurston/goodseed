import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatRelativeTime } from "@/lib/helpers/formtRelativeTime"
import { apiLogger } from "@/lib/helpers/api-logger"

export async function GET() {
  try {
    apiLogger.debug("Fetching scraper sites from database at api route api/admin/scraper-sites");
    const sellers = await prisma.seller.findMany({
      include: {
        scrapeLogs: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    })

    apiLogger.logResponse("Fetched scraper sites", { sitesCount: sellers.length });

    // Không cần tách transform chổ này.
    const transformedData = sellers.map((seller) => {
      const latestScrapeLog = seller.scrapeLogs[0]
      const lastScraped = latestScrapeLog
        ? formatRelativeTime(new Date(latestScrapeLog.timestamp))
        : "Never"

      return {
        id: seller.id,
        name: seller.name,
        url: seller.url,
        lastScraped,
        autoScrapeInterval: seller.autoScrapeInterval,
        isAutoEnabled: seller.isActive,
      }
    })

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error("Error fetching scraper sites:", error)
    return NextResponse.json(
      { error: "Failed to fetch scraper sites" },
      { status: 500 }
    )
  }
}


