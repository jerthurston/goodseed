import cron from 'node-cron';
import { apiLogger } from './helpers/api-logger';

/**
 * Modern Cron Jobs cho Hybrid Cannabis Scraping System
 * 
 * Strategies:
 * 1. Daily Priority Sites: High-value sites mỗi ngày (Vancouver, SunWest, etc.)
 * 2. Weekly Full Refresh: Tất cả sites mỗi tuần để refresh data
 * 3. Hourly Quick Check: Check for new products trên priority sites
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

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
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

// Quick Check: Mỗi 4 tiếng - Priority sites only  
export const quickCheckJob = cron.schedule(
    '0 */4 * * *', // Every 4 hours
    async () => {
        try {
            console.log('=== [CRON] Starting Quick Check (Priority Sites) ===');
            await triggerScrapingJob(CANNABIS_SITES_CONFIG.priority);
            console.log('=== [CRON] Quick Check Completed ===');
        } catch (error) {
            console.error('[CRON] Quick check failed:', error);
            // TODO: Send alert to monitoring system
        }
    },
    {
        timezone: 'America/Edmonton'
    }
);

// Daily Priority Scrape: 6:00 AM và 8:00 PM
export const dailyPriorityScrapeJob = cron.schedule(
    '0 6,20 * * *',
    async () => {
        try {
            console.log('=== [CRON] Starting Daily Priority Scrape ===');
            await triggerScrapingJob(CANNABIS_SITES_CONFIG.priority);
            console.log('=== [CRON] Daily Priority Scrape Completed ===');
        } catch (error) {
            console.error('[CRON] Daily priority scrape failed:', error);
        }
    },
    {
        timezone: 'America/Edmonton'
    }
);

// Weekly Full Scrape: Mỗi Chủ Nhật 3:00 AM - Tất cả sites
export const weeklyFullScrapeJob = cron.schedule(
    '0 3 * * 0',
    async () => {
        try {
            console.log('=== [CRON] Starting Weekly Full Scrape (All Sites) ===');
            
            // Priority sites first
            console.log('[CRON] Phase 1: Priority sites');
            await triggerScrapingJob(CANNABIS_SITES_CONFIG.priority);
            
            // Wait 30 minutes before secondary sites
            await new Promise(resolve => setTimeout(resolve, 30 * 60 * 1000));
            
            // Secondary sites
            console.log('[CRON] Phase 2: Secondary sites'); 
            await triggerScrapingJob(CANNABIS_SITES_CONFIG.secondary);
            
            console.log('=== [CRON] Weekly Full Scrape Completed ===');
        } catch (error) {
            console.error('[CRON] Weekly full scrape failed:', error);
        }
    },
    {
        timezone: 'America/Edmonton'
    }
);

// Start all cron jobs
export function startCronJobs() {
    console.log('Starting modern cannabis scraping cron jobs...');
    
    // Start jobs manually for better control
    quickCheckJob.start();
    dailyPriorityScrapeJob.start(); 
    weeklyFullScrapeJob.start();
    
    console.log('Modern cron jobs started!');
    console.log('- Quick check: Every 4 hours (priority sites)');
    console.log('- Daily priority: 6 AM & 8 PM (priority sites)'); 
    console.log('- Weekly full: Sunday 3 AM (all 11 cannabis sites)');
}

// Stop all cron jobs
export function stopCronJobs() {
    quickCheckJob.stop();
    dailyPriorityScrapeJob.stop();
    weeklyFullScrapeJob.stop();
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
