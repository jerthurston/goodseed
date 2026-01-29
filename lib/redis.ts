/**
 * Redis Client Configuration
 * 
 * Supports both ioredis (for Bull queue) and Upstash Redis SDK
 * Environment variables:
 * - REDIS_URL: Full connection string (rediss://...)
 * - Or individual: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
 */

import { Redis as UpstashRedis } from '@upstash/redis';
import IORedis from 'ioredis';
import { apiLogger } from './helpers/api-logger';

// Parse Redis configuration from environment variables
function getRedisConfig() {
  let host = process.env.REDIS_HOST || 'localhost';
  let port = parseInt(process.env.REDIS_PORT || '6379');
  let password = process.env.REDIS_PASSWORD || undefined;
  let tls = false;

  // Parse REDIS_URL if provided (format: rediss://default:password@host:port)
  if (process.env.REDIS_URL && !process.env.REDIS_HOST) {
    try {
      const redisUrl = new URL(process.env.REDIS_URL);
      host = redisUrl.hostname;
      port = parseInt(redisUrl.port || '6379');
      password = redisUrl.password || undefined;
      tls = redisUrl.protocol === 'rediss:'; // TLS enabled for 'rediss://'
    } catch (err) {
      console.error('Failed to parse REDIS_URL:', err);
    }
  }

  return { host, port, password, tls };
}

// Export Redis configuration for Bull queue and other uses
export const redisConfig = getRedisConfig();

/**
 * IORedis client for Bull queue
 * This is the traditional Redis client used by Bull
 */
export const ioredis = new IORedis({
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  ...(redisConfig.tls && {
    tls: {
      rejectUnauthorized: false, // Required for Upstash
    },
  }),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

/**
 * Upstash Redis client (serverless-friendly)
 * Uses REST API instead of TCP connection
 * Perfect for serverless environments like Vercel
 */
export const upstashRedis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new UpstashRedis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

// Log connection info (only in development)
if (process.env.NODE_ENV === 'development') {
  apiLogger.debug('[Redis] Configuration:', {
    host: redisConfig.host,
    port: redisConfig.port,
    tls: redisConfig.tls,
    hasPassword: !!redisConfig.password,
    hasUpstash: !!upstashRedis,
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  apiLogger.info('[Redis] Closing connections...');
  await ioredis.quit();
});

process.on('SIGINT', async () => {
  apiLogger.info('[Redis] Received SIGINT – closing connections gracefully...');
  await ioredis.quit();
});

export default ioredis;
