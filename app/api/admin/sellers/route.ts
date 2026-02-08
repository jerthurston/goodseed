/**
 * API route to manage sellers
 * Handles GET: Fetch all sellers
 * Handles POST: Create a new seller
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createSellerSchema, validateSellerData } from "@/schemas/seller.schema"
import { auth } from "@/auth"
import { apiLogger } from "@/lib/helpers/api-logger";

export async function GET() {
  try {

    // TODO: Need to authenticate for admin role in the future
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json({
        error: "Unauthorized",
        status: 401
      })
    }

    if (user?.role !== "ADMIN") {
      return NextResponse.json({
        message: "Forbidden",
        status: 403
      })
    }

    // Get sellers with scrape logs and jobs data
    const sellers = await prisma.seller.findMany({
      select: {
        id: true,
        name: true,
        url: true,
        affiliateTag: true,
        isActive: true,
        autoScrapeInterval: true,
        lastScraped: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        scrapeLogs: {
          orderBy: { timestamp: "desc" },
          take: 1, // Get latest scrape log
        },
        scrapeJobs: {
          orderBy: { createdAt: "desc" },
          take: 10, // Get last 10 jobs for display
        },
        seedProducts: {
          select: {
            id: true,
          },
        },
        seedCategories: {
          include: {
            seedProducts: true,
          },
        },
        // Count all finished jobs for accurate totalRuns
        _count: {
          select: {
            scrapeJobs: {
              where: {
                OR: [
                  { status: 'COMPLETED' },
                  { status: 'FAILED' },
                  { status: 'CANCELLED' }
                ]
              }
            }
          }
        }
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

// Create new seller
export async function POST(request: NextRequest) {
  try {
    // TODO: Need to authenticate for admin role in the future

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

    const { name, url, isActive, affiliateTag, scrapingSources } = validation.data

    // Check if seller with same name already exists
    const existingSeller = await prisma.seller.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    })

    if (existingSeller) {
      return NextResponse.json(
        { error: `Seller with name "${name}" already exists` },
        { status: 409 }
      )
    }

    // Create new seller without scraping sources (they will be added separately later)
    const seller = await prisma.seller.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        isActive: Boolean(isActive),
        affiliateTag: affiliateTag || null,
        autoScrapeInterval: 6, // Default 6 hours, can be updated later
        status: 'pending', // Default status
        lastScraped: null, // Will be set when first scrape happens
        // Note: scrapingSources will be empty initially, admin can add them later
      },
      include: {
        scrapingSources: true // Include empty scrapingSources in response
      }
    })

    return NextResponse.json({
      success: true,
      message: `Seller "${seller.name}" created successfully`,
      data: seller
    }, { status: 201 })

  } catch (error) {
    apiLogger.logError("Error creating seller:", error as Error)
    return NextResponse.json(
      {
        error: "Failed to create seller",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
