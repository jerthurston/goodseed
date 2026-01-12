/**
 * GET /api/me/wishlist/[seedProductId]: Lấy thông tin chi tiết của một seedProduct trong wishlist của user
 * DELETE /api/me/wishlist/[seedProductId]: Xóa một seedProduct khỏi wishlist của user
 * PUT /api/me/wishlist/[seedProductId]: Update folder của một seedProduct trong wishlist
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';
import { z } from 'zod';

/**
 * Validation schema for updating wishlist folder
 */
const updateWishlistFolderSchema = z.object({
  folderId: z.string().min(1, 'Folder ID is required'),
});

/**
 * DELETE /api/me/wishlist/[seedId]
 * 
 * Xóa seed khỏi wishlist của user
 * Sử dụng unique constraint (userId, seedId) để tìm và xóa
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ seedProductId: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { seedProductId } = await params;
    
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const seedId = seedProductId;

    // Validate seedId
    if (!seedId) {
      return NextResponse.json(
        { error: 'Seed ID is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    apiLogger.debug('[DELETE /api/me/wishlist/[seedId]] Attempting to delete', {
      userId: user.id,
      seedId,
    });

    // Find and delete wishlist item using unique constraint
    // Use deleteMany because delete requires exact unique constraint match
    const deleteResult = await prisma.wishlist.deleteMany({
      where: {
        userId: user.id,
        seedId: seedId,
      }
    });

    // Check if item was found and deleted
    if (deleteResult.count === 0) {
      apiLogger.debug('[DELETE /api/me/wishlist/[seedId]] Item not found', {
        userId: user.id,
        seedId,
      });

      return NextResponse.json(
        { error: 'This seed is not in your wishlist' },
        { status: 404 }
      );
    }

    apiLogger.info('[DELETE /api/me/wishlist/[seedId]] Successfully deleted', {
      userId: user.id,
      seedId,
      deletedCount: deleteResult.count,
    });

    return NextResponse.json(
      { 
        success: true,
        message: 'Seed removed from wishlist',
        seedId,
      },
      { status: 200 }
    );

  } catch (error) {
    apiLogger.logError('[DELETE /api/me/wishlist/[seedId]]', error as Error);
    return NextResponse.json(
      { error: 'Failed to remove from wishlist' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/me/wishlist/[seedId]
 * 
 * Lấy thông tin chi tiết của một seed trong wishlist
 * Useful để check xem seed có trong wishlist không
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seedProductId: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { seedProductId } = await params;
    
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const seedId = seedProductId;

    if (!seedId) {
      return NextResponse.json(
        { error: 'Seed ID is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find wishlist item
    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_seedId: {
          userId: user.id,
          seedId: seedId,
        }
      },
      include: {
        seedProduct: {
          select: {
            id: true,
            name: true,
            productImages: {
              include: {
                image: {
                  select: {
                    url: true,
                    alt: true,
                  }
                }
              }
            },
            pricings: {
              select: {
                totalPrice: true,
                packSize: true,
                pricePerSeed: true,
              }
            },
          }
        },
        folder: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!wishlistItem) {
      return NextResponse.json(
        { error: 'Seed not found in wishlist' },
        { status: 404 }
      );
    }

    apiLogger.debug('[GET /api/me/wishlist/[seedId]]', {
      userId: user.id,
      seedId,
      wishlistId: wishlistItem.id,
    });

    return NextResponse.json(wishlistItem, { status: 200 });

  } catch (error) {
    apiLogger.logError('[GET /api/me/wishlist/[seedId]]', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch wishlist item' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/me/wishlist/[seedId]
 * 
 * Update folder của seed trong wishlist
 * Dùng để move seed giữa các folders hoặc assign vào folder mới
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ seedProductId: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { seedProductId } = await params;
    
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const seedId = seedProductId;

    if (!seedId) {
      return NextResponse.json(
        { error: 'Seed ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateWishlistFolderSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify folder exists and belongs to user
    const folder = await prisma.wishlistFolder.findUnique({
      where: { id: validatedData.folderId },
      select: { id: true, userId: true, name: true }
    });

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    if (folder.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: This folder does not belong to you' },
        { status: 403 }
      );
    }

    // Check if seed exists in wishlist
    const existingWishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_seedId: {
          userId: user.id,
          seedId: seedId,
        }
      },
      select: { 
        id: true, 
        folderId: true,
        folder: {
          select: { id: true, name: true }
        }
      }
    });

    if (!existingWishlistItem) {
      return NextResponse.json(
        { error: 'Seed not found in wishlist. Please add it first.' },
        { status: 404 }
      );
    }

    // Check if already in target folder
    if (existingWishlistItem.folderId === validatedData.folderId) {
      return NextResponse.json(
        { 
          success: true,
          message: 'Seed is already in this folder',
          wishlistId: existingWishlistItem.id,
          folderId: validatedData.folderId,
          folderName: folder.name,
        },
        { status: 200 }
      );
    }

    // Update wishlist item's folder
    const updatedWishlistItem = await prisma.wishlist.update({
      where: {
        userId_seedId: {
          userId: user.id,
          seedId: seedId,
        }
      },
      data: {
        folderId: validatedData.folderId,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    apiLogger.info('[PUT /api/me/wishlist/[seedId]] Folder updated', {
      userId: user.id,
      seedId,
      wishlistId: updatedWishlistItem.id,
      previousFolder: existingWishlistItem.folder?.name || 'none',
      newFolder: folder.name,
    });

    return NextResponse.json(
      { 
        success: true,
        message: `Moved to ${folder.name}`,
        wishlist: updatedWishlistItem,
      },
      { status: 200 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    apiLogger.logError('[PUT /api/me/wishlist/[seedId]]', error as Error);
    return NextResponse.json(
      { error: 'Failed to update wishlist folder' },
      { status: 500 }
    );
  }
}
