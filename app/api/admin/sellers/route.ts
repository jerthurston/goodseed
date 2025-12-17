/**
 * API route to manage sellers
 * Handles GET: Fetch all sellers
 * Handles POST: Create a new seller
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createSellerSchema, validateSellerData } from "@/schemas/seller.schema"

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

    const { name, url, scrapingSourceUrl, isActive, affiliateTag } = validation.data

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

    // Create new seller
    const seller = await prisma.seller.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        scrapingSourceUrl: scrapingSourceUrl, // Already processed by Zod (array)
        isActive: Boolean(isActive),
        affiliateTag: affiliateTag || null, // Optional field
        status: 'pending', // Default status
        lastScraped: null, // Will be set when first scrape happens
        autoScrapeInterval: 6, // Default 6 hours
      }
    })

    return NextResponse.json({
      success: true,
      message: `Seller "${seller.name}" created successfully`,
      data: seller
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating seller:", error)
    return NextResponse.json(
      { 
        error: "Failed to create seller",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
