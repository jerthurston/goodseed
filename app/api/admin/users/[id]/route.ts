/**
 * Admin User Detail API
 * GET /api/admin/users/[id] - Get single user details
 * PATCH /api/admin/users/[id] - Update user
 * DELETE /api/admin/users/[id] - Delete user
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { apiLogger } from "@/lib/helpers/api-logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  req: NextRequest,
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

    // Fetch user with detailed info
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        acquisitionDate: true,
        lastActiveAt: true,
        acquisitionSource: true,
        bio: true,
        preferredLanguage: true,
        lifetimeValue: true,
        totalSpent: true,
        totalChatSessions: true,
        notificationPreference: {
          select: {
            receiveSpecialOffers: true,
            receivePriceAlerts: true,
            receiveBackInStock: true
          }
        },
        _count: {
          select: {
            wishlist: true,
            wishlistFolder: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    apiLogger.info('User detail fetched by admin', {
      adminId: session.user.id,
      targetUserId: id
    });

    return NextResponse.json({ user });

  } catch (error) {
    apiLogger.logError('Error fetching user detail', error as Error, {
      endpoint: '/api/admin/users/[id]'
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
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
    const body = await req.json();

    // Validate allowed fields
    const allowedFields = ['name', 'role', 'bio', 'preferredLanguage'];
    const updates: any = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Prevent self-demotion
    if (updates.role && id === session.user.id && updates.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot demote yourself' },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        preferredLanguage: true
      }
    });

    apiLogger.info('User updated by admin', {
      adminId: session.user.id,
      targetUserId: id,
      updates
    });

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    apiLogger.logError('Error updating user', error as Error, {
      endpoint: '/api/admin/users/[id]'
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
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

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true, name: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user (cascading deletes will handle relations)
    await prisma.user.delete({
      where: { id }
    });

    apiLogger.info('User deleted by admin', {
      adminId: session.user.id,
      deletedUserId: id,
      deletedUserEmail: user.email,
      deletedUserName: user.name
    });

    return NextResponse.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    apiLogger.logError('Error deleting user', error as Error, {
      endpoint: '/api/admin/users/[id]'
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
