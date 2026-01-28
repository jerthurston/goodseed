import cron from 'node-cron';
import { apiLogger } from './helpers/api-logger';
import { prisma } from './prisma';

/**
 * Modern Cron Jobs cho Hybrid Cannabis Scraping System
 * 
 * Strategies:
 * 1. Daily Priority Sites: High-value sites mỗi ngày (Vancouver, SunWest, etc.)
 * 2. Weekly Full Refresh: Tất cả sites mỗi tuần để refresh data
 * 3. Hourly Quick Check: Check for new products trên priority sites
 * 4. Job Cleanup: Clean up stuck/orphaned jobs every 30 minutes
 * 
 * Integration: Sử dụng modern API endpoint /api/cron/scraper
 */

// Cannabis sites configuration
const CANNABIS_SITES_CONFIG = {
  priority: [
    'vancouverseedbank',
    'sunwestgenetics', 
    'cropkingseeds',
    'bcbuddepot'
  ],
  secondary: [
    'beaverseed',
    'fireandflower',
    'maryjanesgarden',
    'mjseedscanada',
    'rocketseeds',
    'royalqueenseeds',
    'seedsupreme',
    'sonomaseeds'
  ]
};

/**
 * Call modern cron API endpoint
 */
async function triggerScrapingJob(sites?: string[]): Promise<void> {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      throw new Error('CRON_SECRET not configured');
    }

    const baseUrl = process.env.AUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/cron/scraper`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Cron API failed: ${response.status}`);
    }

    const result = await response.json();
    apiLogger.debug(`[CRON] Scraping triggered: ${result.data.jobsQueued} jobs queued for ${result.data.totalSellers} sites`);
  } catch (error) {
    apiLogger.logError('[CRON] Failed to trigger scraping:', error as Error);
    throw error;
  }
}

/**
 * Cleanup stuck WAITING jobs that are not in Redis queue
 * Runs every 30 minutes to keep database clean
 */
async function cleanupStuckJobs(): Promise<void> {
  try {
    apiLogger.info('[CRON Cleanup] Starting stuck jobs cleanup');
    
    // Get all WAITING jobs from database
    const waitingJobs = await prisma.scrapeJob.findMany({
      where: { status: 'WAITING' },
      select: { id: true, jobId: true, createdAt: true, mode: true }
    });
    
    // Mark jobs older than 30 minutes as stuck
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stuckJobs = waitingJobs.filter(j => j.createdAt < thirtyMinutesAgo);
    
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
      
      apiLogger.info('[CRON Cleanup] Cleaned up stuck jobs', {
        totalWaiting: waitingJobs.length,
        cleaned: result.count
      });
    } else {
      apiLogger.debug('[CRON Cleanup] No stuck jobs found - database is clean');
    }
  } catch (error) {
    apiLogger.logError('[CRON Cleanup] Failed to cleanup stuck jobs', error as Error);
  }
}

// Quick Check: Mỗi 4 tiếng - Priority sites only
// TODO: Re-enable after resolving conflict with Auto Scraper system
// export const quickCheckJob = cron.schedule(
//     '0 */4 * * *', // Every 4 hours
//     async () => {
//         try {
//             console.log('=== [CRON] Starting Quick Check (Priority Sites) ===');
//             await triggerScrapingJob(CANNABIS_SITES_CONFIG.priority);
//             console.log('=== [CRON] Quick Check Completed ===');
//         } catch (error) {
//             console.error('[CRON] Quick check failed:', error);
//             // TODO: Send alert to monitoring system
//         }
//     },
//     {
//         timezone: 'America/Edmonton'
//     }
// );

// Daily Priority Scrape: 6:00 AM và 8:00 PM
// TODO: Re-enable after resolving conflict with Auto Scraper system
// export const dailyPriorityScrapeJob = cron.schedule(
//     '0 6,20 * * *',
//     async () => {
//         try {
//             console.log('=== [CRON] Starting Daily Priority Scrape ===');
//             await triggerScrapingJob(CANNABIS_SITES_CONFIG.priority);
//             console.log('=== [CRON] Daily Priority Scrape Completed ===');
//         } catch (error) {
//             console.error('[CRON] Daily priority scrape failed:', error);
//         }
//     },
//     {
//         timezone: 'America/Edmonton'
//     }
// );

// Weekly Full Scrape: Mỗi Chủ Nhật 3:00 AM - Tất cả sites
// TODO: Re-enable after resolving conflict with Auto Scraper system
// export const weeklyFullScrapeJob = cron.schedule(
//     '0 3 * * 0',
//     async () => {
//         try {
//             console.log('=== [CRON] Starting Weekly Full Scrape (All Sites) ===');
//             
//             // Priority sites first
//             console.log('[CRON] Phase 1: Priority sites');
//             await triggerScrapingJob(CANNABIS_SITES_CONFIG.priority);
//             
//             // Wait 30 minutes before secondary sites
//             await new Promise(resolve => setTimeout(resolve, 30 * 60 * 1000));
//             
//             // Secondary sites
//             console.log('[CRON] Phase 2: Secondary sites'); 
//             await triggerScrapingJob(CANNABIS_SITES_CONFIG.secondary);
//             
//             console.log('=== [CRON] Weekly Full Scrape Completed ===');
//         } catch (error) {
//             console.error('[CRON] Weekly full scrape failed:', error);
//         }
//     },
//     {
//         timezone: 'America/Edmonton'
//     }
// );

// Cleanup Orphaned Jobs: Weekly on Sunday at 2:00 AM
// Prevents accumulation of stuck WAITING jobs that are not in Redis queue
export const cleanupOrphanedJobsJob = cron.schedule(
    '0 2 * * 0', // Every Sunday at 2:00 AM (1 hour before weekly full scrape)
    async () => {
        await cleanupStuckJobs();
    },
    {
        timezone: 'America/Edmonton'
    }
);

// Start all cron jobs
export function startCronJobs() {
    console.log('Starting modern cannabis scraping cron jobs...');
    
    // Start jobs manually for better control
    // TODO: Re-enable after resolving conflict with Auto Scraper system
    // quickCheckJob.start();
    // dailyPriorityScrapeJob.start(); 
    // weeklyFullScrapeJob.start();
    cleanupOrphanedJobsJob.start();
    
    console.log('Modern cron jobs started!');
    // console.log('- Quick check: Every 4 hours (priority sites)');
    // console.log('- Daily priority: 6 AM & 8 PM (priority sites)'); 
    // console.log('- Weekly full: Sunday 3 AM (all 11 cannabis sites)');
    console.log('- Orphaned jobs cleanup: Sunday 2 AM (weekly)');
}

// Stop all cron jobs
export function stopCronJobs() {
    // TODO: Re-enable after resolving conflict with Auto Scraper system
    // quickCheckJob.stop();
    // dailyPriorityScrapeJob.stop();
    // weeklyFullScrapeJob.stop();
    cleanupOrphanedJobsJob.stop();
    console.log('Modern cron jobs stopped!');
}

// Manual trigger functions for testing
export async function triggerPrioritySites() {
    console.log('[MANUAL] Triggering priority sites scrape...');
    await triggerScrapingJob(CANNABIS_SITES_CONFIG.priority);
}

export async function triggerAllSites() {
    console.log('[MANUAL] Triggering all sites scrape...');
    await triggerScrapingJob([...CANNABIS_SITES_CONFIG.priority, ...CANNABIS_SITES_CONFIG.secondary]);
}
