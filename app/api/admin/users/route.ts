import { auth } from "@/auth/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/helpers/api-logger";
import { NextRequest, NextResponse } from "next/server";

// GET: List all users (for admin only)
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
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
      select: { role: true, email: true }
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

    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    // Log successful admin access
    apiLogger.info("Admin user accessing users list", {
      adminEmail: currentUser.email,
      endpoint: "/api/admin/users",
      searchQuery: email || 'all_users'
    });
    
    let users;
    
    if (email) {
      // Search by email
      users = await prisma.user.findMany({
        where: {
          email: {
            contains: email,
            mode: 'insensitive'
          }
        },
        select: { 
          id: true, 
          name: true, 
          email: true, 
          bio: true, 
          image: true, 
          role: true,
          acquisitionDate: true,
          lastActiveAt: true,
          acquisitionSource: true,
          lifetimeValue: true,
          totalSpent: true,
          preferredLanguage: true,
          totalChatSessions: true
        },
        orderBy: { acquisitionDate: 'desc' }
      });
    } else {
      // Get all users
      users = await prisma.user.findMany({
        select: { 
          id: true, 
          name: true, 
          email: true, 
          bio: true, 
          image: true, 
          role: true,
          acquisitionDate: true,
          lastActiveAt: true,
          acquisitionSource: true,
          lifetimeValue: true,
          totalSpent: true,
          preferredLanguage: true,
          totalChatSessions: true
        },
        orderBy: { acquisitionDate: 'desc' }
      });
    }

    return NextResponse.json({ 
      users, 
      count: users.length,
      timestamp: new Date().toISOString()
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