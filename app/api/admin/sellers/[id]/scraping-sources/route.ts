import { NextRequest, NextResponse } from 'next/server'
import { scrapingSourceSchema } from '@/schemas/seller.schema'
import { prisma } from '@/lib/prisma'
import { extractScrapingSourceName } from '@/lib/utils/scraping-source.utils'
import { z } from 'zod'

// GET /api/admin/sellers/[id]/scraping-sources - Fetch all scraping sources for a seller
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validate seller ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid seller ID' },
        { status: 400 }
      )
    }

    // Check if seller exists
    const seller = await prisma.seller.findUnique({
      where: { id }
    })

    if (!seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      )
    }

    // Fetch all scraping sources for the seller
    const scrapingSources = await prisma.scrapingSource.findMany({
      where: { sellerId: id },
      orderBy: { id: 'desc' }
    })

    return NextResponse.json(scrapingSources, { status: 200 })

  } catch (error) {
    console.error('Error fetching scraping sources:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/sellers/[id]/scraping-sources - Create new scraping source
/**
 * 
 * @param request 
 * @param id là sellerId 
 * @returns 
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[API] POST scraping-sources: Starting request processing')
    const { id } = await params
    console.log('[API] POST scraping-sources: Seller ID:', id)
    
    // Validate seller ID format
    if (!id || typeof id !== 'string') {
      console.log('[API] POST scraping-sources: Invalid seller ID format')
      return NextResponse.json(
        { error: 'Invalid seller ID' },
        { status: 400 }
      )
    }

    // Parse request body
    console.log('[API] POST scraping-sources: Parsing request body')
    const body = await request.json()
    console.log('[API] POST scraping-sources: Request body:', body)

    // Validate request data using Zod schema
    console.log('[API] POST scraping-sources: Starting validation')
    const validationResult = scrapingSourceSchema
      .omit({ id: true, sellerId: true }) // Exclude auto-generated fields
      .safeParse(body)

    if (!validationResult.success) {
      console.log('[API] POST scraping-sources: Validation failed:', validationResult.error.issues)
      const fieldErrors: Record<string, string> = {}
      validationResult.error.issues.forEach((issue) => {
        if (issue.path.length > 0) {
          fieldErrors[issue.path[0] as string] = issue.message
        }
      })

      return NextResponse.json(
        {
          error: 'Validation failed',
          fields: fieldErrors
        },
        { status: 400 }
      )
    }

    console.log('[API] POST scraping-sources: Validation successful')
    const { scrapingSourceUrl, maxPage } = validationResult.data
    console.log('[API] POST scraping-sources: Extracted data - URL:', scrapingSourceUrl, 'MaxPage:', maxPage)
    
    // Compute scraping source name from URL
    console.log('[API] POST scraping-sources: Computing scraping source name')
    const scrapingSourceName = extractScrapingSourceName(scrapingSourceUrl)
    console.log('[API] POST scraping-sources: Computed name:', scrapingSourceName)

    // Check if seller exists
    console.log('[API] POST scraping-sources: Checking if seller exists')
    const seller = await prisma.seller.findUnique({
      where: { id }
    })
    console.log('[API] POST scraping-sources: Seller found:', seller ? 'Yes' : 'No')
    
    // Log existing scraping sources for debugging
    const existingSources = await prisma.scrapingSource.findMany({
      where: { sellerId: id },
      select: { id: true, scrapingSourceName: true, scrapingSourceUrl: true }
    })
    console.log('[API] POST scraping-sources: Existing sources for seller:', existingSources)

    if (!seller) {
      console.log('[API] POST scraping-sources: Seller not found, returning 404')
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      )
    }

    // NOTE: We allow multiple scraping sources with same name (same website, different pages)
    // Only prevent duplicate URLs

    // Check for duplicate URL within the same seller
    console.log('[API] POST scraping-sources: Checking for duplicate URL')
    console.log('[API] POST scraping-sources: Searching for URL:', scrapingSourceUrl)
    console.log('[API] POST scraping-sources: For seller ID:', id)
    
    const existingUrl = await prisma.scrapingSource.findFirst({
      where: {
        sellerId: id,
        scrapingSourceUrl
      }
    })
    
    console.log('[API] POST scraping-sources: Existing URL:', existingUrl ? 'Found' : 'None')
    if (existingUrl) {
      console.log('[API] POST scraping-sources: Duplicate URL details:', {
        id: existingUrl.id,
        name: existingUrl.scrapingSourceName,
        url: existingUrl.scrapingSourceUrl
      })
    }

    if (existingUrl) {
      console.log('[API] POST scraping-sources: Duplicate URL found, returning 400')
      return NextResponse.json(
        {
          error: 'Validation failed',
          fields: {
            scrapingSourceUrl: 'This URL is already configured as a scraping source for this seller'
          }
        },
        { status: 400 }
      )
    }

    // Create new scraping source
    console.log('[API] POST scraping-sources: Creating new scraping source')
    const newScrapingSource = await prisma.scrapingSource.create({
      data: {
        sellerId: id,
        scrapingSourceName,
        scrapingSourceUrl,
        maxPage
      }
    })
    console.log('[API] POST scraping-sources: Scraping source created successfully:', newScrapingSource.id)

    return NextResponse.json(newScrapingSource, { status: 201 })

  } catch (error) {
    console.error('[API] POST scraping-sources: Error occurred:', error)
    console.error('[API] POST scraping-sources: Error type:', typeof error)
    console.error('[API] POST scraping-sources: Error name:', error instanceof Error ? error.name : 'Unknown')
    console.error('[API] POST scraping-sources: Error message:', error instanceof Error ? error.message : String(error))
    console.error('[API] POST scraping-sources: Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    // Handle Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        console.log('[API] POST scraping-sources: Unique constraint violation')
        return NextResponse.json(
          { error: 'A scraping source with this data already exists' },
          { status: 409 }
        )
      }
      
      // Check for connection errors
      if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
        console.log('[API] POST scraping-sources: Database connection error detected')
        return NextResponse.json(
          { error: 'Database connection failed. Please try again.' },
          { status: 503 }
        )
      }
    }

    console.log('[API] POST scraping-sources: Returning generic 500 error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}