import { NextRequest, NextResponse } from 'next/server'
import { scrapingSourceSchema } from '@/schemas/seller.schema'
import { prisma } from '@/lib/prisma'
import { extractScrapingSourceName } from '@/lib/utils/scraping-source.utils'

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
    console.log('[API] PUT scraping-source: Starting update request')
    const { id: sellerId, sourceId } = await params
    console.log('[API] PUT scraping-source: Seller ID:', sellerId, 'Source ID:', sourceId)
    
    // Validate IDs
    if (!sellerId || typeof sellerId !== 'string' || !sourceId || typeof sourceId !== 'string') {
      console.log('[API] PUT scraping-source: Invalid ID format')
      return NextResponse.json(
        { error: 'Invalid seller ID or source ID' },
        { status: 400 }
      )
    }

    // Parse request body
    console.log('[API] PUT scraping-source: Parsing request body')
    const body = await request.json()
    console.log('[API] PUT scraping-source: Request body:', body)

    // Validate request data using Zod schema
    console.log('[API] PUT scraping-source: Starting validation')
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

    console.log('[API] PUT scraping-source: Validation successful')
    const updateData = validationResult.data

    // Check if scraping source exists and belongs to seller
    console.log('[API] PUT scraping-source: Checking if scraping source exists')
    const existingSource = await prisma.scrapingSource.findFirst({
      where: {
        id: sourceId,
        sellerId: sellerId
      }
    })

    if (!existingSource) {
      console.log('[API] PUT scraping-source: Scraping source not found')
      return NextResponse.json(
        { error: 'Scraping source not found or does not belong to this seller' },
        { status: 404 }
      )
    }

    console.log('[API] PUT scraping-source: Existing source found:', existingSource.scrapingSourceName)

    // Prepare update data with computed name if URL is being updated
    const finalUpdateData: any = { ...updateData }
    
    if (updateData.scrapingSourceUrl) {
      console.log('[API] PUT scraping-source: Computing new scraping source name')
      const newScrapingSourceName = extractScrapingSourceName(updateData.scrapingSourceUrl)
      finalUpdateData.scrapingSourceName = newScrapingSourceName
      console.log('[API] PUT scraping-source: New computed name:', newScrapingSourceName)

      // Check for duplicate URL within the same seller (exclude current source)
      console.log('[API] PUT scraping-source: Checking for duplicate URL')
      const duplicateUrl = await prisma.scrapingSource.findFirst({
        where: {
          sellerId: sellerId,
          scrapingSourceUrl: updateData.scrapingSourceUrl,
          NOT: { id: sourceId } // Exclude current source
        }
      })

      if (duplicateUrl) {
        console.log('[API] PUT scraping-source: Duplicate URL found')
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
    console.log('[API] PUT scraping-source: Updating scraping source')
    const updatedSource = await prisma.scrapingSource.update({
      where: { id: sourceId },
      data: finalUpdateData
    })

    console.log('[API] PUT scraping-source: Scraping source updated successfully:', updatedSource.id)
    return NextResponse.json(updatedSource, { status: 200 })

  } catch (error) {
    console.error('[API] PUT scraping-source: Error occurred:', error)
    console.error('[API] PUT scraping-source: Error type:', typeof error)
    console.error('[API] PUT scraping-source: Error message:', error instanceof Error ? error.message : String(error))
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        console.log('[API] PUT scraping-source: Unique constraint violation')
        return NextResponse.json(
          { error: 'A scraping source with this data already exists' },
          { status: 409 }
        )
      }
    }

    console.log('[API] PUT scraping-source: Returning generic 500 error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}