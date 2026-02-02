/**
 * Main Worker - Unified Job Processor
 * 
 * Handles all background jobs in a single process:
 * - Scraper jobs (web scraping, data normalization)
 * - Price alert jobs (price change detection, email notifications)
 * - Future: Newsletter jobs, analytics jobs, etc.
 * 
 * Architecture:
 * - Worker logic is separated into modules (scraper.worker.ts, price-alert.worker.ts)
 * - Main worker orchestrates initialization and graceful shutdown
 * - Single process = cost-effective ($7/month on Render)
 * 
 * Benefits:
 * - Clean separation of concerns
 * - Easy to test individual worker logic
 * - Unified monitoring and health checks
 * - Consistent environment configuration
 * - Easy to scale horizontally
 * 
 * @usage
 * Development: pnpm run worker
 * Production: docker-compose up worker (local) or Render worker (production)
 */

import http from 'http';
import { apiLogger } from '@/lib/helpers/api-logger';

// Import worker modules
import { initializeScraperWorker, cleanupScraperWorker } from './scraper.worker';
import { initializePriceAlertWorker, cleanupPriceAlertWorker } from './price-alert.worker';

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
        priceAlert: { status: 'active' },
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
    // Initialize scraper worker (includes auto-scheduler, job sync, queue processor)
    await initializeScraperWorker();
    
    // Initialize price alert worker (queue processor and event handlers)
    await initializePriceAlertWorker();
    
    apiLogger.info('[Main Worker] ✅ All workers initialized successfully');
    apiLogger.info('[Main Worker] 👂 Waiting for jobs...');
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
  
  // Cleanup all workers
  await Promise.all([
    cleanupScraperWorker(),
    cleanupPriceAlertWorker(),
  ]);
  
  // Close health server
  healthServer.close(() => {
    apiLogger.info('[Main Worker] 👋 Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  apiLogger.info('[Main Worker] 🛑 Received SIGINT, shutting down gracefully...');
  
  // Cleanup all workers
  await Promise.all([
    cleanupScraperWorker(),
    cleanupPriceAlertWorker(),
  ]);
  
  // Close health server
  healthServer.close(() => {
    apiLogger.info('[Main Worker] 👋 Server closed');
    process.exit(0);
  });
});

// Start the unified worker
startWorker();
