/**
 * Admin User Activity API
 * GET /api/admin/users/[id]/activity - Get user activity logs
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/helpers/api-logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest, 
  { params }: RouteParams
) {
  try {
    const session = await auth();

    // Check authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse query params for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type'); // wishlist, folder, etc.

    // Fetch wishlist activity
    const wishlistWhere: any = { userId: id };
    
    const wishlistEvents = await prisma.wishlist.findMany({
      where: wishlistWhere,
      select: {
        id: true,
        userId: true,
        seedId: true,
        createdAt: true,
        seedProduct: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        wishlistFolderItems: {
          select: {
            wishlistFolder: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    // Fetch folder activity
    const folderEvents = await prisma.wishlistFolder.findMany({
      where: { userId: id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        order: true
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    // Transform to unified activity format
    const activities = [
      ...wishlistEvents.map(item => ({
        id: item.id,
        date: item.createdAt.toISOString(),
        action: 'Added to wishlist',
        details: item.seedProduct.name,
        metadata: {
          seedId: item.seedProduct.id,
          seedSlug: item.seedProduct.slug,
          folders: item.wishlistFolderItems.map(fi => fi.wishlistFolder.name).join(', ') || 'No folders'
        },
        type: 'wishlist' as const
      })),
      ...folderEvents.map(folder => ({
        id: folder.id,
        date: folder.createdAt.toISOString(),
        action: 'Created folder',
        details: folder.name,
        metadata: {
          folderId: folder.id,
          order: folder.order
        },
        type: 'folder' as const
      }))
    ];

    // Sort by date descending
    activities.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Apply type filter if provided
    const filteredActivities = type 
      ? activities.filter(a => a.type === type)
      : activities;

    apiLogger.info('User activity fetched by admin', {
      adminId: session.user.id,
      targetUserId: id,
      activityCount: filteredActivities.length,
      filter: type || 'all'
    });

    return NextResponse.json({
      activities: filteredActivities.slice(0, limit),
      user: {
        id: user.id,
        name: user.name
      },
      meta: {
        total: filteredActivities.length,
        limit,
        type: type || 'all'
      }
    });

  } catch (error) {
    apiLogger.logError('Error fetching user activity', error as Error, {
      endpoint: '/api/admin/users/[id]/activity'
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}