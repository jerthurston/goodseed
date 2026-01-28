import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth/auth';
import { apiLogger } from '@/lib/helpers/api-logger';
import { prisma } from '@/lib/prisma';
import { notificationPreferenceUpdateSchema } from '@/schemas/notification-preference.schema';

/**
 * PUT /api/me/notification-preference
 * Update current user's notification preferences
 * 
 * Body:
 * {
 *   receiveSpecialOffers?: boolean,
 *   receivePriceAlerts?: boolean,
 *   receiveBackInStock?: boolean
 * }
 * 
 * Auth: Required (session-based)
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = notificationPreferenceUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      apiLogger.warn('[NotificationPreference] Validation failed', {
        userId: session.user.id,
        errors: validationResult.error.issues,
      });

      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { receiveSpecialOffers, receivePriceAlerts, receiveBackInStock } = validationResult.data;

    // Update or create notification preference
    const updatedPreference = await prisma.notificationPreference.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        ...(receiveSpecialOffers !== undefined && { receiveSpecialOffers }),
        ...(receivePriceAlerts !== undefined && { receivePriceAlerts }),
        ...(receiveBackInStock !== undefined && { receiveBackInStock }),
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        receiveSpecialOffers: receiveSpecialOffers ?? false,
        receivePriceAlerts: receivePriceAlerts ?? false,
        receiveBackInStock: receiveBackInStock ?? false,
      },
    });

    apiLogger.info('[NotificationPreference] Updated successfully', {
      userId: session.user.id,
      preferences: updatedPreference,
    });

    return NextResponse.json(
      {
        message: 'Notification preferences updated successfully',
        data: updatedPreference,
      },
      { status: 200 }
    );

  } catch (error) {
    apiLogger.logError('[NotificationPreference] Update failed', error as Error);

    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/me/notification-preference
 * Get current user's notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const preference = await prisma.notificationPreference.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    // Return default values if no preference exists
    // if (!preference) {
    //   return NextResponse.json({
    //     receiveSpecialOffers: false,
    //     receivePriceAlerts: false,
    //     receiveBackInStock: false,
    //   });
    // }

    return NextResponse.json(preference);

  } catch (error) {
    apiLogger.logError('[NotificationPreference] Get failed', error as Error);

    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}
