import { NextResponse } from 'next/server';
import { getScraperQueueStats, getScheduledAutoJobs, scraperQueue } from '@/lib/queue/scraper-queue';
import { apiLogger } from '@/lib/helpers/api-logger';
import { auth } from '@/auth';

/**
 * GET /api/debug/queue - Comprehensive queue status và monitoring
 * 
 * Tổng hợp tất cả thông tin về Bull queue:
 * - Queue statistics (waiting, active, completed, failed, delayed)
 * - Scheduled auto jobs (repeat jobs)
 * - Analysis summary để verify Stop All
 * - Sample jobs để debugging
 */
export async function GET() {
  try {
    apiLogger.info('[Debug Queue] Status check requested');
    // 0.1 authentication
      // TODO: Need to authenticate for admin role in the future
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json({
        error: "Unauthorized",
        status: 401
      })
    }

    if (user?.role !== "ADMIN") {
      return NextResponse.json({
        message: "Forbidden",
        status: 403
      })
    }
    // 1. Get comprehensive queue stats
    const queueStats = await getScraperQueueStats();

    // 2. Get scheduled auto jobs
    const scheduledJobs = await getScheduledAutoJobs();

    // 3. Get sample jobs từ queue để debugging
    const [waiting, active, failed] = await Promise.all([
      scraperQueue.getWaiting(),
      scraperQueue.getActive(), 
      scraperQueue.getFailed()
    ]);

    const sampleJobs = {
      waiting: waiting.slice(0, 3).map((job: any) => ({
        id: job.id,
        data: job.data?.mode || 'unknown',
        sellerId: job.data?.sellerId || 'unknown'
      })),
      active: active.slice(0, 3).map((job: any) => ({
        id: job.id,
        data: job.data?.mode || 'unknown',
        sellerId: job.data?.sellerId || 'unknown',
        processedOn: job.processedOn
      })),
      failed: failed.slice(0, 3).map((job: any) => ({
        id: job.id,
        data: job.data?.mode || 'unknown',
        sellerId: job.data?.sellerId || 'unknown',
        failedReason: job.failedReason
      }))
    };

    // 4. Analysis summary cho Stop All verification
    const analysis = {
      hasActiveJobs: queueStats.active > 0,
      hasScheduledJobs: scheduledJobs.length > 0,
      totalJobs: queueStats.total,
      isSystemIdle: queueStats.active === 0 && scheduledJobs.length === 0,
      stopAllStatus: scheduledJobs.length === 0 ? 'SUCCESS' : 'PENDING'
    };

    // 5. Detailed scheduled jobs info
    const scheduledJobsInfo = {
      count: scheduledJobs.length,
      jobs: scheduledJobs.map(job => ({
        id: job.id,
        cron: job.cron,
        tz: job.tz,
        endDate: job.endDate,
        next: job.next,
        key: job.key
      }))
    };

    const response = {
      timestamp: new Date().toISOString(),
      queueStats,
      scheduledJobs: scheduledJobsInfo,
      sampleJobs,
      analysis,
      summary: {
        message: queueStats.active > 0 ? 
          `⚠️ Queue đang active với ${queueStats.active} jobs running` :
          scheduledJobs.length > 0 ?
          `📅 Queue idle nhưng có ${scheduledJobs.length} scheduled jobs` :
          `✅ Queue hoàn toàn clean - không có jobs nào`,
        recommendation: 
          queueStats.active > 0 ? 'Có jobs đang chạy - cần stop nếu muốn dừng' :
          scheduledJobs.length > 0 ? 'Có auto jobs scheduled - cần Stop All để dừng hoàn toàn' :
          'Hệ thống đã dừng hoàn toàn'
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    apiLogger.logError('[Debug Queue] Failed to get queue status', error as Error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to get comprehensive queue status'
    }, { status: 500 });
  }
}