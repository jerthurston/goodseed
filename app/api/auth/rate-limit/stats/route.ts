import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitStats } from '@/lib/helpers/server/magicLink/index';
import { auth } from '@/auth/auth';

/**
 * GET /api/admin/rate-limit/stats
 * Get rate limit statistics
 * 
 * Auth: Admin only
 */
export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' }, 
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' }, 
        { status: 403 }
      );
    }

    // Get stats
    const stats = await getRateLimitStats();

    if (!stats) {
      return NextResponse.json(
        { error: 'Failed to retrieve stats' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[ADMIN] Rate limit stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
