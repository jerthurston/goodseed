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
  // Always prefer REDIS_URL if available (Upstash/Vercel provides this)
  if (process.env.REDIS_URL) {
    try {
      const redisUrl = new URL(process.env.REDIS_URL);
      const config = {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port || '6379', 10),
        password: redisUrl.password || undefined,
        tls: redisUrl.protocol === 'rediss:', // TLS enabled for 'rediss://'
      };

      apiLogger.info('[Redis] ✅ Parsed config from REDIS_URL', {
        host: config.host,
        port: config.port,
        tls: config.tls,
        protocol: redisUrl.protocol,
      });
      return config;
    } catch (err) {
      apiLogger.logError('[Redis]', err instanceof Error ? err : new Error('Failed to parse REDIS_URL'));
    }
  }

  // Fallback to individual env vars (for local Docker setup)
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true',
  };

  apiLogger.info('[Redis] Using individual env vars (fallback)', {
    host: config.host,
    port: config.port,
    tls: config.tls,
  });
  return config;
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

// Log connection info
apiLogger.info('[Redis] Configuration:', {
  host: redisConfig.host,
  port: redisConfig.port,
  tls: redisConfig.tls,
  hasPassword: !!redisConfig.password,
  hasUpstash: !!upstashRedis,
});

// Test connection on startup
ioredis.ping()
  .then(() => apiLogger.info('[Redis] ✅ IORedis connection successful'))
  .catch((err) => apiLogger.logError('[Redis] ❌ IORedis connection failed', err));

if (upstashRedis) {
  upstashRedis.ping()
    .then(() => apiLogger.info('[Redis] ✅ Upstash REST API connection successful'))
    .catch((err) => apiLogger.logError('[Redis] ❌ Upstash REST API connection failed', err));
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
