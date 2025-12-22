import { NextResponse } from 'next/server';
import { scraperQueue } from '@/lib/queue/scraper-queue';

export async function GET() {
  try {
    // Get queue stats từ Bull
    const [waiting, active, completed, failed, delayed, repeatJobs] = await Promise.all([
      scraperQueue.getWaiting(),
      scraperQueue.getActive(), 
      scraperQueue.getCompleted(),
      scraperQueue.getFailed(),
      scraperQueue.getDelayed(),
      scraperQueue.getRepeatableJobs() // Correct method name
    ]);

    const queueStats = {
      waiting: waiting.length,
      active: active.length, 
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      repeat: repeatJobs.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length
    };

    // Get sample job details
    const sampleJobs = {
      waiting: waiting.slice(0, 3).map((job: any) => ({
        id: job.id,
        data: job.data,
        opts: job.opts
      })),
      repeat: repeatJobs.slice(0, 5).map((job: any) => ({
        id: job.id,
        key: job.key,
        cron: job.cron,
        next: job.next
      }))
    };

    return NextResponse.json({
      success: true,
      data: {
        stats: queueStats,
        samples: sampleJobs,
        message: `Queue có ${queueStats.waiting} waiting jobs, ${queueStats.repeat} repeat jobs`
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to get queue stats'
    }, { status: 500 });
  }
}