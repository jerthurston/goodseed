import { NextRequest, NextResponse } from 'next/server';
import { resetMagicLinkRateLimit } from '@/lib/helpers/server/magicLink/index';
import { auth } from '@/auth/auth';

/**
 * POST /api/admin/rate-limit/reset
 * Reset rate limit cho một email cụ thể
 * 
 * Body: { email: string }
 * Auth: Admin only
 */
export async function POST(req: NextRequest) {
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

    // Parse request body
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Invalid email parameter' }, 
        { status: 400 }
      );
    }

    // Reset rate limit
    await resetMagicLinkRateLimit(email);

    return NextResponse.json({ 
      success: true,
      message: `Rate limit reset for ${email}`,
    });

  } catch (error) {
    console.error('[ADMIN] Rate limit reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
