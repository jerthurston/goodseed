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
          orderBy: { createdAt: "desc" },
          take: 10, // Get last 10 jobs for stats
        },
        seedCategories: {
          include: {
            seedProducts: true,
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

// Update seller active status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { isActive } = body

    const updatedSeller = await prisma.seller.update({
      where: { id },
      data: { isActive },
    })

    return NextResponse.json(updatedSeller)
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

    const { name, url, scrapingSourceUrl, isActive, affiliateTag } = validation.data

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
        scrapingSourceUrl: scrapingSourceUrl, // Already processed by Zod (array)
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
