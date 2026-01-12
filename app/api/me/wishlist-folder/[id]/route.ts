import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth/auth';
import { prisma } from '@/lib/prisma';
import { updateWishlistFolderSchema } from '@/schemas/wishlist-folder.schema';
import { WishlistFolderRaw } from '@/types/wishlist-folder.type';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * PUT /api/me/wishlist-folder/[id]
 * 
 * Cập nhật wishlist folder của user hiện tại
 * Chỉ cho phép update name hoặc order
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: folderId } = await params;

    // Parse và validate request body
    const body = await request.json();
    const validatedData = updateWishlistFolderSchema.parse(body);

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

    // Kiểm tra folder có tồn tại và thuộc về user không
    const existingFolder = await prisma.wishlistFolder.findUnique({
      where: { id: folderId },
      select: { id: true, userId: true, name: true }
    });

    if (!existingFolder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    if (existingFolder.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: This folder does not belong to you' },
        { status: 403 }
      );
    }

    // Nếu update name, kiểm tra duplicate với folders khác của user
    if (validatedData.name && validatedData.name !== existingFolder.name) {
      const duplicateFolder = await prisma.wishlistFolder.findFirst({
        where: {
          userId: user.id,
          name: validatedData.name,
          id: { not: folderId } // Exclude current folder
        }
      });

      if (duplicateFolder) {
        return NextResponse.json(
          { error: `Folder "${validatedData.name}" already exists` },
          { status: 409 } // Conflict
        );
      }
    }

    // Không cho phép rename folder "Uncategorized"
    if (existingFolder.name === 'Uncategorized' && validatedData.name) {
      return NextResponse.json(
        { error: 'Cannot rename the default "Uncategorized" folder' },
        { status: 403 }
      );
    }

    // Update folder
    const updatedFolder = await prisma.wishlistFolder.update({
      where: { id: folderId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.order !== undefined && { order: validatedData.order }),
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

    apiLogger.info('[PUT /api/me/wishlist-folder/:id] Folder updated', {
      userId: user.id,
      folderId: updatedFolder.id,
      changes: validatedData
    });

    return NextResponse.json<WishlistFolderRaw>(updatedFolder, { status: 200 });

  } catch (error) {
    // Zod validation error
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.message },
        { status: 400 }
      );
    }

    apiLogger.logError('[PUT /api/me/wishlist-folder/:id]', error as Error);
    return NextResponse.json(
      { error: 'Failed to update wishlist folder' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/me/wishlist-folder/[id]
 * 
 * Xóa wishlist folder của user hiện tại
 * Không cho phép xóa folder "Uncategorized"
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: folderId } = await params;

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

    // Kiểm tra folder có tồn tại và thuộc về user không
    const existingFolder = await prisma.wishlistFolder.findUnique({
      where: { id: folderId },
      select: { id: true, userId: true, name: true }
    });

    if (!existingFolder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    if (existingFolder.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: This folder does not belong to you' },
        { status: 403 }
      );
    }

    // Không cho phép xóa folder "Uncategorized"
    if (existingFolder.name === 'Uncategorized') {
      return NextResponse.json(
        { error: 'Cannot delete the default "Uncategorized" folder' },
        { status: 403 }
      );
    }

    // Find Uncategorized folder to move wishlist items
    const uncategorizedFolder = await prisma.wishlistFolder.findFirst({
      where: {
        userId: user.id,
        name: 'Uncategorized'
      }
    });

    if (!uncategorizedFolder) {
      return NextResponse.json(
        { error: 'Uncategorized folder not found' },
        { status: 404 }
      );
    }

    // Move all wishlist items from this folder to Uncategorized before deleting
    const moveResult = await prisma.wishlist.updateMany({
      where: {
        folderId: folderId,
        userId: user.id
      },
      data: {
        folderId: uncategorizedFolder.id
      }
    });

    // Now delete the folder
    await prisma.wishlistFolder.delete({
      where: { id: folderId }
    });

    apiLogger.info('[DELETE /api/me/wishlist-folder/:id] Folder deleted', {
      userId: user.id,
      folderId: folderId,
      folderName: existingFolder.name,
      movedItems: moveResult.count
    });

    return NextResponse.json(
      { message: 'Folder deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    apiLogger.logError('[DELETE /api/me/wishlist-folder/:id]', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete wishlist folder' },
      { status: 500 }
    );
  }
}