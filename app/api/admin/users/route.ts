/**
 * Admin Users List API
 * GET /api/admin/users - List all users with filters and pagination
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/helpers/api-logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    // Check authentication
    if (!session?.user?.email) {
      apiLogger.warn("Unauthorized access attempt to admin users endpoint", {
        endpoint: "/api/admin/users",
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent')
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, email: true, id: true }
    });

    if (!currentUser || currentUser.role !== 'ADMIN') {
      apiLogger.warn("Non-admin user attempted to access admin endpoint", {
        endpoint: "/api/admin/users",
        userEmail: session.user.email,
        userRole: currentUser?.role || 'unknown',
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      });
      return NextResponse.json({ 
        error: "Forbidden: Admin access required" 
      }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role && role !== 'all') {
      where.role = role;
    }

    // Fetch users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { 
          id: true, 
          name: true, 
          email: true, 
          bio: true, 
          image: true, 
          role: true,
          emailVerified: true,
          acquisitionDate: true,
          lastActiveAt: true,
          acquisitionSource: true,
          lifetimeValue: true,
          totalSpent: true,
          preferredLanguage: true,
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
        },
        orderBy: { acquisitionDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    // Log successful admin access
    apiLogger.info("Admin user accessing users list", {
      adminEmail: currentUser.email,
      adminId: currentUser.id,
      endpoint: "/api/admin/users",
      filters: { search, role },
      pagination: { page, limit },
      resultCount: users.length,
      total
    });

    return NextResponse.json({ 
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + users.length < total
      },
      meta: {
        timestamp: new Date().toISOString(),
        filters: {
          search: search || null,
          role: role || 'all'
        }
      }
    });

  } catch (error) {
    apiLogger.logError("Error fetching users in admin endpoint", error as Error, {
      endpoint: "/api/admin/users"
    });
    return NextResponse.json({ 
      error: "Failed to fetch users",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}