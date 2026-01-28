import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth/auth';
import { prisma } from '@/lib/prisma';
import { WishlistFolderRaw } from '@/types/wishlist-folder.type';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * POST /api/me/wishlist-folder/[id]/duplicate
 * 
 * Duplicate wishlist folder với tên gốc + " (Copy)"
 * Nếu tên đã tồn tại, thêm số thứ tự: "(Copy 2)", "(Copy 3)", ...
 */
export async function POST(
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

    const { id: originalFolderId } = await params;

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

    // Kiểm tra folder gốc có tồn tại và thuộc về user không
    const originalFolder = await prisma.wishlistFolder.findUnique({
      where: { id: originalFolderId },
      select: { 
        id: true, 
        userId: true, 
        name: true,
        order: true 
      }
    });

    if (!originalFolder) {
      return NextResponse.json(
        { error: 'Original folder not found' },
        { status: 404 }
      );
    }

    if (originalFolder.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: This folder does not belong to you' },
        { status: 403 }
      );
    }

    // Không cho phép duplicate folder "Uncategorized"
    if (originalFolder.name === 'Uncategorized') {
      return NextResponse.json(
        { error: 'Cannot duplicate the default "Uncategorized" folder' },
        { status: 403 }
      );
    }

    // Tạo tên mới: Check xem đã có "(Copy)" hay "(Copy N)" chưa
    let newName = `${originalFolder.name} (Copy)`;
    let copyNumber = 2;

    // Loop để tìm tên unique
    while (true) {
      const existingFolder = await prisma.wishlistFolder.findFirst({
        where: {
          userId: user.id,
          name: newName
        }
      });

      if (!existingFolder) {
        // Tên này chưa tồn tại, dùng được
        break;
      }

      // Tên đã tồn tại, thử tên tiếp theo
      newName = `${originalFolder.name} (Copy ${copyNumber})`;
      copyNumber++;

      // Safety: Tránh infinite loop
      if (copyNumber > 100) {
        return NextResponse.json(
          { error: 'Too many copies of this folder already exist' },
          { status: 409 }
        );
      }
    }

    // Tính order mới: lấy max order hiện tại + 1
    const maxOrderFolder = await prisma.wishlistFolder.findFirst({
      where: { userId: user.id },
      orderBy: { order: 'desc' },
      select: { order: true }
    });

    const newOrder = maxOrderFolder ? maxOrderFolder.order + 1 : 0;

    // Tạo folder mới (duplicate)
    const duplicatedFolder = await prisma.wishlistFolder.create({
      data: {
        userId: user.id,
        name: newName,
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

    // TODO: Nếu cần, có thể copy cả wishlist items từ folder gốc sang folder mới
    // const originalItems = await prisma.wishlist.findMany({
    //   where: { folderId: originalFolderId }
    // });
    // Copy items...

    apiLogger.info('[POST /api/me/wishlist-folder/:id/duplicate] Folder duplicated', {
      userId: user.id,
      originalFolderId: originalFolder.id,
      originalFolderName: originalFolder.name,
      newFolderId: duplicatedFolder.id,
      newFolderName: duplicatedFolder.name,
      newOrder: duplicatedFolder.order
    });

    return NextResponse.json<WishlistFolderRaw>(duplicatedFolder, { status: 201 });

  } catch (error) {
    apiLogger.logError('[POST /api/me/wishlist-folder/:id/duplicate]', error as Error);
    return NextResponse.json(
      { error: 'Failed to duplicate wishlist folder' },
      { status: 500 }
    );
  }
}
