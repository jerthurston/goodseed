import { startCronJobs } from '@/lib/cron';
import { log } from '@/lib/utils';

/**
 * Script để start cron jobs
 * Chạy: pnpm run cron:start
 */
async function main() {
    log('=== Starting Cron Jobs Server ===');
    startCronJobs();

    // Keep process running
    process.on('SIGINT', () => {
        log('Shutting down cron jobs...');
        process.exit(0);
    });

    log('Cron server is running. Press Ctrl+C to stop.');
}

main().catch(console.error);
