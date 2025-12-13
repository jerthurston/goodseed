import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {

    // TODO: Need to authenticate for admin role in the future

    // Get sellers with scrape logs and jobs data
    const sellers = await prisma.seller.findMany({
      include: {
        scrapeLogs: {
          orderBy: { timestamp: "desc" },
          take: 1, // Get latest scrape log
        },
        scrapeJobs: {
          orderBy: { createdAt: "desc" },
          take: 10, // Get last 10 jobs for stats
        },
        seedCategories: {
          include: {
            seedProducts: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })

    // Return raw seller data without transformation
    // UI components will handle transformation using SellerTransformer
    return NextResponse.json(sellers)
  } catch (error) {
    console.error("Error fetching sellers:", error)
    return NextResponse.json(
      { error: "Failed to fetch sellers" },
      { status: 500 }
    )
  }
}
