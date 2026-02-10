import { NextRequest, NextResponse } from 'next/server'
import { scrapingSourceSchema } from '@/schemas/seller.schema'
import { prisma } from '@/lib/prisma'
import { extractScrapingSourceName } from '@/lib/utils/scraping-source.utils'
import { apiLogger } from '@/lib/helpers/api-logger';

// DELETE /api/admin/sellers/[id]/scraping-sources/[sourceId] - Delete scraping source
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
  try {
    const { id, sourceId } = await params
    
    // Validate seller ID and source ID format
    if (!id || typeof id !== 'string' || !sourceId || typeof sourceId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid seller ID or source ID' },
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

    // Check if scraping source exists and belongs to the seller
    const scrapingSource = await prisma.scrapingSource.findFirst({
      where: {
        id: sourceId,
        sellerId: id
      }
    })

    if (!scrapingSource) {
      return NextResponse.json(
        { error: 'Scraping source not found' },
        { status: 404 }
      )
    }

    // Delete the scraping source
    await prisma.scrapingSource.delete({
      where: { id: sourceId }
    })

    return NextResponse.json(
      { message: 'Scraping source deleted successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error deleting scraping source:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/sellers/[id]/scraping-sources/[sourceId] - Update scraping source
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
  try {
    const { id: sellerId, sourceId } = await params
    
    // Validate IDs
    if (!sellerId || typeof sellerId !== 'string' || !sourceId || typeof sourceId !== 'string') {
      console.log('[API] PUT scraping-source: Invalid ID format')
      return NextResponse.json(
        { error: 'Invalid seller ID or source ID' },
        { status: 400 }
      )
    }
    // Parse request body
    const body = await request.json()
    // Validate request data using Zod schema
    const validationResult = scrapingSourceSchema
      .omit({ id: true, sellerId: true }) // Exclude auto-generated fields
      .partial() // Make all fields optional for partial updates
      .safeParse(body)

    if (!validationResult.success) {
      console.log('[API] PUT scraping-source: Validation failed:', validationResult.error.issues)
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

    const updateData = validationResult.data

    // Check if scraping source exists and belongs to seller
    const existingSource = await prisma.scrapingSource.findFirst({
      where: {
        id: sourceId,
        sellerId: sellerId
      }
    })

    if (!existingSource) {
     apiLogger.info('[API] PUT scraping-source: Scraping source not found')
      return NextResponse.json(
        { error: 'Scraping source not found or does not belong to this seller' },
        { status: 404 }
      )
    }

    // Prepare update data with computed name if URL is being updated
    const finalUpdateData: any = { ...updateData }
    
    if (updateData.scrapingSourceUrl) {
      const newScrapingSourceName = extractScrapingSourceName(updateData.scrapingSourceUrl)
      finalUpdateData.scrapingSourceName = newScrapingSourceName

      // Check for duplicate URL within the same seller (exclude current source)
      const duplicateUrl = await prisma.scrapingSource.findFirst({
        where: {
          sellerId: sellerId,
          scrapingSourceUrl: updateData.scrapingSourceUrl,
          NOT: { id: sourceId } // Exclude current source
        }
      })

      if (duplicateUrl) {
        apiLogger.info('[API] PUT scraping-source: Duplicate URL found')
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
    }

    // Update scraping source
    const updatedSource = await prisma.scrapingSource.update({
      where: { id: sourceId },
      data: finalUpdateData
    })

    apiLogger.logResponse('[API] PUT scraping-source: Scraping source updated successfully:', { id: updatedSource.id })
    return NextResponse.json(updatedSource, { status: 200 })

  } catch (error) {
    apiLogger.logError('[API] PUT scraping-source: Error type:', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}