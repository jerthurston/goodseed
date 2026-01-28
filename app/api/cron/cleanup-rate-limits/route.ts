import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldRateLimitRecords } from '@/lib/helpers/server/magicLink/index';

/**
 * GET /api/cron/cleanup-rate-limits
 * Cleanup old rate limit records (older than 7 days)
 * 
 * Auth: Bearer token with CRON_SECRET
 * 
 * Setup GitHub Actions Cron:
 * 1. Add CRON_SECRET to GitHub repository secrets
 * 2. Add API_URL to GitHub repository secrets (e.g., https://goodseed.com)
 * 3. Workflow file: .github/workflows/cleanup-database.yml
 * 4. Schedule: Daily at 2 AM UTC (cron: '0 2 * * *')
 * 
 * Environment Variables:
 * - CRON_SECRET: Random secret for authentication (required)
 * 
 * See docs: docs/implementation/github-actions-cron-quickstart.md
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authorization via CRON_SECRET
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' }, 
        { status: 500 }
      );
    }

    const isValidCronSecret = authHeader === `Bearer ${cronSecret}`;

    if (!isValidCronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' }, 
        { status: 401 }
      );
    }

    // Run cleanup
    const deletedCount = await cleanupOldRateLimitRecords();

    return NextResponse.json({ 
      success: true,
      deletedCount,
      timestamp: new Date().toISOString(),
      message: `Cleaned up ${deletedCount} old rate limit records`,
    });

  } catch (error) {
    console.error('[CRON] Rate limit cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
