/**
 * Dynamic route cho từng seller
 * Handles GET: Fetch seller by ID
 * Handles PATCH: Update seller active status
 * Handles PUT: Update seller by ID (full update)
 * Handles DELETE: Delete seller by ID
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSellerData } from "@/schemas/seller.schema"

// Get single seller by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Need to authenticate for admin role in the future
    
    const { id: sellerId } = await params

    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller ID is required" },
        { status: 400 }
      )
    }

    // Get seller by ID with full data
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      include: {
        scrapeLogs: {
          orderBy: { timestamp: "desc" },
          take: 1, // Get latest scrape log
        },
        scrapeJobs: {
          // Get ALL jobs for statistics calculation (not just active ones)
          orderBy: { createdAt: "desc" },
          take: 100, // Get last 100 jobs for accurate statistics
        },
        seedCategories: {
          include: {
            seedProducts: true,
          },
        },
        seedProducts: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!seller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(seller)
  } catch (error) {
    console.error("Error fetching seller:", error)
    return NextResponse.json(
      { error: "Failed to fetch seller" },
      { status: 500 }
    )
  }
}

// Update seller active status and auto scraper settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate fields (only allow these specific updates for security)
    const allowedFields = ['isActive', 'autoScrapeInterval']
    const updateData: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value
      }
    }

    // Validate autoScrapeInterval if provided
    if ('autoScrapeInterval' in updateData) {
      const validIntervals = [1, 2, 4, 6, 8, 12, 24]
      const interval = Number(updateData.autoScrapeInterval)
      
      if (updateData.autoScrapeInterval !== null && (!validIntervals.includes(interval))) {
        return NextResponse.json(
          { error: "Invalid autoScrapeInterval. Must be one of: 1, 2, 4, 6, 8, 12, 24 (hours), or null to disable" },
          { status: 400 }
        )
      }
    }

    // Check if seller exists
    const existingSeller = await prisma.seller.findUnique({
      where: { id }
    })

    if (!existingSeller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      )
    }

    const updatedSeller = await prisma.seller.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
    })

    return NextResponse.json({
      success: true,
      message: "Seller updated successfully",
      data: updatedSeller
    })
  } catch (error) {
    console.error("Error updating seller:", error)
    return NextResponse.json(
      { error: "Failed to update seller" },
      { status: 500 }
    )
  }
}

// Update seller by ID (full update)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Need to authenticate for admin role in the future
    
    const { id: sellerId } = await params
    
    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller ID is required" },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate request body using Zod schema
    const validation = validateSellerData(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: validation.error.message,
          details: validation.error.details,
          fields: validation.error.fields
        },
        { status: 400 }
      )
    }

    const { name, url, scrapingSources, isActive, affiliateTag } = validation.data

    // Check if seller exists
    const existingSeller = await prisma.seller.findUnique({
      where: { id: sellerId }
    })

    if (!existingSeller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      )
    }

    // Check if another seller with same name exists (excluding current seller)
    if (name !== existingSeller.name) {
      const duplicateSeller = await prisma.seller.findFirst({
        where: { 
          name: {
            equals: name,
            mode: 'insensitive'
          },
          NOT: {
            id: sellerId
          }
        }
      })

      if (duplicateSeller) {
        return NextResponse.json(
          { error: `Another seller with name "${name}" already exists` },
          { status: 409 }
        )
      }
    }

    // Update seller
    const updatedSeller = await prisma.seller.update({
      where: { id: sellerId },
      data: {
        name: name.trim(),
        url: url.trim(),
        // Note: scrapingSources are handled separately in related model
        isActive: Boolean(isActive),
        affiliateTag: affiliateTag || null, // Optional field
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: `Seller "${updatedSeller.name}" updated successfully`,
      data: updatedSeller
    }, { status: 200 })

  } catch (error) {
    console.error("Error updating seller:", error)
    return NextResponse.json(
      { 
        error: "Failed to update seller",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// Delete seller by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Need to authenticate for admin role in the future
    
    const { id: sellerId } = await params
    
    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller ID is required" },
        { status: 400 }
      )
    }

    // Check if seller exists
    const existingSeller = await prisma.seller.findUnique({
      where: { id: sellerId }
    })

    if (!existingSeller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      )
    }

    // Delete seller (this will cascade delete related records)
    await prisma.seller.delete({
      where: { id: sellerId }
    })

    return NextResponse.json({
      success: true,
      message: `Seller "${existingSeller.name}" deleted successfully`
    }, { status: 200 })

  } catch (error) {
    console.error("Error deleting seller:", error)
    return NextResponse.json(
      { 
        error: "Failed to delete seller",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
