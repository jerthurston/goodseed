import { log } from '@/lib/utils';
import { runScraper } from '@/scrapers';
import cron from 'node-cron';

/**
 * Cron Jobs cho Auto Scraping
 * 
 * Strategies:
 * 1. Incremental Scrape: Mỗi 12 giờ, scrape 10 pages đầu (hot strains)
 * 2. Full Scrape: Mỗi Chủ Nhật, scrape 50 pages (refresh data)
 */

// Incremental Scrape: 6:00 AM và 6:00 PM hàng ngày
export const incrementalScrapeJob = cron.schedule(
    '0 6,18 * * *',
    async () => {
        try {
            log('=== [CRON] Starting Incremental Scrape ===');
            await runScraper('leafly', 1, 10); // Top 10 pages
            log('=== [CRON] Incremental Scrape Completed ===');
        } catch (error) {
            console.error('[CRON] Incremental scrape failed:', error);
            // TODO: Send alert to Slack/Email
        }
    },
    {
        timezone: 'America/Edmonton', // Adjust to your timezone
    }
);

// Full Scrape: Mỗi Chủ Nhật 2:00 AM
export const fullScrapeJob = cron.schedule(
    '0 2 * * 0',
    async () => {
        try {
            log('=== [CRON] Starting Full Scrape ===');

            // Scrape in batches to avoid timeout
            const batchSize = 50;
            const totalPages = 488;

            for (let start = 1; start <= totalPages; start += batchSize) {
                const end = Math.min(start + batchSize - 1, totalPages);
                log(`[CRON] Scraping batch: pages ${start}-${end}`);

                await runScraper('leafly', start, end);

                // Delay between batches
                if (end < totalPages) {
                    await new Promise(resolve => setTimeout(resolve, 60000)); // 1 min break
                }
            }

            log('=== [CRON] Full Scrape Completed ===');
        } catch (error) {
            console.error('[CRON] Full scrape failed:', error);
            // TODO: Send alert
        }
    },
    {
        timezone: 'America/Edmonton',
    }
);

// Start all cron jobs
export function startCronJobs() {
    log('Starting cron jobs...');
    // Jobs are created with auto-start, no need to call .start()
    log('Cron jobs started!');
    log('- Incremental scrape: Every 12 hours (6 AM, 6 PM)');
    log('- Full scrape: Every Sunday at 2 AM');
}

// Stop all cron jobs
export function stopCronJobs() {
    incrementalScrapeJob.stop();
    fullScrapeJob.stop();
    log('Cron jobs stopped!');
}
