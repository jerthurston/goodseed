/**
 * Admin User Actions API
 * POST /api/admin/users/[id]/actions - Perform admin actions on user
 * 
 * Supported actions:
 * - BAN: Ban user (set role to BANNED)
 * - UNBAN: Unban user (restore to USER role)
 * - VERIFY_EMAIL: Manually verify user email
 * - PROMOTE: Promote user to ADMIN
 * - DEMOTE: Demote admin to USER
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/helpers/api-logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

type AdminAction = 'BAN' | 'UNBAN' | 'VERIFY_EMAIL' | 'PROMOTE' | 'DEMOTE';

export async function POST(
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
    const { action } = body as { action: AdminAction };

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Prevent actions on self
    if (id === session.user.id && ['BAN', 'DEMOTE'].includes(action)) {
      return NextResponse.json(
        { error: 'Cannot perform this action on yourself' },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true 
      }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let updatedUser;
    let actionMessage = '';

    switch (action) {
      case 'BAN':
        if (targetUser.role === 'ADMIN') {
          return NextResponse.json(
            { error: 'Cannot ban an admin user' },
            { status: 400 }
          );
        }
        updatedUser = await prisma.user.update({
          where: { id },
          data: { role: "BANNED" }
        });
        actionMessage = 'User banned successfully';
        break;

      case 'UNBAN':
        updatedUser = await prisma.user.update({
          where: { id },
          data: { role: "USER" }
        });
        actionMessage = 'User unbanned successfully';
        break;

      case 'VERIFY_EMAIL':
        updatedUser = await prisma.user.update({
          where: { id },
          data: { emailVerified: new Date() }
        });
        actionMessage = 'Email verified successfully';
        break;

      case 'PROMOTE':
        if (targetUser.role === 'ADMIN') {
          return NextResponse.json(
            { error: 'User is already an admin' },
            { status: 400 }
          );
        }
        updatedUser = await prisma.user.update({
          where: { id },
          data: { role: "ADMIN" }
        });
        actionMessage = 'User promoted to admin successfully';
        break;

      case 'DEMOTE':
        if (targetUser.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'User is not an admin' },
            { status: 400 }
          );
        }
        updatedUser = await prisma.user.update({
          where: { id },
          data: { role: "USER" }
        });
        actionMessage = 'Admin demoted to user successfully';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    apiLogger.info('Admin action performed on user', {
      adminId: session.user.id,
      adminEmail: session.user.email,
      targetUserId: id,
      targetUserEmail: targetUser.email,
      action,
      previousRole: targetUser.role,
      newRole: updatedUser.role
    });

    return NextResponse.json({
      success: true,
      message: actionMessage,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        emailVerified: updatedUser.emailVerified
      }
    });

  } catch (error) {
    apiLogger.logError('Error performing admin action', error as Error, {
      endpoint: '/api/admin/users/[id]/actions'
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
