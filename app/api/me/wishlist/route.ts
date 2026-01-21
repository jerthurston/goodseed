/**
 * GET /api/me/wishlist: Lấy thông tin danh sách wishlist của user
 * POST /api/me/wishlist: Thêm hoặc tạo một seedProduct trong wishlist của user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth/auth';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';
import { z } from 'zod';

// Validation schema - Only seedId required
const createWishlistSchema = z.object({
  seedId: z.string().min(1, 'Seed ID is required'),
});

/**
 * GET /api/me/wishlist
 * 
 * Lấy tất cả wishlist items của user hiện tại
 * Optional: Filter by folderId
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get folderId from query params (optional filter)
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

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

    // Build where clause
    const whereClause: any = {
      userId: user.id
    };

    // Filter by folder if provided
    if (folderId) {
      // whereClause.folderId = folderId;
      whereClause.wishlistFolderItems = {
        some:{
          wishlistFolderId:folderId 
        }
      }
    }

    // Fetch wishlist items with full seed product details
    const wishlist = await prisma.wishlist.findMany({
      where: whereClause,
      include: {
        seedProduct: {
          select: {
            id: true,
            name: true,
            url: true,
            description: true,
            seedType: true,
            cannabisType: true,
            thcMin: true,
            thcMax: true,
            thcText: true,
            cbdMin: true,
            cbdMax: true,
            cbdText: true,
            stockStatus: true,
            createdAt: true,
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
            seller: {
              select: {
                id: true,
                name: true,
                url: true,
                affiliateTag: true,
              }
            }
          }
        },
        wishlistFolderItems:{
          include:{
            wishlistFolder:{
              select:{
                id:true,
                name:true,
              }
            }
          }
        },
        // folder: {
        //   select: {
        //     id: true,
        //     name: true,
        //   }
        // },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    apiLogger.debug('[GET /api/me/wishlist]', {
      userId: user.id,
      count: wishlist.length,
      folderId: folderId || 'all',
      items: wishlist
    });

    return NextResponse.json(wishlist, { status: 200 });

  } catch (error) {
    apiLogger.logError('[GET /api/me/wishlist]', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/me/wishlist
 * 
 * Thêm seed vào wishlist (favorite)
 * Tự động assign vào folder "Uncategorized" thông qua junction table
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse và validate request body
    const body = await request.json();
    const validatedData = createWishlistSchema.parse(body);

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

    // Check if seed exists
    const seed = await prisma.seedProduct.findUnique({
      where: { id: validatedData.seedId },
      select: { id: true }
    });

    if (!seed) {
      return NextResponse.json(
        { error: 'Seed not found' },
        { status: 404 }
      );
    }

    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_seedId: {
          userId: user.id,
          seedId: validatedData.seedId
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This seed is already in your wishlist' },
        { status: 409 }
      );
    }

    // Auto-assign to "Uncategorized" folder
    const UNCATEGORIZED_NAME = 'Uncategorized';
    
    // Try to find existing Uncategorized folder
    let uncategorizedFolder = await prisma.wishlistFolder.findFirst({
      where: {
        userId: user.id,
        name: UNCATEGORIZED_NAME
      },
      select: { id: true }
    });

    // If not found, create it
    if (!uncategorizedFolder) {
      apiLogger.info('[POST /api/me/wishlist] Creating Uncategorized folder', {
        userId: user.id
      });

      uncategorizedFolder = await prisma.wishlistFolder.create({
        data: {
          userId: user.id,
          name: UNCATEGORIZED_NAME,
          order: 0, // First folder
        },
        select: { id: true }
      });

      apiLogger.info('[POST /api/me/wishlist] Uncategorized folder created', {
        userId: user.id,
        folderId: uncategorizedFolder.id
      });
    }

    // Transaction: Create wishlist + Create folder assignment
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create wishlist item (without folderId)
      const wishlistItem = await tx.wishlist.create({
        data: {
          userId: user.id,
          seedId: validatedData.seedId,
        },
        select: {
          id: true,
          userId: true,
          seedId: true,
          createdAt: true,
        }
      });

      // 2. Create folder assignment in junction table
      await tx.wishlistFolderItem.create({
        data: {
          wishlistId: wishlistItem.id,
          wishlistFolderId: uncategorizedFolder!.id,
          order: 0,
        }
      });

      return wishlistItem;
    });

    apiLogger.info('[POST /api/me/wishlist] Seed added to wishlist', {
      userId: user.id,
      wishlistId: result.id,
      seedId: result.seedId,
      folderId: uncategorizedFolder.id,
      folderName: UNCATEGORIZED_NAME
    });

    return NextResponse.json({
      ...result,
      folders: [{
        id: uncategorizedFolder.id,
        name: UNCATEGORIZED_NAME
      }]
    }, { status: 201 });

  } catch (error) {
    // Zod validation error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.message },
        { status: 400 }
      );
    }

    apiLogger.logError('[POST /api/me/wishlist]', error as Error);
    return NextResponse.json(
      { error: 'Failed to add to wishlist' },
      { status: 500 }
    );
  }
}
