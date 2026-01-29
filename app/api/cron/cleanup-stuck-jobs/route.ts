/**
 * GET /api/cron/cleanup-stuck-jobs
 * Cleanup stuck WAITING jobs that are older than 30 minutes
 * 
 * Auth: Bearer token with CRON_SECRET
 * Schedule: Weekly on Sunday at 2 AM UTC (via GitHub Actions or cron-job.org)
 * 
 * Purpose:
 * - Finds all WAITING jobs older than 30 minutes
 * - Marks them as CANCELLED to prevent database bloat
 * - Keeps job queue clean and healthy
 * 
 * Environment Variables:
 * - CRON_SECRET: Random secret for authentication (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/helpers/api-logger';
import { prisma } from '@/lib/prisma';

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

    apiLogger.info('[CRON Cleanup] Starting stuck jobs cleanup');
    
    // Get all WAITING jobs from database
    const waitingJobs = await prisma.scrapeJob.findMany({
      where: { status: 'WAITING' },
      select: { id: true, jobId: true, createdAt: true, mode: true }
    });
    
    // Mark jobs older than 30 minutes as stuck
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stuckJobs = waitingJobs.filter(j => j.createdAt < thirtyMinutesAgo);
    
    let cleanedCount = 0;
    
    if (stuckJobs.length > 0) {
      const result = await prisma.scrapeJob.updateMany({
        where: {
          id: { in: stuckJobs.map(j => j.id) }
        },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });
      
      cleanedCount = result.count;
      
      apiLogger.info('[CRON Cleanup] Cleaned up stuck jobs', {
        totalWaiting: waitingJobs.length,
        cleaned: cleanedCount,
        stuckJobs: stuckJobs.map(j => ({
          jobId: j.jobId,
          createdAt: j.createdAt,
          mode: j.mode
        }))
      });
    } else {
      apiLogger.debug('[CRON Cleanup] No stuck jobs found - database is clean');
    }

    return NextResponse.json({ 
      success: true,
      cleanedCount,
      totalWaiting: waitingJobs.length,
      timestamp: new Date().toISOString(),
      message: cleanedCount > 0 
        ? `Cleaned up ${cleanedCount} stuck jobs` 
        : 'No stuck jobs found - database is clean'
    });
  } catch (error) {
    apiLogger.logError('[CRON Cleanup] Failed to cleanup stuck jobs', error as Error);
    return NextResponse.json(
      { 
        error: 'Failed to cleanup stuck jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
