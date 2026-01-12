/**
 * POST /api/me/wishlist-folder/[id]/clear
 * 
 * Clear toàn bộ seeds trong folder (move về Uncategorized)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth/auth';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';

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

    const { id: folderId } = await params;

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

    // Check if folder exists and belongs to user
    const folder = await prisma.wishlistFolder.findUnique({
      where: { id: folderId }
    });

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    if (folder.userId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to clear this folder' },
        { status: 403 }
      );
    }

    // Cannot clear Uncategorized folder
    if (folder.name === 'Uncategorized') {
      return NextResponse.json(
        { error: 'Cannot clear the Uncategorized folder' },
        { status: 400 }
      );
    }

    // Find Uncategorized folder
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

    // Move all seeds from current folder to Uncategorized
    const result = await prisma.wishlist.updateMany({
      where: {
        folderId: folderId,
        userId: user.id
      },
      data: {
        folderId: uncategorizedFolder.id
      }
    });

    apiLogger.info('[POST /api/me/wishlist-folder/[id]/clear]', {
      userId: user.id,
      folderId,
      folderName: folder.name,
      movedCount: result.count,
      targetFolderId: uncategorizedFolder.id
    });

    return NextResponse.json({
      message: `Moved ${result.count} seed(s) to Uncategorized`,
      movedCount: result.count,
      targetFolderId: uncategorizedFolder.id
    }, { status: 200 });

  } catch (error) {
    apiLogger.logError('[POST /api/me/wishlist-folder/[id]/clear]', error as Error);
    return NextResponse.json(
      { error: 'Failed to clear folder' },
      { status: 500 }
    );
  }
}
