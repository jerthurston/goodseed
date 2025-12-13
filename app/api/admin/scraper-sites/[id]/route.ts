import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
  try {
    const { id } = await params

    // TODO: Integrate with your existing scraper API
    // For now, we'll just update lastScraped timestamp
    await prisma.seller.update({
      where: { id },
      data: { lastScraped: new Date() },
    })

    return NextResponse.json({ message: "Scrape initiated" })
  } catch (error) {
    console.error("Error triggering scrape:", error)
    return NextResponse.json(
      { error: "Failed to trigger scrape" },
      { status: 500 }
    )
  }
}
