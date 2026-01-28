import { auth } from "@/auth/auth";
import { apiLogger } from "@/lib/helpers/api-logger";
import { handleAxiosError } from "@/lib/helpers/client/error-handle/error-handler";
import { getUserById } from "@/lib/helpers/server/user";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    };

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                emailVerified: true,
                image: true,
                notificationPreference:true
            },
        })

        if (!user) {
            apiLogger.warn('[User not found]', { userId: session.user.id });
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        apiLogger.info('[Get user information successfully]',{ user });

        return NextResponse.json(user);
    } catch (error) {
        apiLogger.logError('[Get user information failed]', error as Error);
        const errorMessage = handleAxiosError(error, 'USER', 'GET');
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 } // Add status code
        )
    }
}

/**
 * DELETE /api/me
 * Delete current user's account (soft delete or hard delete)
 * 
 * Security:
 * - User can only delete their own account
 * - All related data will be cascade deleted (defined in Prisma schema)
 * - OAuth accounts, sessions, preferences, etc. will be removed
 * 
 * Auth: Required (session-based)
 */
export async function DELETE(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json(
            { error: 'Unauthorized - Please sign in' },
            { status: 401 }
        );
    }

    const userId = session.user.id;

    try {
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
            }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Delete user (cascade delete will handle related records)
        // Related models with onDelete: Cascade will be automatically deleted:
        // - Account (OAuth)
        // - Session
        // - NotificationPreference
        // - TwoFactorConfirmation
        await prisma.user.delete({
            where: { id: userId }
        });

        apiLogger.info('[User account deleted]', {
            userId,
            email: user.email,
            name: user.name,
            deletedAt: new Date().toISOString(),
        });

        return NextResponse.json(
            {
                message: 'Account deleted successfully',
                deletedUser: {
                    id: user.id,
                    email: user.email,
                }
            },
            { status: 200 }
        );

    } catch (error) {
        apiLogger.logError('[Delete account failed]', error as Error, { userId });

        return NextResponse.json(
            { error: 'Failed to delete account. Please try again later.' },
            { status: 500 }
        );
    }
}