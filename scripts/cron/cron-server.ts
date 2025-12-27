import { startCronJobs } from '@/lib/cron';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Script để start cron jobs
 * Chạy: pnpm run cron:start
 */
async function main() {
    apiLogger.debug('=== Starting Cron Jobs Server ===');
    startCronJobs();

    // Keep process running
    process.on('SIGINT', () => {
        apiLogger.debug('Shutting down cron jobs...');
        process.exit(0);
    });

    apiLogger.debug('Cron server is running. Press Ctrl+C to stop.');
}

main().catch(console.error);
