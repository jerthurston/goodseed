/**
 * Main Worker - Unified Job Processor
 * 
 * Handles all background jobs in a single process:
 * 
 * 1. SCRAPER WORKER
 *    - Web scraping and data normalization
 *    - Auto-scheduling recurring scrapes
 *    - Job synchronization
 * 
 * 2. DETECT PRICE CHANGES WORKER (Pipeline Step 1)
 *    - Compare scraped prices with database
 *    - Detect significant price drops (≥5%)
 *    - Find affected users
 *    - Emit email jobs
 * 
 * 3. SEND PRICE ALERT WORKER (Pipeline Step 2)
 *    - Generate email from template
 *    - Send via Resend
 *    - Terminal step (no further jobs)
 * 
 * Architecture Benefits:
 * - Clean separation of concerns (each worker has its own file)
 * - Easy to test individual worker logic
 * - Unified monitoring and health checks
 * - Cost-effective: Single process = $7/month on Render
 * - Easy to scale: Can run multiple instances horizontally
 * 
 * Chained Pipeline Flow:
 * SCRAPE → DETECT_PRICE_CHANGES → SEND_PRICE_ALERT_EMAIL (×N users)
 * 
 * @usage
 * Development: pnpm run worker
 * Production: docker-compose up worker (local) or Render worker (production)
 */

import http from 'http';
import { apiLogger } from '@/lib/helpers/api-logger';

// Import worker modules
import { 
  initializeScraperWorker, 
  cleanupScraperWorker 
} from './scraper.worker';

import { 
  initializeDetectPriceChangesWorker, 
  cleanupDetectPriceChangesWorker 
} from './detect-price-changes.worker';

import { 
  initializeSendPriceAlertWorker, 
  cleanupSendPriceAlertWorker 
} from './send-price-alert.worker';

apiLogger.info('[Main Worker] 🚀 Starting unified worker process...');

/**
 * Health Check Server
 * Required by hosting platforms (Render, Railway, etc.) for monitoring
 */
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      worker: 'main-worker',
      queues: {
        scraper: { status: 'active' },
        detectPriceChanges: { status: 'active' },
        sendPriceAlert: { status: 'active' },
      },
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

healthServer.listen(3001, () => {
  apiLogger.info('[Main Worker] 💚 Health check server running on port 3001');
});

/**
 * Initialize All Worker Processors
 */
async function startWorker() {
  try {
    apiLogger.info('[Main Worker] 📋 Initializing workers...');
    
    // ========================================
    // WORKER 1: Scraper
    // ========================================
    // - Web scraping and data normalization
    // - Auto-scheduling recurring scrapes
    // - Emits DETECT_PRICE_CHANGES jobs on completion
    await initializeScraperWorker();
    apiLogger.info('[Main Worker] ✅ Scraper worker ready');
    
    // ========================================
    // WORKER 2: Detect Price Changes
    // ========================================
    // - Compares scraped prices with database
    // - Detects significant price drops (≥5%)
    // - Emits SEND_PRICE_ALERT_EMAIL jobs (one per user)
    await initializeDetectPriceChangesWorker();
    apiLogger.info('[Main Worker] ✅ Detect price changes worker ready');
    
    // ========================================
    // WORKER 3: Send Price Alert Email
    // ========================================
    // - Generates email from template
    // - Sends via Resend
    // - Terminal step (no further jobs)
    await initializeSendPriceAlertWorker();
    apiLogger.info('[Main Worker] ✅ Send price alert worker ready');
    
    apiLogger.info('[Main Worker] ✅ All workers initialized successfully');
    apiLogger.info('[Main Worker] 👂 Waiting for jobs...');
    apiLogger.info('[Main Worker] 🔗 Pipeline: SCRAPE → DETECT_PRICE_CHANGES → SEND_EMAIL');
  } catch (error) {
    apiLogger.logError('[Main Worker] ❌ Failed to start worker', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

/**
 * Graceful Shutdown
 * Ensures all jobs complete before process exits
 */
process.on('SIGTERM', async () => {
  apiLogger.info('[Main Worker] 🛑 Received SIGTERM, shutting down gracefully...');
  
  try {
    // Cleanup all workers
    await Promise.all([
      cleanupScraperWorker(),
      cleanupDetectPriceChangesWorker(),
      cleanupSendPriceAlertWorker(),
    ]);
    
    apiLogger.info('[Main Worker] ✅ All workers cleaned up');
  } catch (error) {
    apiLogger.logError(
      '[Main Worker] ❌ Error during cleanup', 
      error instanceof Error ? error : new Error(String(error))
    );
  }
  
  // Close health server
  healthServer.close(() => {
    apiLogger.info('[Main Worker] 👋 Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  apiLogger.info('[Main Worker] 🛑 Received SIGINT, shutting down gracefully...');
  
  try {
    // Cleanup all workers
    await Promise.all([
      cleanupScraperWorker(),
      cleanupDetectPriceChangesWorker(),
      cleanupSendPriceAlertWorker(),
    ]);
    
    apiLogger.info('[Main Worker] ✅ All workers cleaned up');
  } catch (error) {
    apiLogger.logError(
      '[Main Worker] ❌ Error during cleanup', 
      error instanceof Error ? error : new Error(String(error))
    );
  }
  
  // Close health server
  healthServer.close(() => {
    apiLogger.info('[Main Worker] 👋 Server closed');
    process.exit(0);
  });
});

// Start the unified worker
startWorker();
