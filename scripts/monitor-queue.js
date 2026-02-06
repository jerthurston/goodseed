#!/usr/bin/env node
/**
 * Monitor Redis Queue in Real-time
 * 
 * Usage: node scripts/monitor-queue.js
 */

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'rediss://default:ARRqAAImcDI3MDdmMzFkZjBiYTk0NzQxYjNiYzk2MDA4NTk2OWVkZHAyNTIyNg@gentle-snipe-5226.upstash.io:6379';

const redis = new Redis(REDIS_URL);

console.log('🔍 Monitoring Redis queues...');
console.log('Press Ctrl+C to stop\n');

async function checkQueues() {
  try {
    // Check scraper queue
    const scraperWait = await redis.llen('bull:scraper-queue:wait');
    const scraperActive = await redis.llen('bull:scraper-queue:active');
    const scraperFailed = await redis.llen('bull:scraper-queue:failed');
    const scraperCompleted = await redis.llen('bull:scraper-queue:completed');
    
    // Check detect price changes queue
    const detectWait = await redis.llen('bull:detect-price-changes:wait');
    const detectActive = await redis.llen('bull:detect-price-changes:active');
    
    // Check send price alert queue
    const alertWait = await redis.llen('bull:send-price-alert:wait');
    const alertActive = await redis.llen('bull:send-price-alert:active');
    
    const timestamp = new Date().toISOString();
    console.clear();
    console.log('🔍 Redis Queue Monitor');
    console.log('='.repeat(60));
    console.log(`⏰ ${timestamp}\n`);
    
    console.log('📦 SCRAPER QUEUE:');
    console.log(`   Wait: ${scraperWait} | Active: ${scraperActive} | Failed: ${scraperFailed} | Completed: ${scraperCompleted}`);
    
    console.log('\n🔎 DETECT PRICE CHANGES QUEUE:');
    console.log(`   Wait: ${detectWait} | Active: ${detectActive}`);
    
    console.log('\n📧 SEND PRICE ALERT QUEUE:');
    console.log(`   Wait: ${alertWait} | Active: ${alertActive}`);
    
    if (scraperWait > 0 || scraperActive > 0) {
      console.log('\n✅ Jobs detected in scraper queue!');
    }
    
    if (detectWait > 0 || detectActive > 0) {
      console.log('✅ Jobs detected in detect price changes queue!');
    }
    
    if (alertWait > 0 || alertActive > 0) {
      console.log('✅ Jobs detected in send price alert queue!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Check every 2 seconds
setInterval(checkQueues, 2000);

// Initial check
checkQueues();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping monitor...');
  redis.quit();
  process.exit(0);
});
