/**
 * Main Worker - Unified Job Processor
 * 
 * Handles all background jobs in a single process:
 * - Scraper jobs (web scraping, data normalization)
 * - Price alert jobs (price change detection, email notifications)
 * - Future: Newsletter jobs, analytics jobs, etc.
 * 
 * Benefits:
 * - Single worker process = cost-effective ($7/month on Render)
 * - Unified monitoring and health checks
 * - Consistent environment configuration
 * - Easy to scale horizontally
 * 
 * @usage
 * Development: pnpm run worker
 * Production: docker-compose up worker
 */

import http from 'http';
import { apiLogger } from '@/lib/helpers/api-logger';

// Import queues
import { scraperQueue, processScraperJob } from '@/lib/queue/scraper-queue';
import { priceAlertQueue, processPriceAlertJob } from '@/lib/queue/price-change-alert';

// Import startup/cleanup utilities
import { initializeWorkerSync, cleanupWorkerSync } from './worker-initialization';

apiLogger.info('[Main Worker] 🚀 Starting unified worker process...');

/**
 * Initialize Scraper Queue Processor
 */
async function initializeScraperProcessor() {
  try {
    apiLogger.info('[Main Worker] 🔧 Initializing scraper queue processor...');
    
    scraperQueue.process(processScraperJob);
    
    // Scraper queue event handlers
    scraperQueue.on('completed', (job, result) => {
      apiLogger.info('[Scraper Queue] Job completed', {
        jobId: job.id,
        result
      });
    });

    scraperQueue.on('failed', (job, error) => {
      apiLogger.logError('[Scraper Queue] Job failed', new Error(error.message), {
        jobId: job?.id
      });
    });

    scraperQueue.on('error', (error) => {
      apiLogger.logError('[Scraper Queue] Queue error', new Error(error.message));
    });
    
    apiLogger.info('[Main Worker] ✅ Scraper queue processor initialized');
  } catch (error) {
    apiLogger.logError('[Main Worker] ❌ Failed to initialize scraper processor', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Initialize Price Alert Queue Processor
 */
async function initializePriceAlertProcessor() {
  try {
    apiLogger.info('[Main Worker] 🔧 Initializing price-alert queue processor...');
    
    priceAlertQueue.process(processPriceAlertJob);
    
    // Price alert queue event handlers (already defined in queue, but add worker-level logging)
    priceAlertQueue.on('completed', (job) => {
      apiLogger.info('[Price Alert Queue] Job completed', {
        jobId: job.id,
        type: job.data.type
      });
    });

    priceAlertQueue.on('failed', (job, err) => {
      apiLogger.logError('[Price Alert Queue] Job failed', err, {
        jobId: job?.id,
        type: job?.data.type
      });
    });
    
    apiLogger.info('[Main Worker] ✅ Price-alert queue processor initialized');
  } catch (error) {
    apiLogger.logError('[Main Worker] ❌ Failed to initialize price-alert processor', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

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
 * Initialize All Processors
 */
async function startWorker() {
  try {
    // Initialize scraper-specific services (auto-scheduler, job sync, etc.)
    await initializeWorkerSync();
    
    // Initialize queue processors
    await initializeScraperProcessor();
    await initializePriceAlertProcessor();
    
    apiLogger.info('[Main Worker] ✅ All processors initialized successfully');
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
  
  // Cleanup scraper-specific services
  await cleanupWorkerSync();
  
  // Close queues
  await Promise.all([
    scraperQueue.close(),
    priceAlertQueue.close(),
  ]);
  
  // Close health server
  healthServer.close(() => {
    apiLogger.info('[Main Worker] 👋 Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  apiLogger.info('[Main Worker] 🛑 Received SIGINT, shutting down gracefully...');
  
  // Cleanup scraper-specific services
  await cleanupWorkerSync();
  
  // Close queues
  await Promise.all([
    scraperQueue.close(),
    priceAlertQueue.close(),
  ]);
  
  // Close health server
  healthServer.close(() => {
    apiLogger.info('[Main Worker] 👋 Server closed');
    process.exit(0);
  });
});

// Start the unified worker
startWorker();
