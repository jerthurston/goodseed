/**
 * Test script để trigger all sites scraping manually
 * Usage: npm run cron:test-all
 */

import { triggerAllSites } from '@/lib/cron';

async function testAllSitesJob() {
    try {
        console.log('=== Testing All Sites Cron Job ===');
        
        // Ensure environment variables
        if (!process.env.CRON_SECRET) {
            throw new Error('CRON_SECRET environment variable required');
        }
        
        if (!process.env.NEXTAUTH_URL) {
            console.warn('NEXTAUTH_URL not set, using localhost:3000');
            process.env.NEXTAUTH_URL = 'http://localhost:3000';
        }
        
        console.log('Environment check passed');
        console.log('Target: All 11 cannabis seed sites');
        console.log('Priority sites: vancouverseedbank, sunwestgenetics, cropkingseeds, bcbuddepot');
        console.log('Secondary sites: beaverseed, fireandflower, maryjanesgarden, mjseedscanada, rocketseeds, royalqueenseeds, seedsupreme, sonomaseeds');
        
        // Trigger the job
        await triggerAllSites();
        
        console.log('=== All Sites Test Completed Successfully ===');
        
    } catch (error) {
        console.error('All sites test failed:', error);
        process.exit(1);
    }
}

testAllSitesJob();