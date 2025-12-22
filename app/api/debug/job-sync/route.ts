import { NextResponse } from 'next/server';
import { JobStatusSyncService } from '@/lib/services/auto-scraper/job-status-sync.service';

export async function GET() {
  try {
    const summary = await JobStatusSyncService.getJobStatusSummary();
    
    return NextResponse.json({
      success: true,
      data: summary,
      message: 'Job status summary retrieved successfully'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    await JobStatusSyncService.syncAllJobStatuses();
    
    return NextResponse.json({
      success: true,
      message: 'All job statuses synced successfully'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}