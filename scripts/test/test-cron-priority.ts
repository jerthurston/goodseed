/**
 * Test script để trigger priority sites scraping manually
 * Usage: npm run cron:test-priority
 */

import { triggerPrioritySites } from '@/lib/cron';

async function testPrioritySitesJob() {
    try {
        console.log('=== Testing Priority Sites Cron Job ===');
        
        // Ensure environment variables
        if (!process.env.CRON_SECRET) {
            throw new Error('CRON_SECRET environment variable required');
        }
        
        if (!process.env.NEXTAUTH_URL) {
            console.warn('NEXTAUTH_URL not set, using localhost:3000');
            process.env.NEXTAUTH_URL = 'http://localhost:3000';
        }
        
        console.log('Environment check passed');
        console.log('Target sites: vancouverseedbank, sunwestgenetics, cropkingseeds, bcbuddepot');
        
        // Use the same CRON_SECRET as in .env file
        process.env.CRON_SECRET = 'your-secure-random-secret-here-change-in-production';
        
        // Trigger the job
        await triggerPrioritySites();
        
        console.log('=== Priority Sites Test Completed Successfully ===');
        
    } catch (error) {
        console.error('Priority sites test failed:', error);
        process.exit(1);
    }
}

testPrioritySitesJob();