import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth/auth';
import { prisma } from '@/lib/prisma';
import { createWishlistFolderSchema } from '@/schemas/wishlist-folder.schema';
import { apiLogger } from '@/lib/helpers/api-logger';
/**
 * GET /api/me/wishlist-folder
 * 
 * Lấy tất cả wishlist folders của user hiện tại
 * Sorted by order ASC
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const folders = await prisma.wishlistFolder.findMany({
      where: {
        user: {
          email: session.user.email
        }
      },
      orderBy: {
        order: 'asc'
      },
      select: {
        id: true,
        userId: true,
        name: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    apiLogger.debug('[GET /api/me/wishlist-folder]', { folders });

    return NextResponse.json(folders, { status: 200 });

  } catch (error) {
    apiLogger.logError('[GET /api/me/wishlist-folder]', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch wishlist folders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/me/wishlist-folder
 * 
 * Tạo wishlist folder mới cho user hiện tại
 * Order được tự động tính toán dựa trên số lượng folders hiện có
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
    const validatedData = createWishlistFolderSchema.parse(body);

    // Tìm user
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

    // Kiểm tra duplicate folder name
    const existingFolder = await prisma.wishlistFolder.findFirst({
      where: {
        userId: user.id,
        name: validatedData.name
      }
    });

    if (existingFolder) {
      return NextResponse.json(
        { error: `Folder "${validatedData.name}" already exists` },
        { status: 409 } // Conflict
      );
    }

    // Tính order: lấy max order hiện tại + 1
    const maxOrderFolder = await prisma.wishlistFolder.findFirst({
      where: { userId: user.id },
      orderBy: { order: 'desc' },
      select: { order: true }
    });

    const newOrder = maxOrderFolder ? maxOrderFolder.order + 1 : 0;

    // Tạo folder mới
    const newFolder = await prisma.wishlistFolder.create({
      data: {
        userId: user.id,
        name: validatedData.name,
        order: newOrder,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    apiLogger.info('[POST /api/me/wishlist-folder] Folder created', {
      userId: user.id,
      folderId: newFolder.id,
      folderName: newFolder.name,
      order: newFolder.order
    });

    return NextResponse.json(newFolder, { status: 201 });

  } catch (error) {
    // Zod validation error
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.message },
        { status: 400 }
      );
    }

    apiLogger.logError('[POST /api/me/wishlist-folder]', error as Error);
    return NextResponse.json(
      { error: 'Failed to create wishlist folder' },
      { status: 500 }
    );
  }
}
