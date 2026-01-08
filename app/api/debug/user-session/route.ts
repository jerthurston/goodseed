import { auth } from "@/auth/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Debug endpoint: Compare session data with database data
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        acquisitionDate: true,
        lastActiveAt: true
      },
    });

    // Compare session vs database
    const comparison = {
      sessionData: {
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        id: session.user.id,
        // Check if role exists in session
        role: (session.user as any).role || 'NOT_IN_SESSION',
        sessionObject: session.user
      },
      databaseData: dbUser,
      mismatch: {
        roleMatch: (session.user as any).role === dbUser?.role,
        sessionRole: (session.user as any).role || 'NOT_IN_SESSION',
        dbRole: dbUser?.role || 'NOT_IN_DB'
      },
      recommendation: "If roles don't match, user needs to re-login to refresh session"
    };

    return NextResponse.json(comparison);
    
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ 
      error: "Debug failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}